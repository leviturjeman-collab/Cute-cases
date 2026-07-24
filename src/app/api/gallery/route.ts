import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

const PAGE = 24;

/**
 * GET /api/gallery?sort=semana|recientes&cursor= (SS13.3): publicados y
 * disponibles; cada item con likedByMe.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const sort = req.nextUrl.searchParams.get('sort') ?? 'semana';
    const cursor = req.nextUrl.searchParams.get('cursor');

    if (sort === 'semana') {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const likeGroups = await prisma.like.groupBy({
        by: ['designId'],
        where: { createdAt: { gte: since }, design: { publicadoGaleria: true } },
        _count: { designId: true },
        orderBy: { _count: { designId: 'desc' } },
        take: 100,
      });
      const rank = new Map(likeGroups.map((l, i) => [l.designId, i]));
      const designs = await prisma.design.findMany({
        where: { publicadoGaleria: true },
        include: { user: { select: { nombre: true } } },
        orderBy: [{ likesCount: 'desc' }, { updatedAt: 'desc' }],
        take: 100,
      });
      designs.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
      const likedByMe = await likedSet(user?.id, designs.map((d) => d.id));
      return NextResponse.json({
        disenos: designs.slice(0, PAGE).map((d) => toCard(d, likedByMe)),
        nextCursor: null,
      });
    }

    const designs = await prisma.design.findMany({
      where: { publicadoGaleria: true },
      include: { user: { select: { nombre: true } } },
      orderBy: { updatedAt: 'desc' },
      take: PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = designs.length > PAGE;
    const page = hasMore ? designs.slice(0, PAGE) : designs;
    const likedByMe = await likedSet(user?.id, page.map((d) => d.id));
    return NextResponse.json({
      disenos: page.map((d) => toCard(d, likedByMe)),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

async function likedSet(userId: string | undefined, designIds: string[]): Promise<Set<string>> {
  if (!userId || designIds.length === 0) return new Set();
  const likes = await prisma.like.findMany({
    where: { userId, designId: { in: designIds } },
    select: { designId: true },
  });
  return new Set(likes.map((l) => l.designId));
}

function toCard(
  d: {
    id: string;
    nombre: string;
    thumbnailUrl: string | null;
    likesCount: number;
    autorVisible: boolean;
    shareToken: string;
    user: { nombre: string | null } | null;
  },
  likedByMe: Set<string>,
) {
  return {
    id: d.id,
    nombre: d.nombre,
    thumbnailUrl: d.thumbnailUrl,
    likesCount: d.likesCount,
    autor: d.autorVisible ? (d.user?.nombre?.split(' ')[0] ?? null) : null,
    shareToken: d.shareToken,
    likedByMe: likedByMe.has(d.id),
  };
}
