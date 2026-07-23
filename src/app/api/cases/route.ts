import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { apiError, handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET /api/cases?deviceId= — fundas compatibles activas con variantes (§12.3). */
export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get('deviceId');
    if (!deviceId) return apiError('S-03', 'deviceId requerido');

    const cases = await prisma.caseBase.findMany({
      where: { activo: true, compat: { some: { deviceId } } },
      orderBy: [{ destacada: 'desc' }, { nombre: 'asc' }],
      include: { variantes: true },
    });
    return NextResponse.json({
      fundas: cases.map((c) => ({
        id: c.id,
        slug: c.slug,
        nombre: c.nombre,
        descripcion: c.descripcion,
        material: c.material,
        fotos: c.fotos,
        variantes: c.variantes.map((v) => ({
          id: v.id,
          colorNombre: v.colorNombre,
          colorHex: v.colorHex,
          precioCentimos: v.precioCentimos,
          disponible: v.disponible,
        })),
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
