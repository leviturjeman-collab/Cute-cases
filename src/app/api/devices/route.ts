import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET /api/devices (SS13.1): modelos activos agrupados por generacion. */
export async function GET() {
  try {
    const devices = await prisma.deviceModel.findMany({
      where: { activo: true },
      orderBy: [{ generacion: 'desc' }, { nombre: 'asc' }],
      select: {
        id: true,
        slug: true,
        nombre: true,
        generacion: true,
        anchoMm: true,
        altoMm: true,
        radioEsquinaMm: true,
        grosorMm: true,
        cameraZone: true,
        moduloForma: true,
      },
    });
    const byGen = new Map<string, typeof devices>();
    for (const d of devices) {
      const list = byGen.get(d.generacion) ?? [];
      list.push(d);
      byGen.set(d.generacion, list);
    }
    const generaciones = [...byGen.entries()]
      .sort((a, b) => b[0].localeCompare(a[0], 'es', { numeric: true }))
      .map(([nombre, modelos]) => ({ nombre, modelos }));
    return NextResponse.json({ generaciones });
  } catch (e) {
    return handleApiError(e);
  }
}
