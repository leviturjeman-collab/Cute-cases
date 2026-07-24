import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { lettersExpandSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { MAX_LETTERS, normalizeLettersInput } from '@/lib/letters';

export const dynamic = 'force-dynamic';

/**
 * POST /api/letters/expand (SS13.1): { texto, juego } -> lista de
 * elementos-letra con precio. Errores: LETTERS_EMPTY, LETTERS_TOO_LONG.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = lettersExpandSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', 'Payload invalido');

    const normalized = normalizeLettersInput(parsed.data.texto);
    if (normalized.chars.length === 0) {
      return apiError('LETTERS_EMPTY', 'Todos los caracteres fueron filtrados');
    }
    if (parsed.data.texto.replace(/\s/g, '').length > MAX_LETTERS && normalized.truncated) {
      return apiError('LETTERS_TOO_LONG', `Maximo ${MAX_LETTERS} caracteres`);
    }

    const letterElements = await prisma.element.findMany({
      where: {
        categoria: 'letras',
        activo: true,
        letraChar: { in: normalized.chars },
        recipeParams: { path: ['juego'], equals: parsed.data.juego },
      },
    });
    const byChar = new Map(letterElements.map((e) => [e.letraChar, e]));

    const letras = normalized.chars.flatMap((ch) => {
      const el = byChar.get(ch);
      if (!el) return [];
      return [
        {
          elementId: el.id,
          char: ch,
          anchoMm: el.anchoMm,
          altoMm: el.altoMm,
          precioCentimos: el.precioCentimos,
          hitbox: el.hitbox,
        },
      ];
    });

    return NextResponse.json({ letras, filtrados: normalized.filtrados });
  } catch (e) {
    return handleApiError(e);
  }
}
