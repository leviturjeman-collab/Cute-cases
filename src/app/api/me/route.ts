import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { meUpdateSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET /api/me (SS13.4): perfil, deviceId, autorVisible por defecto. */
export async function GET() {
  try {
    const user = await requireUser();
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { likes: false },
    });
    if (!dbUser) return apiError('NOT_FOUND', 'Usuario no encontrado');
    const device = dbUser.deviceId
      ? await prisma.deviceModel.findUnique({
          where: { id: dbUser.deviceId },
          select: { id: true, nombre: true, slug: true },
        })
      : null;
    // autorVisible por defecto: el del ultimo diseno o true
    const lastDesign = await prisma.design.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { autorVisible: true },
    });
    return NextResponse.json({
      email: dbUser.email,
      nombre: dbUser.nombre,
      provider: dbUser.provider,
      emailVerificado: dbUser.emailVerificado,
      device,
      autorVisible: lastDesign?.autorVisible ?? true,
      favoritos: Array.isArray(dbUser.favoritos) ? dbUser.favoritos : [],
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/** PATCH /api/me: nombre, deviceId, autorVisible (aplica a los publicados). */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = meUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', 'Datos invalidos');
    if (parsed.data.deviceId) {
      const device = await prisma.deviceModel.findUnique({ where: { id: parsed.data.deviceId } });
      if (!device || !device.activo) return apiError('VALIDATION', 'Dispositivo invalido');
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(parsed.data.nombre !== undefined ? { nombre: parsed.data.nombre } : {}),
        ...(parsed.data.deviceId !== undefined ? { deviceId: parsed.data.deviceId } : {}),
        ...(parsed.data.favoritos !== undefined ? { favoritos: parsed.data.favoritos } : {}),
      },
    });
    if (parsed.data.autorVisible !== undefined) {
      await prisma.design.updateMany({
        where: { userId: user.id },
        data: { autorVisible: parsed.data.autorVisible },
      });
    }
    return NextResponse.json({ ok: true, nombre: updated.nombre, deviceId: updated.deviceId });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/me (SS6.7, T-23): eliminacion self-service completa; cascada
 * sobre disenos y likes; publicaciones retiradas; /d/* del usuario mueren.
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
