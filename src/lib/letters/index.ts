/**
 * Generador de letras e iniciales (§4.4). TypeScript puro.
 * Caracteres válidos: A–Z, Ñ, 0–9. Se normaliza a mayúsculas, los espacios se
 * ignoran y los caracteres inválidos se filtran con aviso (E-08). Máx. 10.
 */

export const MAX_LETTERS = 10;

const VALID_CHAR = /^[A-ZÑ0-9]$/;

export interface NormalizedLetters {
  /** Caracteres válidos, en orden, ya en mayúsculas (máx. MAX_LETTERS). */
  chars: string[];
  /** true si se filtró algún carácter inválido (mostrar E-08). */
  filtered: boolean;
  /** true si el texto superaba el máximo y se truncó. */
  truncated: boolean;
}

export function normalizeLettersInput(raw: string): NormalizedLetters {
  const upper = raw.toUpperCase();
  const chars: string[] = [];
  let filtered = false;
  for (const ch of upper) {
    if (ch === ' ') continue; // los espacios se ignoran sin aviso
    if (VALID_CHAR.test(ch)) {
      chars.push(ch);
    } else {
      filtered = true;
    }
  }
  const truncated = chars.length > MAX_LETTERS;
  return { chars: chars.slice(0, MAX_LETTERS), filtered, truncated };
}
