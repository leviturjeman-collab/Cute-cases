import { describe, expect, it } from 'vitest';
import {
  type CaseGeometry,
  type ElementInstance,
  type ElementShape,
  convexPolygonsCollide,
  decomposeConvex,
  findFreeSpot,
  isConvex,
  placeLettersRow,
  pointInRoundedRect,
  polygonsCollide,
  rectHitbox,
  transformPolygon,
  validateDesign,
  validatePlacement,
} from '@/lib/collision';

// Geometría de prueba: funda tipo iPhone (70 × 145 mm, esquinas 10 mm)
// con zona de cámara cuadrada arriba a la izquierda.
const geometry: CaseGeometry = {
  anchoMm: 70,
  altoMm: 145,
  radioEsquinaMm: 10,
  cameraZone: [
    { x: 5, y: 5 },
    { x: 35, y: 5 },
    { x: 35, y: 35 },
    { x: 5, y: 35 },
  ],
};

const square10: ElementShape = { hitbox: rectHitbox(10, 10), anchoMm: 10, altoMm: 10 };

function shapes(entries: [string, ElementShape][]): Map<string, ElementShape> {
  return new Map(entries);
}

function inst(
  instanceId: string,
  elementId: string,
  xMm: number,
  yMm: number,
  rot = 0,
): ElementInstance {
  return { instanceId, elementId, xMm, yMm, rotacionGrados: rot };
}

describe('SAT básico', () => {
  it('detecta solape de cuadrados superpuestos', () => {
    const a = transformPolygon(rectHitbox(10, 10), 0, 0, 0);
    const b = transformPolygon(rectHitbox(10, 10), 5, 5, 0);
    expect(convexPolygonsCollide(a, b, 0)).toBe(true);
  });

  it('no detecta solape de cuadrados separados', () => {
    const a = transformPolygon(rectHitbox(10, 10), 0, 0, 0);
    const b = transformPolygon(rectHitbox(10, 10), 25, 0, 0);
    expect(convexPolygonsCollide(a, b, 0)).toBe(false);
  });

  it('la rotación cuenta: cuadrado rotado 45° colisiona donde alineado no lo haría', () => {
    // Dos cuadrados de 10 mm con centros a 11.5 mm: separados si están alineados
    // (semiancho 5+5=10 < 11.5)…
    const a = transformPolygon(rectHitbox(10, 10), 0, 0, 0);
    const bAligned = transformPolygon(rectHitbox(10, 10), 11.5, 0, 0);
    expect(convexPolygonsCollide(a, bAligned, 0)).toBe(false);
    // …pero la semidiagonal del rotado 45° (5√2 ≈ 7.07; 5+7.07 > 11.5) invade el hueco.
    const bRotated = transformPolygon(rectHitbox(10, 10), 11.5, 0, 45);
    expect(convexPolygonsCollide(a, bRotated, 0)).toBe(true);
  });

  it('caso §18.5: rozar el margen de 0,5 mm sigue siendo inválido', () => {
    const a = transformPolygon(rectHitbox(10, 10), 0, 0, 0);
    // Separación real de 0,4 mm < margen 0,5 mm → colisión
    const b = transformPolygon(rectHitbox(10, 10), 10.4, 0, 0);
    expect(convexPolygonsCollide(a, b, 0.5)).toBe(true);
    // Separación de 0,6 mm ≥ margen → válido
    const c = transformPolygon(rectHitbox(10, 10), 10.6, 0, 0);
    expect(convexPolygonsCollide(a, c, 0.5)).toBe(false);
  });
});

describe('polígonos cóncavos', () => {
  // Flecha cóncava (forma de L)
  const lShape = [
    { x: -5, y: -5 },
    { x: 5, y: -5 },
    { x: 5, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 5 },
    { x: -5, y: 5 },
  ];

  it('detecta concavidad y descompone en convexos', () => {
    expect(isConvex(lShape)).toBe(false);
    const parts = decomposeConvex(lShape);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(isConvex(part)).toBe(true);
  });

  it('un punto en el hueco de la L no colisiona con ella', () => {
    // Cuadradito de 2 mm centrado en el hueco de la L (cuadrante superior... (x>0,y>0))
    const small = transformPolygon(rectHitbox(2, 2), 3, 3, 0);
    const world = transformPolygon(lShape, 0, 0, 0);
    expect(polygonsCollide(world, small, 0)).toBe(false);
  });

  it('sí colisiona cuando toca el cuerpo de la L', () => {
    const small = transformPolygon(rectHitbox(2, 2), -3, -3, 0);
    const world = transformPolygon(lShape, 0, 0, 0);
    expect(polygonsCollide(world, small, 0)).toBe(true);
  });
});

