import { describe, expect, it } from 'vitest';
import {
  buildSceneContext,
  esValida,
  rectHitbox,
  roundedRectPolygon,
  validarEscena,
  type DeviceSpec,
  type ElementShape,
  type PlacedItem,
} from '@/lib/collision';
import { heartOutline, recipeHitbox, simplifyPolygon, starOutline } from '@/lib/silhouettes';
import { decomposeConvex } from '@/lib/collision/geometry';

// Dispositivo de prueba tipo iPhone 15 Pro (SS11.1): 73,6 x 149,6, radio 11,
// camara {4, 4, 45, 45}.
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

const heartShape: ElementShape = {
  hitbox: decomposeConvex(simplifyPolygon(heartOutline(12, 11), 0.4)),
  anchoMm: 12,
  altoMm: 11,
};

function item(id: string, elementId: string, x: number, y: number, rot = 0): PlacedItem {
  return { instanceId: id, elementId, xMm: x, yMm: y, rotationDeg: rot };
}

function shapes(entries: [string, ElementShape][]): Map<string, ElementShape> {
  return new Map(entries);
}

describe('SS8.4 casos canonicos', () => {
  it('1: dos corazones separados 0,6 mm validos; a 0,4 mm SOLAPA (el margen cuenta)', () => {
    const s = shapes([['heart', { hitbox: rectHitbox(12, 11), anchoMm: 12, altoMm: 11 }]]);
    const ctx = buildSceneContext(device, 0.5);
    const base = item('a', 'heart', 30, 100);
    const at06 = item('b', 'heart', 30 + 12 + 0.6, 100);
    const at04 = item('b', 'heart', 30 + 12 + 0.4, 100);
    expect(esValida(at06, [base], s, ctx).valida).toBe(true);
    const r = esValida(at04, [base], s, ctx);
    expect(r.valida).toBe(false);
    expect(r.motivo).toBe('SOLAPA');
    expect(r.refs).toContain('a');
  });

  it('2: elemento rotado 45 grados cuyo AABB solapa pero sus poligonos no -> valido', () => {
    // Barra fina rotada 45: su AABB es grande, pero el poligono real pasa
    // en diagonal junto a un cuadrado sin tocarlo.
    const bar: ElementShape = { hitbox: rectHitbox(24, 2), anchoMm: 24, altoMm: 2 };
    const sq: ElementShape = { hitbox: rectHitbox(6, 6), anchoMm: 6, altoMm: 6 };
    const s = shapes([
      ['bar', bar],
      ['sq', sq],
    ]);
    const ctx = buildSceneContext(device, 0.5);
    // Cuadrado en (30,100); barra centrada en (38,92) rotada 45:
    // AABBs solapan pero la barra diagonal queda a >0,5 mm del cuadrado.
    const others = [item('sq1', 'sq', 30, 100)];
    const rotated = item('bar1', 'bar', 39.5, 90.5, 45);
    expect(esValida(rotated, others, s, ctx).valida).toBe(true);
  });

  it('3: estrella tocando el borde con un vertice fuera -> FUERA_DE_FUNDA', () => {
    const star: ElementShape = {
      hitbox: decomposeConvex(starOutline(11)),
      anchoMm: 11,
      altoMm: 11,
    };
    const s = shapes([['star', star]]);
    const ctx = buildSceneContext(device, 0.5);
    const inside = item('s1', 'star', 36, 100);
    expect(esValida(inside, [], s, ctx).valida).toBe(true);
    // Centro a 4 mm del borde izquierdo: la punta (5,5 mm) sobresale
    const out = esValida(item('s2', 'star', 4, 100), [], s, ctx);
    expect(out.valida).toBe(false);
    expect(out.motivo).toBe('FUERA_DE_FUNDA');
  });

  it('4: sticker cuya esquina roza la zona de camara inflada -> SOBRE_CAMARA', () => {
    const s = shapes([['sq', { hitbox: rectHitbox(10, 10), anchoMm: 10, altoMm: 10 }]]);
    const ctx = buildSceneContext(device, 0.5);
    // Camara llega a x=49 + 1 de inflado = 50. Centro a x=55.5: esquina en 50.5 -> fuera
    expect(esValida(item('a', 'sq', 55.6, 26), [], s, ctx).valida).toBe(true);
    // Centro a x=54.5: esquina izquierda en 49.5 < 50 -> SOBRE_CAMARA
    const r = esValida(item('b', 'sq', 54.5, 26), [], s, ctx);
    expect(r.valida).toBe(false);
    expect(r.motivo).toBe('SOBRE_CAMARA');
  });

  it('5: cadena larga vertical junto al borde: valida contenida, invalida al cruzar', () => {
    const chain: ElementShape = { hitbox: rectHitbox(8, 52), anchoMm: 8, altoMm: 52 };
    const s = shapes([['chain', chain]]);
    const ctx = buildSceneContext(device, 0.5);
    // Vertical (rotada 0 ya es 8 ancho x 52 alto): pegada al borde derecho
    const okItem = item('c1', 'chain', 73.6 - 4.05, 100);
    expect(esValida(okItem, [], s, ctx).valida).toBe(true);
    const badItem = item('c2', 'chain', 73.6 - 3.9, 100);
    const r = esValida(badItem, [], s, ctx);
    expect(r.valida).toBe(false);
    expect(r.motivo).toBe('FUERA_DE_FUNDA');
  });

  it('6: escena de 40 elementos validos en < 2 ms (benchmark, holgura x10 en CI)', () => {
    const s = shapes([['sq', { hitbox: rectHitbox(6, 6), anchoMm: 6, altoMm: 6 }]]);
    const items: PlacedItem[] = [];
    let n = 0;
    for (let y = 58; y <= 142 && n < 40; y += 9) {
      for (let x = 10; x <= 64 && n < 40; x += 9) {
        items.push(item(`i${n}`, 'sq', x, y, (n * 13) % 360));
        n++;
      }
    }
    expect(items.length).toBe(40);
    const start = performance.now();
    const result = validarEscena(items, s, device, 0.5);
    const elapsed = performance.now() - start;
    expect([...result.values()].every((r) => r.valida)).toBe(true);
    expect(elapsed).toBeLessThan(20);
  });

  it('7: determinismo: mismas entradas, mismo resultado', () => {
    const s = shapes([['heart', heartShape]]);
    const items = [item('a', 'heart', 30, 100, 33.3), item('b', 'heart', 45, 110, 210.7)];
    const r1 = validarEscena(items, s, device, 0.5);
    const r2 = validarEscena(items, s, device, 0.5);
    expect(JSON.stringify([...r1.entries()])).toBe(JSON.stringify([...r2.entries()]));
  });
});

