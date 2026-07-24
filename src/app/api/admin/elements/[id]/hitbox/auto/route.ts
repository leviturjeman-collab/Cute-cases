import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { recipeHitbox } from '@/lib/silhouettes';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/elements/[id]/hitbox/auto (SS13.5): regenera la hitbox
 * desde la silueta de la receta (SS11.6).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const element = await prisma.element.findUnique({ where: { id: params.id } });
    if (!element) return apiError('NOT_FOUND', 'Elemento no encontrado');
    if (!element.recipe) return apiError('VALIDATION', 'El elemento no tiene receta procedural');
    const hitbox = recipeHitbox(element.recipe, element.anchoMm, element.altoMm);
    const updated = await prisma.element.update({
      where: { id: params.id },
      data: { hitbox: hitbox as unknown as object },
    });
    await audit(admin.id, 'update', 'Element(hitbox)', params.id);
    return NextResponse.json({ hitbox: updated.hitbox });
  } catch (e) {
    return handleApiError(e);
  }
}
