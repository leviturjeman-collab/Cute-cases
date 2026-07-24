import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { apiError, handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET /api/cases/[slug] (SS13.1): ficha completa; 404 si inactiva. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const caseBase = await prisma.caseBase.findUnique({
      where: { slug: params.slug },
      include: { variantes: true, compat: { include: { device: true } } },
    });
    if (!caseBase || !caseBase.activo) return apiError('NOT_FOUND', 'Funda no encontrada');
    return NextResponse.json({
      id: caseBase.id,
      slug: caseBase.slug,
      nombre: caseBase.nombre,
      descripcion: caseBase.descripcion,
      material: caseBase.material,
      fotos: caseBase.fotos,
      variantes: caseBase.variantes,
      compatibles: caseBase.compat
        .filter((c) => c.device.activo)
        .map((c) => ({
          id: c.device.id,
          slug: c.device.slug,
          nombre: c.device.nombre,
          generacion: c.device.generacion,
          anchoMm: c.device.anchoMm,
          altoMm: c.device.altoMm,
          radioEsquinaMm: c.device.radioEsquinaMm,
          grosorMm: c.device.grosorMm,
          cameraZone: c.device.cameraZone,
          moduloForma: c.device.moduloForma,
        })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
