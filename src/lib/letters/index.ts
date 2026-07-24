/**
 * Generador de letras (SS11.5). TypeScript puro.
 * Caracteres validos: A-Z, N con tilde, 0-9. Normaliza a mayusculas, filtra
 * (T-08 si filtro alguno), limita a 10.
 */

export const MAX_LETTERS = 10;

export const VALID_LETTER_CHARS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789';

const VALID_CHAR = /^[A-ZÑ0-9]$/;

export interface NormalizedLetters {
  chars: string[];
  /** cuantos caracteres invalidos se filtraron (T-08 si > 0). */
  filtrados: number;
  truncated: boolean;
}

export function normalizeLettersInput(raw: string): NormalizedLetters {
  const upper = raw.toUpperCase();
  const chars: string[] = [];
  let filtrados = 0;
  for (const ch of upper) {
    if (ch === ' ') continue;
    if (VALID_CHAR.test(ch)) chars.push(ch);
    else filtrados++;
  }
  const truncated = chars.length > MAX_LETTERS;
  return { chars: chars.slice(0, MAX_LETTERS), filtrados, truncated };
}

/**
 * Anchura relativa por glifo (ancho = ratio x altura), deterministico.
 * Calibrado para que "M" con altura 12 de ~9,4 mm (contrato SS13.1).
 */
const WIDTH_RATIOS: Record<string, number> = {
  I: 0.34, J: 0.56, L: 0.56, F: 0.6, E: 0.62, T: 0.64, '1': 0.42,
  M: 0.78, W: 0.84, 'Ñ': 0.74, Q: 0.74, O: 0.72, G: 0.72, D: 0.7,
};

const DEFAULT_RATIO = 0.66;

/** Ancho en mm de un glifo para una altura dada. */
export function glyphWidthMm(char: string, alturaMm: number): number {
  const ratio = WIDTH_RATIOS[char] ?? DEFAULT_RATIO;
  return Math.round(ratio * alturaMm * 10) / 10;
}
