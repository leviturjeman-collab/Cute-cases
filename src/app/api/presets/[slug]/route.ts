import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { apiError, handleApiError } from '@/server/errors';
import type { ElementInstance } from '@/lib/collision';

export const dynamic = 'force-dynamic';

/** GET /api/presets/[slug] — ficha de preestablecido con datos de render (§5.6). */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const preset = await prisma.presetDesign.findUnique({ where: { slug: params.slug } });
    if (!preset || !preset.publicado) return apiError('NOT_FOUND', 'Diseño no encontrado');

    const data = preset.designData as {
      caseSlug?: string;
      caseVariantId?: string;
      elementos?: ElementInstance[];
    };
    const caseBase = data.caseSlug
      ? await prisma.caseBase.findUnique({
          where: { slug: data.caseSlug },
          include: {
            variantes: true,
            compat: { include: { device: true } },
          },
        })
      : null;

    const elementIds = [...new Set((data.elementos ?? []).map((e) => e.elementId))];
    const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });

    return NextResponse.json({
      id: preset.id,
      slug: preset.slug,
      nombre: preset.nombre,
      precioCentimos: preset.precioCentimos,
      fotos: preset.fotos,
      elementos: data.elementos ?? [],
      caseVariantId: data.caseVariantId ?? null,
      caseBase: caseBase
        ? {
            nombre: caseBase.nombre,
            material: caseBase.material,
            variantes: caseBase.variantes.filter((v) => v.disponible),
            compatibles: caseBase.compat
              .filter((c) => c.device.activo)
              .map((c) => ({
                id: c.device.id,
                nombre: c.device.nombre,
                anchoMm: c.device.anchoMm,
                altoMm: c.device.altoMm,
                radioEsquinaMm: c.device.radioEsquinaMm,
                cameraZone: c.device.cameraZone,
              })),
          }
        : null,
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
    });
  } catch (e) {
    return handleApiError(e);
  }
}
