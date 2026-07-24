import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { presetSchema } from '@/server/adminSchemas';
import { validateAndPriceDesign } from '@/server/designService';
import { compatibleDeviceIdsForPreset, invalidatePresetCache } from '@/server/presetService';
import type { PlacedItem } from '@/lib/collision';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const presets = await prisma.presetDesign.findMany({ orderBy: { orden: 'asc' } });
    return NextResponse.json({ presets });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST (SS17): crear preset con las MISMAS validaciones que un diseno de
 * usuario; al publicar se valida por cada modelo compatible (SS26.25).
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = presetSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', parsed.error.message);

    const caseBase = await prisma.caseBase.findUnique({
      where: { slug: parsed.data.designData.caseSlug },
      include: { compat: true },
    });
    if (!caseBase || caseBase.compat.length === 0) {
      return apiError('VALIDATION', 'Funda del preset inexistente o sin compatibilidades');
    }
    const items: PlacedItem[] = parsed.data.designData.elementos.map((e, i) => ({
      instanceId: e.instanceId ?? `preset-${i}`,
      elementId: e.elementId,
      xMm: e.xMm,
      yMm: e.yMm,
      rotationDeg: e.rotationDeg,
      letterChar: e.letterChar ?? undefined,
    }));
    await validateAndPriceDesign({
      deviceId: caseBase.compat[0]!.deviceId,
      caseVariantId: parsed.data.designData.caseVariantId,
      elementos: items,
    });

    const preset = await prisma.presetDesign.create({
      data: {
        slug: parsed.data.slug,
        nombre: parsed.data.nombre,
        precioCentimos: parsed.data.precioCentimos,
        designData: parsed.data.designData as unknown as object,
        fotos: parsed.data.fotos,
        publicado: parsed.data.publicado,
        orden: parsed.data.orden,
      },
    });
    invalidatePresetCache(preset.id);
    if (parsed.data.publicado) {
      // Validacion por modelo (los incompatibles simplemente no se ofrecen)
      await compatibleDeviceIdsForPreset(preset.id);
    }
    await audit(admin.id, 'create', 'PresetDesign', preset.id, { slug: preset.slug });
    return NextResponse.json(preset, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}

const reorderSchema = z.object({ ids: z.array(z.string()).min(1) });

/** PATCH: orden del carrusel (SS17). */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = reorderSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', 'ids requeridos');
    await prisma.$transaction(
      parsed.data.ids.map((id, orden) => prisma.presetDesign.update({ where: { id }, data: { orden } })),
    );
    await audit(admin.id, 'update', 'PresetDesign', 'orden-carrusel', { ids: parsed.data.ids });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
