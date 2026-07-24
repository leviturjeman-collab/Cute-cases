import { prisma } from './db';
import { ApiException } from './errors';
import {
  validarEscena,
  type DeviceSpec,
  type ElementShape,
  type Hitbox,
  type PlacedItem,
  type Polygon,
} from '@/lib/collision';
import { computeTotalCentimos, type PricedElement } from '@/lib/pricing';

/**
 * Pipeline de validacion de un diseno (SS14.1, D9):
 *  1. Esquema (en las rutas, Zod).
 *  2. Entidades: dispositivo activo; variante disponible de funda activa y
 *     compatible; elementos activos con temporada vigente.
 *  3. Geometria: validarEscena sobre hitboxes reales.
 *  4. Precio: recalculo integro desde BD (el del cliente se ignora).
 *  5. Propiedad: userId de sesion = dueno.
 *  6. Persistencia transaccional (en las rutas).
 */

export interface ValidatedDesign {
  deviceId: string;
  caseVariantId: string;
  elementos: PlacedItem[];
  precioTotalCentimos: number;
}

function parsePolygon(json: unknown): Polygon {
  if (!Array.isArray(json)) return [];
  return json
    .filter(
      (p): p is { x: number; y: number } =>
        typeof p === 'object' && p !== null && typeof (p as { x?: unknown }).x === 'number',
    )
    .map((p) => ({ x: p.x, y: p.y }));
}

export function parseHitbox(json: unknown): Hitbox {
  if (!Array.isArray(json)) return [];
  if (json.length > 0 && Array.isArray(json[0])) {
    return (json as unknown[][]).map((poly) => parsePolygon(poly));
  }
  const single = parsePolygon(json);
  return single.length >= 3 ? [single] : [];
}

export async function getCollisionMarginMm(): Promise<number> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return settings?.collisionMarginMm ?? 0.5;
}

export async function validateAndPriceDesign(input: {
  deviceId: string;
  caseVariantId: string;
  elementos: PlacedItem[];
}): Promise<ValidatedDesign> {
  const now = new Date();

  const device = await prisma.deviceModel.findUnique({ where: { id: input.deviceId } });
  if (!device || !device.activo) {
    throw new ApiException('DESIGN_INVALID_ENTITY', 'Dispositivo inexistente o inactivo');
  }

  const variant = await prisma.caseVariant.findUnique({
    where: { id: input.caseVariantId },
    include: { caseBase: { include: { compat: true } } },
  });
  if (!variant || !variant.disponible || !variant.caseBase.activo) {
    throw new ApiException('DESIGN_INVALID_ENTITY', 'Variante inexistente, agotada o inactiva');
  }
  if (!variant.caseBase.compat.some((c) => c.deviceId === device.id)) {
    throw new ApiException('DESIGN_INVALID_ENTITY', 'Funda no compatible con el dispositivo');
  }

  const elementIds = [...new Set(input.elementos.map((e) => e.elementId))];
  const elements = await prisma.element.findMany({
    where: { id: { in: elementIds } },
    include: { season: true },
  });
  const byId = new Map(elements.map((e) => [e.id, e]));
  for (const item of input.elementos) {
    const el = byId.get(item.elementId);
    if (!el || !el.activo) {
      throw new ApiException('DESIGN_INVALID_ENTITY', `Elemento inexistente o inactivo: ${item.elementId}`);
    }
    if (el.season && (!el.season.activo || el.season.fechaInicio > now || el.season.fechaFin < now)) {
      throw new ApiException('DESIGN_INVALID_ENTITY', `Elemento de temporada caducado: ${el.slug}`);
    }
    if (el.letraChar && item.letterChar && el.letraChar !== item.letterChar) {
      throw new ApiException('DESIGN_INVALID_ENTITY', 'letterChar no coincide con el elemento');
    }
  }

  const shapes = new Map<string, ElementShape>(
    elements.map((e) => [e.id, { hitbox: parseHitbox(e.hitbox), anchoMm: e.anchoMm, altoMm: e.altoMm }]),
  );
  const spec: DeviceSpec = {
    anchoMm: device.anchoMm,
    altoMm: device.altoMm,
    radioEsquinaMm: device.radioEsquinaMm,
    cameraZone: parsePolygon(device.cameraZone),
  };
  const margin = await getCollisionMarginMm();
  const results = validarEscena(input.elementos, shapes, spec, margin);
  for (const [instanceId, r] of results) {
    if (r.valida) continue;
    const code =
      r.motivo === 'SOBRE_CAMARA'
        ? 'DESIGN_ON_CAMERA'
        : r.motivo === 'FUERA_DE_FUNDA'
          ? 'DESIGN_OUT_OF_BOUNDS'
          : 'DESIGN_COLLISION';
    throw new ApiException(code, `Pose invalida (${r.motivo})`, {
      instanceRefs: [instanceId, ...(r.refs ?? [])],
      motivo: r.motivo,
    });
  }

  const priced = new Map<string, PricedElement>(
    elements.map((e) => [e.id, { precioCentimos: e.precioCentimos, nombre: e.nombre }]),
  );
  const precioTotalCentimos = computeTotalCentimos(variant.precioCentimos, input.elementos, priced);

  return {
    deviceId: device.id,
    caseVariantId: variant.id,
    elementos: input.elementos,
    precioTotalCentimos,
  };
}

