import { describe, expect, it } from 'vitest';
import { computeBreakdown, computeTotalCentimos, formatCentimos, type PricedElement } from '@/lib/pricing';

const elements = new Map<string, PricedElement>([
  ['corazon', { precioCentimos: 350, nombre: 'Corazon clasico' }],
  ['lazo', { precioCentimos: 495, nombre: 'Lazo coqueta' }],
  ['letra', { precioCentimos: 195, nombre: 'Letra oro' }],
]);

describe('computeTotalCentimos (SS7.9)', () => {
  it('total = variante + suma de elementos', () => {
    const total = computeTotalCentimos(
      1995,
      [
        { elementId: 'corazon', instanceId: 'a' },
        { elementId: 'lazo', instanceId: 'b' },
      ],
      elements,
    );
    expect(total).toBe(1995 + 350 + 495);
  });

  it('cada letra generada cuenta como una linea', () => {
    const total = computeTotalCentimos(
      1995,
      ['M', 'A', 'R'].map((ch, i) => ({ elementId: 'letra', instanceId: `l${i}`, letterChar: ch })),
      elements,
    );
    expect(total).toBe(1995 + 3 * 195);
  });

  it('sin elementos: solo la variante', () => {
    expect(computeTotalCentimos(2495, [], elements)).toBe(2495);
  });

  it('elemento desconocido lanza (el server rechaza, SS26.18)', () => {
    expect(() => computeTotalCentimos(1995, [{ elementId: 'nada' }], elements)).toThrow();
  });
});

describe('computeBreakdown', () => {
  it('linea de funda + una por elemento con nombre', () => {
    const b = computeBreakdown(
      'Silicona Soft Rosa',
      1995,
      [
        { elementId: 'corazon', instanceId: 'a' },
        { elementId: 'letra', instanceId: 'l1', letterChar: 'V' },
      ],
      elements,
    );
    expect(b.lines).toHaveLength(3);
    expect(b.lines[0]!.label).toBe('Silicona Soft Rosa');
    expect(b.lines[2]!.label).toContain('"V"');
    expect(b.totalCentimos).toBe(1995 + 350 + 195);
  });
});

describe('formatCentimos (SS18)', () => {
  it('coma decimal y simbolo pospuesto', () => {
    const s = formatCentimos(2495);
    expect(s).toContain('24,95');
    expect(s.indexOf('24,95')).toBeLessThan(s.indexOf('€'));
  });
});
