import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET /api/devices — modelos activos agrupados por generación (§12.3). */
export async function GET() {
  try {
    const devices = await prisma.deviceModel.findMany({
      where: { activo: true },
      orderBy: [{ generacion: 'desc' }, { orden: 'asc' }],
      select: {
        id: true,
        nombre: true,
        generacion: true,
        anchoMm: true,
        altoMm: true,
        radioEsquinaMm: true,
        cameraZone: true,
      },
    });
    const byGeneration: Record<string, typeof devices> = {};
    for (const d of devices) {
      (byGeneration[d.generacion] ??= []).push(d);
    }
    return NextResponse.json({ generaciones: byGeneration });
  } catch (e) {
    return handleApiError(e);
  }
}