/** Paso 5: propiedad del recurso. */
export async function requireDesignOwner(designId: string, userId: string) {
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design) throw new ApiException('NOT_FOUND', 'Diseno no encontrado');
  if (design.userId !== userId) throw new ApiException('FORBIDDEN', 'No eres el dueno de este diseno');
  return design;
}

/**
 * Disponibilidad de un diseno guardado (SS7.8, SS6.8): entidades caducadas o
 * desactivadas, o variante agotada -> no comprable.
 */
export async function getDesignAvailability(design: {
  caseVariantId: string;
  elementos: unknown;
}): Promise<{ disponible: boolean; caducadosElementIds: string[]; expiredCount: number }> {
  const now = new Date();
  const items = Array.isArray(design.elementos) ? (design.elementos as PlacedItem[]) : [];
  const ids = [...new Set(items.map((e) => e.elementId))];
  const elements = await prisma.element.findMany({
    where: { id: { in: ids } },
    include: { season: true },
  });
  const byId = new Map(elements.map((e) => [e.id, e]));
  const caducadosElementIds: string[] = [];
  for (const id of ids) {
    const el = byId.get(id);
    const expired =
      !el ||
      !el.activo ||
      (el.season && (!el.season.activo || el.season.fechaInicio > now || el.season.fechaFin < now));
    if (expired) caducadosElementIds.push(id);
  }
  const variant = await prisma.caseVariant.findUnique({
    where: { id: design.caseVariantId },
    include: { caseBase: true },
  });
  const variantOk = Boolean(variant?.disponible && variant.caseBase.activo);
  const expiredCount = items.filter((i) => caducadosElementIds.includes(i.elementId)).length;
  return { disponible: variantOk && caducadosElementIds.length === 0, caducadosElementIds, expiredCount };
}

/** Precio recalculado en lectura (SS16.4): variante + elementos vigentes. */
export async function recomputeDesignPrice(design: {
  caseVariantId: string;
  elementos: unknown;
}): Promise<number | null> {
  const items = Array.isArray(design.elementos) ? (design.elementos as PlacedItem[]) : [];
  const variant = await prisma.caseVariant.findUnique({ where: { id: design.caseVariantId } });
  if (!variant) return null;
  const ids = [...new Set(items.map((e) => e.elementId))];
  const elements = await prisma.element.findMany({ where: { id: { in: ids } } });
  const priced = new Map<string, PricedElement>(
    elements.map((e) => [e.id, { precioCentimos: e.precioCentimos, nombre: e.nombre }]),
  );
  try {
    return computeTotalCentimos(variant.precioCentimos, items, priced);
  } catch {
    return null;
  }
}
