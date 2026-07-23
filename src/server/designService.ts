import { prisma } from './db';
import { ApiException } from './errors';
import {
  type CaseGeometry,
  type ElementInstance,
  type ElementShape,
  type Polygon,
  validateDesign,
} from '@/lib/collision';
import { computeTotalCentimos, type PricedElement } from '@/lib/pricing';

/**
 * Validación en servidor — defensa en profundidad (§12.5).
 * Al guardar un diseño o añadirlo a la cesta, el servidor SIEMPRE:
 *  1. Verifica existencia y estado activo/no caducado de funda, variante y elementos.
 *  2. Reejecuta el módulo de colisiones completo (mismo código TS que el cliente).
 *  3. Recalcula el precio desde BD e ignora cualquier precio del cliente.
 *  4. Verifica ownership en toda mutación.
 */

export interface ValidatedDesign {
  deviceId: string;
  caseVariantId: string;
  elementos: ElementInstance[];
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

export async function getCollisionMarginMm(): Promise<number> {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'collisionMarginMm' } });
  const v = setting?.value;
  return typeof v === 'number' && v >= 0 ? v : 0.5;
}

export async function validateAndPriceDesign(input: {
  deviceId: string;
  caseVariantId: string;
  elementos: ElementInstance[];
}): Promise<ValidatedDesign> {
  const now = new Date();

  // 1a. Dispositivo activo
  const device = await prisma.deviceModel.findUnique({ where: { id: input.deviceId } });
  if (!device || !device.activo) {
    throw new ApiException('S-01', 'Modelo de dispositivo inexistente o inactivo');
  }

  // 1b. Variante disponible, funda activa y COMPATIBLE con el dispositivo (§5.4)
  const variant = await prisma.caseVariant.findUnique({
    where: { id: input.caseVariantId },
    include: { caseBase: { include: { compat: true } } },
  });
  if (!variant || !variant.disponible || !variant.caseBase.activo) {
    throw new ApiException('S-01', 'Variante de funda inexistente, agotada o inactiva');
  }
  if (!variant.caseBase.compat.some((c) => c.deviceId === device.id)) {
    throw new ApiException('S-01', 'La funda no es compatible con el dispositivo');
  }

  // 1c. Elementos activos y no caducados a fecha de hoy (§4.5)
  const elementIds = [...new Set(input.elementos.map((e) => e.elementId))];
  const elements = await prisma.element.findMany({
    where: { id: { in: elementIds } },
    include: { season: true },
  });
  const byId = new Map(elements.map((e) => [e.id, e]));
  for (const inst of input.elementos) {
    const el = byId.get(inst.elementId);
    if (!el || !el.activo) {
      throw new ApiException('S-01', `Elemento inexistente o inactivo: ${inst.elementId}`);
    }
    if (el.season && (el.season.fechaInicio > now || el.season.fechaFin < now || !el.season.activo)) {
      throw new ApiException('S-01', `Elemento de temporada caducado: ${el.nombre}`);
    }
    if (el.letraChar && inst.letraChar && el.letraChar !== inst.letraChar) {
      throw new ApiException('S-01', 'letraChar no coincide con el elemento');
    }
  }

  // 2. Reejecutar colisiones (mismo módulo TS que el cliente, §6.6)
  const shapes = new Map<string, ElementShape>(
    elements.map((e) => [
      e.id,
      { hitbox: parsePolygon(e.hitbox), anchoMm: e.anchoMm, altoMm: e.altoMm },
    ]),
  );
  const geometry: CaseGeometry = {
    anchoMm: device.anchoMm,
    altoMm: device.altoMm,
    radioEsquinaMm: device.radioEsquinaMm,
    cameraZone: parsePolygon(device.cameraZone),
  };
  const margin = await getCollisionMarginMm();
  const invalid = validateDesign(input.elementos, shapes, geometry, margin);
  if (invalid.size > 0) {
    throw new ApiException('S-02', `Colisiones detectadas en ${invalid.size} elemento(s)`);
  }

  // 3. Recalcular el precio desde BD (ignora el precio del cliente)
  const priced = new Map<string, PricedElement>(
    elements.map((e) => [e.id, { precioCentimos: e.precioCentimos, nombre: e.nombre }]),
  );
  const precioTotalCentimos = computeTotalCentimos(
    variant.precioCentimos,
    input.elementos,
    priced,
  );

  return {
    deviceId: device.id,
    caseVariantId: variant.id,
    elementos: input.elementos,
    precioTotalCentimos,
  };
}

/** 4. Ownership: el diseño debe pertenecer al usuario (§12.5). */
export async function requireDesignOwner(designId: string, userId: string) {
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design) throw new ApiException('NOT_FOUND', 'Diseño no encontrado');
  if (design.userId !== userId) throw new ApiException('S-04', 'No eres el dueño de este diseño');
  return design;
}

/**
 * Estado de disponibilidad de un diseño guardado (§4.5, §8.2): elementos
 * caducados/desactivados o variante agotada → no comprable hasta resolver.
 */
export async function getDesignAvailability(design: {
  caseVariantId: string;
  elementos: unknown;
}): Promise<{ disponible: boolean; caducadosIds: string[] }> {
  const now = new Date();
  const instances = Array.isArray(design.elementos)
    ? (design.elementos as ElementInstance[])
    : [];
  const ids = [...new Set(instances.map((e) => e.elementId))];
  const elements = await prisma.element.findMany({
    where: { id: { in: ids } },
    include: { season: true },
  });
  const byId = new Map(elements.map((e) => [e.id, e]));
  const caducadosIds: string[] = [];
  for (const id of ids) {
    const el = byId.get(id);
    const expired =
      !el ||
      !el.activo ||
      (el.season && (el.season.fechaInicio > now || el.season.fechaFin < now || !el.season.activo));
    if (expired) caducadosIds.push(id);
  }
  const variant = await prisma.caseVariant.findUnique({
    where: { id: design.caseVariantId },
    include: { caseBase: true },
  });
  const variantOk = Boolean(variant?.disponible && variant.caseBase.activo);
  return { disponible: variantOk && caducadosIds.length === 0, caducadosIds };
}
