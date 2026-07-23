import { describe, expect, it } from 'vitest';
import {
  computeBreakdown,
  computeTotalCentimos,
  formatCentimos,
  type PricedElement,
} from '@/lib/pricing';

const elements = new Map<string, PricedElement>([
  ['corazon', { precioCentimos: 250, nombre: 'Corazón rosa' }],
  ['lazo', { precioCentimos: 300, nombre: 'Lazo coqueta' }],
  ['letra', { precioCentimos: 150, nombre: 'Letra dorada' }],
]);

describe('computeTotalCentimos (§6.7)', () => {
  it('total = funda + suma de elementos', () => {
    const total = computeTotalCentimos(
      1990,
      [
        { elementId: 'corazon', instanceId: 'a' },
        { elementId: 'lazo', instanceId: 'b' },
      ],
      elements,
    );
    expect(total).toBe(1990 + 250 + 300);
  });

  it('cada letra cuenta individualmente', () => {
    const total = computeTotalCentimos(
      1990,
      [
        { elementId: 'letra', instanceId: 'l1', letraChar: 'A' },
        { elementId: 'letra', instanceId: 'l2', letraChar: 'N' },
        { elementId: 'letra', instanceId: 'l3', letraChar: 'A' },
      ],
      elements,
    );
    expect(total).toBe(1990 + 3 * 150);
  });

  it('funda sin elementos: solo el precio de la variante', () => {
    expect(computeTotalCentimos(2490, [], elements)).toBe(2490);
  });

  it('caso §18.18: un elemento desconocido lanza error (el server rechaza)', () => {
    expect(() =>
      computeTotalCentimos(1990, [{ elementId: 'inexistente', instanceId: 'x' }], elements),
    ).toThrow();
  });
});

describe('computeBreakdown (desglose del PriceTag)', () => {
  it('incluye la funda y una línea por elemento con su nombre', () => {
    const breakdown = computeBreakdown(
      'Funda silicona rosa',
      1990,
      [
        { elementId: 'corazon', instanceId: 'a' },
        { elementId: 'letra', instanceId: 'l1', letraChar: 'V' },
      ],
      elements,
    );
    expect(breakdown.lines).toHaveLength(3);
    expect(breakdown.lines[0]!.label).toBe('Funda silicona rosa');
    expect(breakdown.lines[2]!.label).toContain('«V»');
    expect(breakdown.totalCentimos).toBe(1990 + 250 + 150);
  });
});

describe('formatCentimos', () => {
  it('formatea en EUR es-ES', () => {
    const s = formatCentimos(2490);
    expect(s).toContain('24,90');
    expect(s).toContain('€');
  });
});
