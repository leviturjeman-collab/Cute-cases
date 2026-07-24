import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { apiError, handleApiError } from '@/server/errors';
import { compatibleDeviceIdsForPreset, type PresetData } from '@/server/presetService';

export const dynamic = 'force-dynamic';

/** GET /api/presets/[slug] (SS13.4): con modelos compatibles calculados. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const preset = await prisma.presetDesign.findUnique({ where: { slug: params.slug } });
    if (!preset || !preset.publicado) return apiError('NOT_FOUND', 'Diseno no encontrado');

    const data = preset.designData as PresetData;
    const compatibleIds = await compatibleDeviceIdsForPreset(preset.id);
    const devices = await prisma.deviceModel.findMany({
      where: { id: { in: compatibleIds } },
      orderBy: [{ generacion: 'desc' }, { nombre: 'asc' }],
    });

    const caseBase = data.caseSlug
      ? await prisma.caseBase.findUnique({
          where: { slug: data.caseSlug },
          include: { variantes: true },
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
          }
        : null,
      compatibles: devices.map((d) => ({
        id: d.id,
        slug: d.slug,
        nombre: d.nombre,
        generacion: d.generacion,
        anchoMm: d.anchoMm,
        altoMm: d.altoMm,
        radioEsquinaMm: d.radioEsquinaMm,
        grosorMm: d.grosorMm,
        cameraZone: d.cameraZone,
        moduloForma: d.moduloForma,
      })),
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
    });
  } catch (e) {
    return handleApiError(e);
  }
}
