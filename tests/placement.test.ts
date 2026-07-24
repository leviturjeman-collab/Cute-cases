import { describe, expect, it } from 'vitest';
import {
  buildSceneContext,
  esValida,
  findFreeSpot,
  placeLettersRow,
  rectHitbox,
  type DeviceSpec,
  type ElementShape,
  type PlacedItem,
} from '@/lib/collision';

const device: DeviceSpec = {
  anchoMm: 73.6,
  altoMm: 149.6,
  radioEsquinaMm: 11,
  cameraZone: [
    { x: 4, y: 4 },
    { x: 49, y: 4 },
    { x: 49, y: 49 },
    { x: 4, y: 49 },
  ],
};

const sq10: ElementShape = { hitbox: rectHitbox(10, 10), anchoMm: 10, altoMm: 10 };

function item(id: string, el: string, x: number, y: number, rot = 0): PlacedItem {
  return { instanceId: id, elementId: el, xMm: x, yMm: y, rotationDeg: rot };
}

describe('findFreeSpot (SS7.5)', () => {
  it('funda vacia: coloca en el centro', () => {
    const spot = findFreeSpot('sq', sq10, [], new Map(), device);
    expect(spot).not.toBeNull();
    expect(spot!.x).toBeCloseTo(device.anchoMm / 2);
    expect(spot!.y).toBeCloseTo(device.altoMm / 2);
  });

  it('centro ocupado: encuentra hueco valido cercano (espiral)', () => {
    const shapes = new Map([['sq', sq10]]);
    const others = [item('c', 'sq', device.anchoMm / 2, device.altoMm / 2)];
    const spot = findFreeSpot('sq', sq10, others, shapes, device);
    expect(spot).not.toBeNull();
    const ctx = buildSceneContext(device);
    const placed = esValida(
      { instanceId: 'n', elementId: 'sq', xMm: spot!.x, yMm: spot!.y, rotationDeg: spot!.rotationDeg },
      others,
      shapes,
      ctx,
    );
    expect(placed.valida).toBe(true);
  });

  it('prueba rotaciones: una barra que solo cabe girada encuentra pose', () => {
    // Pasillo horizontal estrecho: bloqueadores arriba y abajo dejan una franja
    // de 12 mm de alto; una barra de 40x8 solo cabe con rotacion 0 (horizontal).
    // Pasillo vertical: al reves. Comprobamos que la espiral con 4 rotaciones
    // resuelve el caso vertical.
    const blocker: ElementShape = { hitbox: rectHitbox(24, 60), anchoMm: 24, altoMm: 60 };
    const bar: ElementShape = { hitbox: rectHitbox(40, 8), anchoMm: 40, altoMm: 8 };
    const shapes = new Map<string, ElementShape>([
      ['block', blocker],
      ['bar', bar],
    ]);
    // Dos bloques dejando un canal vertical de ~14 mm en el centro
    const others = [item('b1', 'block', 16, 105), item('b2', 'block', 57.6, 105)];
    const spot = findFreeSpot('bar', bar, others, shapes, device);
    expect(spot).not.toBeNull();
    // La barra horizontal (40 mm) no cabe en un canal de 14 mm: la pose valida
    // encontrada debe ser vertical (90 o 270)
    expect(spot!.rotationDeg % 180).toBe(90);
  });

  it('sin hueco -> null (T-06)', () => {
    const giant: ElementShape = { hitbox: rectHitbox(60, 90), anchoMm: 60, altoMm: 90 };
    const shapes = new Map([['g', giant]]);
    const others = [item('g1', 'g', 36.8, 100)];
    expect(findFreeSpot('g', giant, others, shapes, device)).toBeNull();
  });
});

describe('placeLettersRow (SS11.5)', () => {
  const letterShape: ElementShape = { hitbox: rectHitbox(9.4, 12), anchoMm: 9.4, altoMm: 12 };
  const letters = (chars: string) =>
    [...chars].map((c) => ({ letterChar: c, elementId: `letra-${c}`, shape: letterShape }));

  it('fila completa centrada con separacion de 2 mm', () => {
    const row = placeLettersRow(letters('MAR'), [], new Map(), device);
    expect(row).toHaveLength(3);
    expect(row[1]!.xMm - row[0]!.xMm).toBeCloseTo(9.4 + 2);
    expect((row[0]!.xMm + row[2]!.xMm) / 2).toBeCloseTo(device.anchoMm / 2);
  });

  it('parciales: 10 letras con hueco limitado -> se colocan las que caben en orden (T-07)', () => {
    const blocker: ElementShape = { hitbox: rectHitbox(66, 100), anchoMm: 66, altoMm: 100 };
    const shapes = new Map<string, ElementShape>([['block', blocker]]);
    const others = [item('b1', 'block', 36.8, 62)];
    const row = placeLettersRow(letters('ABCDEFGHIJ'), others, shapes, device);
    expect(row.length).toBeGreaterThan(0);
    expect(row.length).toBeLessThan(10);
    expect(row.map((r) => r.letterChar).join('')).toBe('ABCDEFGHIJ'.slice(0, row.length));
  });

  it('imposible -> [] (T-06)', () => {
    const blocker: ElementShape = { hitbox: rectHitbox(70, 146), anchoMm: 70, altoMm: 146 };
    const shapes = new Map<string, ElementShape>([['block', blocker]]);
    const others = [item('b1', 'block', 36.8, 74.8)];
    expect(placeLettersRow(letters('HOLA'), others, shapes, device)).toHaveLength(0);
  });
});