describe('contorno de la funda (regla 3)', () => {
  it('punto en el centro está dentro; fuera del rectángulo no', () => {
    expect(pointInRoundedRect({ x: 35, y: 72 }, 70, 145, 10)).toBe(true);
    expect(pointInRoundedRect({ x: -1, y: 10 }, 70, 145, 10)).toBe(false);
  });

  it('la esquina redondeada excluye el pico del rectángulo', () => {
    // (1,1) está dentro del rect pero fuera del radio de 10 mm de la esquina
    expect(pointInRoundedRect({ x: 1, y: 1 }, 70, 145, 10)).toBe(false);
    // el centro del arco sí está dentro
    expect(pointInRoundedRect({ x: 10, y: 10 }, 70, 145, 10)).toBe(true);
  });

  it('caso §18.4: elemento asomando por el borde es inválido', () => {
    const s = shapes([['sq', square10]]);
    const result = validatePlacement(inst('i1', 'sq', 3, 72), [], s, geometry);
    expect(result.valid).toBe(false);
    expect(result.reasons.some((r) => r.type === 'out-of-bounds')).toBe(true);
  });
});

describe('zona de cámara (regla 2)', () => {
  it('caso §18.4: elemento sobre la cámara es inválido', () => {
    const s = shapes([['sq', square10]]);
    const result = validatePlacement(inst('i1', 'sq', 20, 20), [], s, geometry);
    expect(result.valid).toBe(false);
    expect(result.reasons.some((r) => r.type === 'camera')).toBe(true);
  });

  it('elemento lejos de la cámara es válido', () => {
    const s = shapes([['sq', square10]]);
    const result = validatePlacement(inst('i1', 'sq', 35, 100), [], s, geometry);
    expect(result.valid).toBe(true);
  });
});

describe('validateDesign (servidor, §12.5 / caso §18.19)', () => {
  it('rechaza diseños con elementos solapados construidos a mano', () => {
    const s = shapes([['sq', square10]]);
    const design = [inst('a', 'sq', 35, 100), inst('b', 'sq', 38, 102)];
    const invalid = validateDesign(design, s, geometry);
    expect(invalid.size).toBe(2);
    expect(invalid.get('a')?.some((r) => r.type === 'overlap')).toBe(true);
  });

  it('acepta un diseño válido', () => {
    const s = shapes([['sq', square10]]);
    const design = [inst('a', 'sq', 20, 100), inst('b', 'sq', 50, 100), inst('c', 'sq', 35, 125)];
    const invalid = validateDesign(design, s, geometry);
    expect(invalid.size).toBe(0);
  });

  it('caso §18.3: la rotación puede invalidar una posición válida', () => {
    const s = shapes([
      ['bar', { hitbox: rectHitbox(30, 6), anchoMm: 30, altoMm: 6 }],
      ['sq', square10],
    ]);
    // Barra horizontal junto a un cuadrado: válida a 0°…
    const others = [inst('sq1', 'sq', 35, 80)];
    const at0 = validatePlacement(inst('bar1', 'bar', 35, 95), others, s, geometry);
    expect(at0.valid).toBe(true);
    // …inválida rotada 90° (invade el cuadrado)
    const at90 = validatePlacement(inst('bar1', 'bar', 35, 95, 90), others, s, geometry);
    expect(at90.valid).toBe(false);
  });
});

