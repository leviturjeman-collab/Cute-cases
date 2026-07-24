import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { apiError, handleApiError } from '@/server/errors';
import { rateLimit } from '@/server/rateLimit';

export const dynamic = 'force-dynamic';

/** POST/DELETE like (SS13.3): idempotentes; likesCount transaccional. */
export async function POST(_req: Request, { params }: { params: { designId: string } }) {
  try {
    const user = await requireUser();
    rateLimit(`like:${user.id}`, 30, 60 * 1000);
    const design = await prisma.design.findUnique({ where: { id: params.designId } });
    if (!design || !design.publicadoGaleria) return apiError('NOT_FOUND', 'Diseno no publicado');

    const likesCount = await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { userId_designId: { userId: user.id, designId: params.designId } },
      });
      if (!existing) {
        await tx.like.create({ data: { userId: user.id, designId: params.designId } });
        const updated = await tx.design.update({
          where: { id: params.designId },
          data: { likesCount: { increment: 1 } },
        });
        return updated.likesCount;
      }
      return (await tx.design.findUniqueOrThrow({ where: { id: params.designId } })).likesCount;
    });
    return NextResponse.json({ likesCount, likedByMe: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { designId: string } }) {
  try {
    const user = await requireUser();
    const likesCount = await prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { userId_designId: { userId: user.id, designId: params.designId } },
      });
      if (existing) {
        await tx.like.delete({
          where: { userId_designId: { userId: user.id, designId: params.designId } },
        });
        const updated = await tx.design.update({
          where: { id: params.designId },
          data: { likesCount: { decrement: 1 } },
        });
        return updated.likesCount;
      }
      return (await tx.design.findUniqueOrThrow({ where: { id: params.designId } })).likesCount;
    });
    return NextResponse.json({ likesCount, likedByMe: false });
  } catch (e) {
    return handleApiError(e);
  }
}
