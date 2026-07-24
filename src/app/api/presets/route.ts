import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET /api/presets (SS13.4): publicados en orden de carrusel. */
export async function GET() {
  try {
    const presets = await prisma.presetDesign.findMany({
      where: { publicado: true },
      orderBy: { orden: 'asc' },
      select: { id: true, slug: true, nombre: true, precioCentimos: true, fotos: true },
    });
    return NextResponse.json({ presets });
  } catch (e) {
    return handleApiError(e);
  }
}
