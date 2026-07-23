import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { handleApiError } from '@/server/errors';
import { getDesignAvailability } from '@/server/designService';

export const dynamic = 'force-dynamic';

/** GET /api/designs/mine — Mis diseños, sin límite (§7.3). */
export async function GET() {
  try {
    const user = await requireUser();
    const designs = await prisma.design.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { device: { select: { nombre: true } } },
    });
    const withState = await Promise.all(
      designs.map(async (d) => {
        const availability = await getDesignAvailability(d);
        return {
          id: d.id,
          nombre: d.nombre,
          deviceNombre: d.device.nombre,
          precioTotalCache: d.precioTotalCache,
          thumbnailUrl: d.thumbnailUrl,
          shareToken: d.shareToken,
          publicadoGaleria: d.publicadoGaleria,
          autorVisible: d.autorVisible,
          likesCount: d.likesCount,
          updatedAt: d.updatedAt,
          necesitaCambio: !availability.disponible,
        };
      }),
    );
    return NextResponse.json({ disenos: withState });
  } catch (e) {
    return handleApiError(e);
  }
}