describe('contorno y hitboxes derivadas', () => {
  it('el contorno tiene 28 vertices (7 por esquina, SS8.2)', () => {
    expect(roundedRectPolygon(73.6, 149.6, 11)).toHaveLength(28);
  });

  it('recipeHitbox produce convexos con max. 16 vertices por parte (SS11.6)', () => {
    for (const recipe of ['heart-extrude', 'star-extrude', 'bow-3d', 'butterfly-3d', 'moon-extrude']) {
      const hitbox = recipeHitbox(recipe, 12, 12);
      expect(hitbox.length).toBeGreaterThan(0);
      for (const part of hitbox) {
        expect(part.length).toBeGreaterThanOrEqual(3);
        expect(part.length).toBeLessThanOrEqual(16);
      }
    }
  });

  it('la rotacion invalida poses que eran validas (reversion de SS26.3)', () => {
    const bar: ElementShape = { hitbox: rectHitbox(30, 6), anchoMm: 30, altoMm: 6 };
    const sq: ElementShape = { hitbox: rectHitbox(10, 10), anchoMm: 10, altoMm: 10 };
    const s = shapes([
      ['bar', bar],
      ['sq', sq],
    ]);
    const ctx = buildSceneContext(device, 0.5);
    const others = [item('sq1', 'sq', 36, 80)];
    expect(esValida(item('b1', 'bar', 36, 95), others, s, ctx).valida).toBe(true);
    expect(esValida(item('b1', 'bar', 36, 95, 90), others, s, ctx).valida).toBe(false);
  });
});
