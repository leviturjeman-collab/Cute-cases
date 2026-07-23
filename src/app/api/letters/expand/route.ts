import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { lettersExpandSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { normalizeLettersInput } from '@/lib/letters';

export const dynamic = 'force-dynamic';

/**
 * POST /api/letters/expand — texto → lista de element-letras válidos con
 * precios (§12.3, §4.4).
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = lettersExpandSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', 'Texto inválido');

    const normalized = normalizeLettersInput(parsed.data.texto);
    const letterElements = await prisma.element.findMany({
      where: { categoria: 'letras', activo: true, letraChar: { in: normalized.chars } },
    });
    const byChar = new Map(letterElements.map((e) => [e.letraChar, e]));

    const letras = normalized.chars.flatMap((ch) => {
      const el = byChar.get(ch);
      if (!el) return [];
      return [
        {
          letraChar: ch,
          elementId: el.id,
          precioCentimos: el.precioCentimos,
          anchoMm: el.anchoMm,
          altoMm: el.altoMm,
          hitbox: el.hitbox,
          assetUrl: el.assetUrl,
          tipo: el.tipo,
          nombre: el.nombre,
        },
      ];
    });

    return NextResponse.json({
      letras,
      filtered: normalized.filtered,
      truncated: normalized.truncated,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
