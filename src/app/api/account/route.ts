import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { apiError, handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET /api/account — datos de la cuenta (§7.4). */
export async function GET() {
  try {
    const user = await requireUser();
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { device: { select: { id: true, nombre: true } } },
    });
    if (!dbUser) return apiError('NOT_FOUND', 'Usuario no encontrado');
    return NextResponse.json({
      email: dbUser.email,
      nombre: dbUser.nombre,
      provider: dbUser.provider,
      device: dbUser.device,
      emailVerificado: dbUser.emailVerificado,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

const accountUpdateSchema = z.object({
  nombre: z.string().trim().max(60).nullable().optional(),
  deviceId: z.string().nullable().optional(),
});

/** PATCH /api/account — nombre y "mi iPhone" recordado (§7.4). */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = accountUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', 'Datos inválidos');
    if (parsed.data.deviceId) {
      const device = await prisma.deviceModel.findUnique({ where: { id: parsed.data.deviceId } });
      if (!device || !device.activo) return apiError('S-03', 'Dispositivo inválido');
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(parsed.data.nombre !== undefined ? { nombre: parsed.data.nombre } : {}),
        ...(parsed.data.deviceId !== undefined ? { deviceId: parsed.data.deviceId } : {}),
      },
    });
    return NextResponse.json({ ok: true, nombre: updated.nombre, deviceId: updated.deviceId });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/account — eliminación completa self-service (§7.4, §13,
 * caso §18.17): borra diseños y likes (cascade); los publicados desaparecen
 * de la galería; los enlaces /d/* mueren.
 */
export async function DELETE() {
  try {
    const user = await requireUser();
    await prisma.cartItem.deleteMany({ where: { ownerKey: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
