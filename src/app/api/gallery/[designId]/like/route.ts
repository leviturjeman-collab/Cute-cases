import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { apiError, handleApiError } from '@/server/errors';
import { WRITE_LIMIT, rateLimit } from '@/server/rateLimit';

export const dynamic = 'force-dynamic';

/** POST — like (un like por usuario y diseño, §9). */
export async function POST(_req: Request, { params }: { params: { designId: string } }) {
  try {
    const user = await requireUser();
    rateLimit(`like:${user.id}`, WRITE_LIMIT.max, WRITE_LIMIT.windowMs);
    const design = await prisma.design.findUnique({ where: { id: params.designId } });
    if (!design || !design.publicadoGaleria) return apiError('NOT_FOUND', 'Diseño no publicado');

    await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { userId_designId: { userId: user.id, designId: params.designId } },
      });
      if (existing) return;
      await tx.like.create({ data: { userId: user.id, designId: params.designId } });
      await tx.design.update({
        where: { id: params.designId },
        data: { likesCount: { increment: 1 } },
      });
    });
    const updated = await prisma.design.findUnique({ where: { id: params.designId } });
    return NextResponse.json({ likesCount: updated?.likesCount ?? 0, liked: true });
  } catch (e) {
    return handleApiError(e);
  }
}

/** DELETE — quitar like (§9). */
export async function DELETE(_req: Request, { params }: { params: { designId: string } }) {
  try {
    const user = await requireUser();
    await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { userId_designId: { userId: user.id, designId: params.designId } },
      });
      if (!existing) return;
      await tx.like.delete({
        where: { userId_designId: { userId: user.id, designId: params.designId } },
      });
      await tx.design.update({
        where: { id: params.designId },
        data: { likesCount: { decrement: 1 } },
      });
    });
    const updated = await prisma.design.findUnique({ where: { id: params.designId } });
    return NextResponse.json({ likesCount: updated?.likesCount ?? 0, liked: false });
  } catch (e) {
    return handleApiError(e);
  }
}
