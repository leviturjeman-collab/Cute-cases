import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { apiError, handleApiError } from '@/server/errors';
import { getDesignAvailability } from '@/server/designService';
import { computeBreakdown, type PricedElement } from '@/lib/pricing';
import type { ElementInstance } from '@/lib/collision';

export const dynamic = 'force-dynamic';

/**
 * GET /api/d/[shareToken] — diseño público para la página regalo (§8.2):
 * datos mínimos para render + precio desglosado + disponibilidad.
 */
export async function GET(_req: Request, { params }: { params: { shareToken: string } }) {
  try {
    const design = await prisma.design.findUnique({
      where: { shareToken: params.shareToken },
      include: {
        device: true,
        caseVariant: { include: { caseBase: true } },
      },
    });
    if (!design) return apiError('NOT_FOUND', 'Diseño no encontrado');

    const availability = await getDesignAvailability(design);
    const instances = (design.elementos as unknown as ElementInstance[]) ?? [];
    const elementIds = [...new Set(instances.map((i) => i.elementId))];
    const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });
    const priced = new Map<string, PricedElement>(
      elements.map((e) => [e.id, { precioCentimos: e.precioCentimos, nombre: e.nombre }]),
    );
    // Desglose tolerante: los caducados no aparecen en priced y se omiten
    const desglose = computeBreakdown(
      `${design.caseVariant.caseBase.nombre} · ${design.caseVariant.colorNombre}`,
      design.caseVariant.precioCentimos,
      instances.filter((i) => priced.has(i.elementId)),
      priced,
    );

    return NextResponse.json({
      id: design.id,
      nombre: design.nombre,
      shareNombre: design.shareNombre,
      thumbnailUrl: design.thumbnailUrl,
      device: {
        id: design.device.id,
        nombre: design.device.nombre,
        anchoMm: design.device.anchoMm,
        altoMm: design.device.altoMm,
        radioEsquinaMm: design.device.radioEsquinaMm,
        cameraZone: design.device.cameraZone,
      },
      caseVariant: {
        id: design.caseVariant.id,
        colorNombre: design.caseVariant.colorNombre,
        colorHex: design.caseVariant.colorHex,
        material: design.caseVariant.caseBase.material,
        nombre: design.caseVariant.caseBase.nombre,
      },
      elementos: instances,
      elementosCatalogo: elements.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo,
        anchoMm: e.anchoMm,
        altoMm: e.altoMm,
        profundidadMm: e.profundidadMm,
        assetUrl: e.assetUrl,
        letraChar: e.letraChar,
      })),
      desglose,
      disponible: availability.disponible,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
