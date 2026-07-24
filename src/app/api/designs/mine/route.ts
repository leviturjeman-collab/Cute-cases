import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { handleApiError } from '@/server/errors';
import { getDesignAvailability } from '@/server/designService';

export const dynamic = 'force-dynamic';

const PAGE = 24;

/** GET /api/designs/mine?cursor= (SS13.2): paginada con expiredCount. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const cursor = req.nextUrl.searchParams.get('cursor');
    const designs = await prisma.design.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { device: { select: { nombre: true } } },
    });
    const hasMore = designs.length > PAGE;
    const page = hasMore ? designs.slice(0, PAGE) : designs;
    const disenos = await Promise.all(
      page.map(async (d) => {
        const availability = await getDesignAvailability(d);
        return {
          id: d.id,
          nombre: d.nombre,
          deviceNombre: d.device.nombre,
          precioTotalCache: d.precioTotalCache,
          thumbnailUrl: d.thumbnailUrl,
          shareToken: d.shareToken,
          shareNombre: d.shareNombre,
          publicadoGaleria: d.publicadoGaleria,
          autorVisible: d.autorVisible,
          likesCount: d.likesCount,
          updatedAt: d.updatedAt,
          expiredCount: availability.expiredCount,
        };
      }),
    );
    return NextResponse.json({ disenos, nextCursor: hasMore ? page[page.length - 1]!.id : null });
  } catch (e) {
    return handleApiError(e);
  }
}
