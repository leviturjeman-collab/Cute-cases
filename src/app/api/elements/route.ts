import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { handleApiError } from '@/server/errors';

/**
 * GET /api/elements?date= (SS13.1): elementos activos con temporada vigente
 * en la fecha (por defecto hoy servidor), agrupados por categoria y ordenados
 * por orden. Cache de 5 minutos revalidable.
 */
// El uso de searchParams (?date=) hace la ruta dinamica; la cache de 300 s
// (SS13.1) se aplica en la cabecera de respuesta.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get('date');
    const now = dateParam ? new Date(dateParam) : new Date();

    const activeSeason = await prisma.seasonCollection.findFirst({
      where: { activo: true, fechaInicio: { lte: now }, fechaFin: { gte: now } },
    });

    const elements = await prisma.element.findMany({
      where: {
        activo: true,
        OR: [{ seasonId: null }, ...(activeSeason ? [{ seasonId: activeSeason.id }] : [])],
      },
      orderBy: [{ categoria: 'asc' }, { orden: 'asc' }],
    });

    const porCategoria: Record<string, unknown[]> = {};
    for (const e of elements) {
      (porCategoria[e.categoria] ??= []).push({
        id: e.id,
        slug: e.slug,
        nombre: e.nombre,
        tipo: e.tipo,
        categoria: e.categoria,
        precioCentimos: e.precioCentimos,
        anchoMm: e.anchoMm,
        altoMm: e.altoMm,
        profundidadMm: e.profundidadMm,
        recipe: e.recipe,
        recipeParams: e.recipeParams,
        assetUrl: e.assetUrl,
        hitbox: e.hitbox,
        acabado: e.acabado,
        colores: e.colores,
        letraChar: e.letraChar,
        esNuevo: e.esNuevo,
      });
    }

    return NextResponse.json(
      {
        porCategoria,
        temporada: activeSeason
          ? { id: activeSeason.id, slug: activeSeason.slug, nombre: activeSeason.nombre }
          : null,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
    );
  } catch (e) {
    return handleApiError(e);
  }
}
