import { describe, expect, it } from 'vitest';
import { MAX_LETTERS, normalizeLettersInput } from '@/lib/letters';

describe('normalizeLettersInput (§4.4)', () => {
  it('normaliza a mayúsculas', () => {
    expect(normalizeLettersInput('ana').chars).toEqual(['A', 'N', 'A']);
  });

  it('acepta Ñ y dígitos', () => {
    expect(normalizeLettersInput('Ñoño123').chars).toEqual(['Ñ', 'O', 'Ñ', 'O', '1', '2', '3']);
  });

  it('ignora espacios sin marcar filtrado', () => {
    const r = normalizeLettersInput('A B');
    expect(r.chars).toEqual(['A', 'B']);
    expect(r.filtered).toBe(false);
  });

  it('filtra caracteres inválidos y lo señala (E-08)', () => {
    const r = normalizeLettersInput('A-B!💖');
    expect(r.chars).toEqual(['A', 'B']);
    expect(r.filtered).toBe(true);
  });

  it('trunca a 10 caracteres', () => {
    const r = normalizeLettersInput('ABCDEFGHIJKL');
    expect(r.chars).toHaveLength(MAX_LETTERS);
    expect(r.truncated).toBe(true);
  });

  it('acentos: se filtran (solo A–Z, Ñ, 0–9)', () => {
    const r = normalizeLettersInput('JOSÉ');
    expect(r.chars).toEqual(['J', 'O', 'S']);
    expect(r.filtered).toBe(true);
  });
});
