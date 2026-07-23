import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { presetSchema } from '@/server/adminSchemas';
import { validateAndPriceDesign } from '@/server/designService';
import type { ElementInstance } from '@/lib/collision';

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
 * POST — crear preestablecido con el editor interno; MISMAS validaciones que
 * un diseño de usuario (§11), pero con precio CERRADO manual (§4.6).
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = presetSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', parsed.error.message);

    // Validación de colisiones idéntica al editor de usuario, contra el primer
    // dispositivo compatible de la funda del preset.
    const caseBase = await prisma.caseBase.findUnique({
      where: { slug: parsed.data.designData.caseSlug },
      include: { compat: true },
    });
    if (!caseBase || caseBase.compat.length === 0) {
      return apiError('S-03', 'Funda del preset inexistente o sin compatibilidades');
    }
    const instances: ElementInstance[] = parsed.data.designData.elementos.map((e, i) => ({
      instanceId: `preset-${i}`,
      ...e,
    }));
    await validateAndPriceDesign({
      deviceId: caseBase.compat[0]!.deviceId,
      caseVariantId: parsed.data.designData.caseVariantId,
      elementos: instances,
    });

    const preset = await prisma.presetDesign.create({ data: parsed.data });
    await audit(admin.id, 'crear', 'PresetDesign', preset.id);
    return NextResponse.json(preset, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}

const reorderSchema = z.object({ ids: z.array(z.string()).min(1) });

/** PATCH — orden del carrusel de home (drag & drop, §11). */
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = reorderSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', 'ids requeridos');
    await prisma.$transaction(
      parsed.data.ids.map((id, orden) =>
        prisma.presetDesign.update({ where: { id }, data: { orden } }),
      ),
    );
    await audit(admin.id, 'actualizar', 'PresetDesign', 'orden-carrusel');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
