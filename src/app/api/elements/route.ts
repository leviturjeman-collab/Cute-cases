import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/elements — elementos activos y NO caducados a fecha de hoy,
 * agrupados por categoría, + colección de temporada activa si la hay (§12.3).
 */
export async function GET() {
  try {
    const now = new Date();
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
        nombre: e.nombre,
        tipo: e.tipo,
        categoria: e.categoria,
        precioCentimos: e.precioCentimos,
        anchoMm: e.anchoMm,
        altoMm: e.altoMm,
        profundidadMm: e.profundidadMm,
        assetUrl: e.assetUrl,
        hitbox: e.hitbox,
        esNuevo: e.esNuevo,
        letraChar: e.letraChar,
      });
    }

    return NextResponse.json({
      porCategoria,
      temporada: activeSeason
        ? { id: activeSeason.id, nombre: activeSeason.nombre, emoji: activeSeason.emoji }
        : null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
