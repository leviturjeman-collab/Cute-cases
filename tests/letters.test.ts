import { describe, expect, it } from 'vitest';
import { MAX_LETTERS, glyphWidthMm, normalizeLettersInput } from '@/lib/letters';

describe('normalizeLettersInput (SS11.5)', () => {
  it('normaliza a mayusculas', () => {
    expect(normalizeLettersInput('mar').chars).toEqual(['M', 'A', 'R']);
  });

  it('acepta enye y digitos', () => {
    expect(normalizeLettersInput('Año 25').chars).toEqual(['A', 'Ñ', 'O', '2', '5']);
  });

  it('ignora espacios sin contarlos como filtrados', () => {
    const r = normalizeLettersInput('A B');
    expect(r.chars).toEqual(['A', 'B']);
    expect(r.filtrados).toBe(0);
  });

  it('filtra invalidos y los cuenta (T-08)', () => {
    const r = normalizeLettersInput('A-B!');
    expect(r.chars).toEqual(['A', 'B']);
    expect(r.filtrados).toBe(2);
  });

  it('limita a 10', () => {
    const r = normalizeLettersInput('ABCDEFGHIJKL');
    expect(r.chars).toHaveLength(MAX_LETTERS);
    expect(r.truncated).toBe(true);
  });
});

describe('glyphWidthMm', () => {
  it('la M con altura 12 mide ~9,4 mm (contrato SS13.1)', () => {
    expect(glyphWidthMm('M', 12)).toBeCloseTo(9.4, 1);
  });

  it('la I es mas estrecha que la M', () => {
    expect(glyphWidthMm('I', 12)).toBeLessThan(glyphWidthMm('M', 12));
  });

  it('deterministico', () => {
    expect(glyphWidthMm('Q', 14)).toBe(glyphWidthMm('Q', 14));
  });
});
