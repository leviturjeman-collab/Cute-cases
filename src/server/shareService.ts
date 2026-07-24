import { prisma } from '@/server/db';
import { getDesignAvailability, recomputeDesignPrice } from '@/server/designService';
import { computeBreakdown, type PriceBreakdown, type PricedElement } from '@/lib/pricing';
import type { PlacedItem } from '@/lib/collision';

export interface SharedDesignPayload {
  id: string;
  nombre: string;
  shareNombre: string | null;
  thumbnailUrl: string | null;
  device: {
    id: string;
    slug: string;
    nombre: string;
    anchoMm: number;
    altoMm: number;
    radioEsquinaMm: number;
    grosorMm: number;
    cameraZone: unknown;
    moduloForma: string;
  };
  caseVariant: {
    id: string;
    colorNombre: string;
    colorHex: string;
    material: string;
    nombre: string;
  };
  elementos: PlacedItem[];
  elementosCatalogo: {
    id: string;
    slug: string;
    nombre: string;
    tipo: string;
    categoria: string;
    precioCentimos: number;
    anchoMm: number;
    altoMm: number;
    profundidadMm: number | null;
    recipe: string | null;
    recipeParams: unknown;
    assetUrl: string | null;
    hitbox: unknown;
    acabado: string;
    colores: unknown;
    letraChar: string | null;
    esNuevo: boolean;
  }[];
  desglose: PriceBreakdown;
  precioCentimos: number;
  disponible: boolean;
}

/**
 * Lectura publica de un diseno compartido (SS13.2, SS6.8): precio recalculado
 * y disponible=false si algo caduco/desactivado o el autor elimino la cuenta.
 */
export async function getSharedDesignPayload(
  shareToken: string,
): Promise<SharedDesignPayload | null> {
  const design = await prisma.design.findUnique({
    where: { shareToken },
    include: {
      device: true,
      caseVariant: { include: { caseBase: true } },
    },
  });
  if (!design) return null;

  const availability = await getDesignAvailability(design);
  const disponible = availability.disponible && design.userId !== null;
  const items = (design.elementos as unknown as PlacedItem[]) ?? [];
  const elementIds = [...new Set(items.map((i) => i.elementId))];
  const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });
  const priced = new Map<string, PricedElement>(
    elements.map((e) => [e.id, { precioCentimos: e.precioCentimos, nombre: e.nombre }]),
  );
  const desglose = computeBreakdown(
    `${design.caseVariant.caseBase.nombre} ${design.caseVariant.colorNombre}`,
    design.caseVariant.precioCentimos,
    items.filter((i) => priced.has(i.elementId)),
    priced,
  );
  const precio = (await recomputeDesignPrice(design)) ?? design.precioTotalCache;

  return {
    id: design.id,
    nombre: design.nombre,
    shareNombre: design.shareNombre,
    thumbnailUrl: design.thumbnailUrl,
    device: {
      id: design.device.id,
      slug: design.device.slug,
      nombre: design.device.nombre,
      anchoMm: design.device.anchoMm,
      altoMm: design.device.altoMm,
      radioEsquinaMm: design.device.radioEsquinaMm,
      grosorMm: design.device.grosorMm,
      cameraZone: design.device.cameraZone,
      moduloForma: design.device.moduloForma,
    },
    caseVariant: {
      id: design.caseVariant.id,
      colorNombre: design.caseVariant.colorNombre,
      colorHex: design.caseVariant.colorHex,
      material: design.caseVariant.caseBase.material,
      nombre: design.caseVariant.caseBase.nombre,
    },
    elementos: items,
    elementosCatalogo: elements.map((e) => ({
      id: e.id,
      slug: e.slug,
      nombre: e.nombre,
      tipo: e.tipo,
      categoria: e.categoria,
      precioCentimos: e.precioCentimos,
      anchoMm: e.anchoMm,
      altoMm: e.altoMm,
      profundidadMm: e.profundidadMm,
      recipe: e.recipe,
      recipeParams: e.recipeParams,
      assetUrl: e.assetUrl,
      hitbox: e.hitbox,
      acabado: e.acabado,
      colores: e.colores,
      letraChar: e.letraChar,
      esNuevo: e.esNuevo,
    })),
    desglose,
    precioCentimos: precio,
    disponible,
  };
}
