import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

/**
 * GET /api/gallery?sort=semana|recientes&cursor= — galería paginada (§9).
 * "semana": las más queridas de los últimos 7 días.
 */
export async function GET(req: NextRequest) {
  try {
    const sort = req.nextUrl.searchParams.get('sort') ?? 'semana';
    const cursor = req.nextUrl.searchParams.get('cursor');

    if (sort === 'semana') {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const likes = await prisma.like.groupBy({
        by: ['designId'],
        where: { createdAt: { gte: since }, design: { publicadoGaleria: true } },
        _count: { designId: true },
        orderBy: { _count: { designId: 'desc' } },
        take: 100,
      });
      const rankedIds = likes.map((l) => l.designId);
      // Completar con recientes publicados si hay pocos likes esta semana
      const designs = await prisma.design.findMany({
        where: { publicadoGaleria: true },
        include: { user: { select: { nombre: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
      const rank = new Map(rankedIds.map((id, i) => [id, i]));
      designs.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
      return NextResponse.json({
        disenos: designs.slice(0, PAGE_SIZE).map((d) => toCard(d)),
        nextCursor: null,
      });
    }

    const designs = await prisma.design.findMany({
      where: { publicadoGaleria: true },
      include: { user: { select: { nombre: true } } },
      orderBy: { updatedAt: 'desc' },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = designs.length > PAGE_SIZE;
    const page = hasMore ? designs.slice(0, PAGE_SIZE) : designs;
    return NextResponse.json({
      disenos: page.map((d) => toCard(d)),
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

function toCard(d: {
  id: string;
  nombre: string;
  thumbnailUrl: string | null;
  likesCount: number;
  autorVisible: boolean;
  shareToken: string;
  user: { nombre: string | null } | null;
}) {
  return {
    id: d.id,
    nombre: d.nombre,
    thumbnailUrl: d.thumbnailUrl,
    likesCount: d.likesCount,
    // Nombre de pila del autor solo si autorVisible (§9)
    autor: d.autorVisible ? (d.user?.nombre?.split(' ')[0] ?? null) : null,
    shareToken: d.shareToken,
  };
}