describe('findFreeSpot (§6.4 tap para añadir)', () => {
  it('con la funda vacía coloca en el centro', () => {
    const s = shapes([['sq', square10]]);
    const spot = findFreeSpot('sq', square10, [], s, geometry);
    expect(spot).not.toBeNull();
    expect(spot!.x).toBeCloseTo(35);
    expect(spot!.y).toBeCloseTo(72.5);
  });

  it('con el centro ocupado encuentra hueco cercano válido', () => {
    const s = shapes([['sq', square10]]);
    const others = [inst('c', 'sq', 35, 72.5)];
    const spot = findFreeSpot('sq', square10, others, s, geometry);
    expect(spot).not.toBeNull();
    const placed = validatePlacement(
      { instanceId: 'new', elementId: 'sq', xMm: spot!.x, yMm: spot!.y, rotacionGrados: 0 },
      others,
      s,
      geometry,
    );
    expect(placed.valid).toBe(true);
  });

  it('caso §18.1: sin hueco devuelve null (E-06)', () => {
    // Elemento gigante que no cabe con otro gigante ya colocado
    const giant: ElementShape = { hitbox: rectHitbox(60, 100), anchoMm: 60, altoMm: 100 };
    const s = shapes([['g', giant]]);
    const others = [inst('g1', 'g', 35, 85)];
    const spot = findFreeSpot('g', giant, others, s, geometry);
    expect(spot).toBeNull();
  });
});

describe('placeLettersRow (§4.4, casos §18.1–2)', () => {
  const letterShape: ElementShape = { hitbox: rectHitbox(8, 10), anchoMm: 8, altoMm: 10 };
  const letters = (chars: string) =>
    [...chars].map((c) => ({ letraChar: c, elementId: `letra-${c}`, shape: letterShape }));

  it('coloca una fila completa centrada con separación de 2 mm', () => {
    const row = placeLettersRow(letters('ANA'), [], new Map(), geometry);
    expect(row).toHaveLength(3);
    // Separación entre centros = ancho + gap = 10 mm
    expect(row[1]!.xMm - row[0]!.xMm).toBeCloseTo(10);
    expect(row[2]!.xMm - row[1]!.xMm).toBeCloseTo(10);
    // Centrada horizontalmente
    expect((row[0]!.xMm + row[2]!.xMm) / 2).toBeCloseTo(35);
  });

  it('caso §18.2: con hueco solo para algunas, coloca las que caben en orden (E-07)', () => {
    // Bloquear casi toda la funda dejando una franja libre abajo con ancho limitado
    const blocker: ElementShape = { hitbox: rectHitbox(66, 100), anchoMm: 66, altoMm: 100 };
    const s = shapes([['block', blocker]]);
    const others = [inst('b1', 'block', 35, 60)];
    // Franja libre: y ∈ (110..145) → caben letras, pero una fila de 10 letras
    // (98 mm) es más ancha que la funda (70 mm) → deben caber menos de 10
    const row = placeLettersRow(letters('ABCDEFGHIJ'), others, s, geometry);
    expect(row.length).toBeGreaterThan(0);
    expect(row.length).toBeLessThan(10);
    // Se conserva el orden desde el principio
    expect(row.map((r) => r.letraChar).join('')).toBe('ABCDEFGHIJ'.slice(0, row.length));
  });

  it('sin hueco alguno devuelve lista vacía (E-06)', () => {
    const blocker: ElementShape = { hitbox: rectHitbox(68, 143), anchoMm: 68, altoMm: 143 };
    const s = shapes([['block', blocker]]);
    const others = [inst('b1', 'block', 35, 72.5)];
    const row = placeLettersRow(letters('HOLA'), others, s, geometry);
    expect(row).toHaveLength(0);
  });
});

describe('presupuesto de rendimiento (§14: <2 ms con 40 elementos)', () => {
  it('validateDesign con 40 elementos termina en tiempo razonable', () => {
    const s = shapes([['sq', { hitbox: rectHitbox(6, 6), anchoMm: 6, altoMm: 6 }]]);
    const design: ElementInstance[] = [];
    let n = 0;
    for (let y = 10; y <= 138 && n < 40; y += 8) {
      for (let x = 8; x <= 62 && n < 40; x += 8) {
        design.push(inst(`i${n}`, 'sq', x, y, (n * 13) % 360));
        n++;
      }
    }
    expect(design.length).toBe(40);
    const start = performance.now();
    validateDesign(design, s, geometry);
    const elapsed = performance.now() - start;
    // En CI damos holgura ×10 sobre el presupuesto de móvil de gama media
    expect(elapsed).toBeLessThan(20);
  });
});
