import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET — diseños de un usuario (soporte, §11). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, nombre: true, activo: true },
    });
    if (!user) return apiError('NOT_FOUND', 'Usuario no encontrado');
    const designs = await prisma.design.findMany({
      where: { userId: params.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        nombre: true,
        thumbnailUrl: true,
        precioTotalCache: true,
        publicadoGaleria: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ user, designs });
  } catch (e) {
    return handleApiError(e);
  }
}

const userUpdateSchema = z.object({ activo: z.boolean() });

/** PATCH — desactivar/reactivar cuenta (§11). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const parsed = userUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', 'Payload inválido');
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { activo: parsed.data.activo },
    });
    await audit(admin.id, 'update', 'User', user.id);
    return NextResponse.json({ ok: true, activo: user.activo });
  } catch (e) {
    return handleApiError(e);
  }
}
