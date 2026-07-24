import { describe, expect, it } from 'vitest';
import { computeFitDistance, computeFitTargetY } from '../src/editor/camera/fit';

/**
 * E1 (anexo v4.3): valores tabulados de la demostracion. Con fov vertical de
 * 32 grados, la altura visible a distancia d es 0,5734·d; ver la funda entera
 * exige d >= 1,744·alto, y con margen del 12%, ~1,95·alto.
 */

const iphone15pro = { anchoMm: 73.6, altoMm: 149.6 };
const portrait = { width: 390, height: 700 };

describe('computeFitDistance (E1)', () => {
  it('sin occlusions: ~1,95 veces el alto (1,744 x margen 1,12)', () => {
    const d = computeFitDistance(iphone15pro, portrait, { topPx: 0, bottomPx: 0 });
    expect(d / iphone15pro.altoMm).toBeCloseTo(1.744 * 1.12, 2);
  });

  it('la altura visible a la distancia de encaje cubre la funda con aire', () => {
    const d = computeFitDistance(iphone15pro, portrait, { topPx: 0, bottomPx: 0 });
    const visibleH = 2 * d * Math.tan((16 * Math.PI) / 180);
    expect(visibleH).toBeGreaterThan(iphone15pro.altoMm);
    // El margen 1,12 se traduce en ~12% de aire
    expect(visibleH / iphone15pro.altoMm).toBeCloseTo(1.12, 2);
  });

  it('la configuracion antigua (1,15·alto e incluso 1,44·alto) recortaba', () => {
    const old = 1.44 * iphone15pro.altoMm; // zoom al maximo alejado del bundle
    const visibleH = 2 * old * Math.tan((16 * Math.PI) / 180);
    expect(visibleH).toBeLessThan(iphone15pro.altoMm); // 82% < 100%
    expect(visibleH / iphone15pro.altoMm).toBeCloseTo(0.824, 2);
  });

  it('con el sheet ocluyendo 220 px, la distancia crece para el area util', () => {
    const free = computeFitDistance(iphone15pro, portrait, { topPx: 0, bottomPx: 0 });
    const occluded = computeFitDistance(iphone15pro, portrait, { topPx: 0, bottomPx: 220 });
    expect(occluded).toBeGreaterThan(free);
    // area util 480/700 => distancia x (700/480)
    expect(occluded / free).toBeCloseTo(700 / 480, 2);
  });

  it('landscape ancho y bajo: manda el encaje vertical del area util', () => {
    const landscape = { width: 844, height: 390 };
    const d = computeFitDistance(iphone15pro, landscape, { topPx: 0, bottomPx: 0 });
    const visibleH = 2 * d * Math.tan((16 * Math.PI) / 180);
    expect(visibleH).toBeGreaterThanOrEqual(iphone15pro.altoMm);
  });

  it('modelo ancho en viewport estrecho: manda el encaje horizontal', () => {
    const wide = { anchoMm: 200, altoMm: 100 };
    const d = computeFitDistance(wide, { width: 320, height: 800 });
    const visibleW = 2 * d * Math.tan((16 * Math.PI) / 180) * (320 / 800);
    expect(visibleW).toBeGreaterThanOrEqual(wide.anchoMm);
  });
});

describe('computeFitTargetY (E1.1)', () => {
  it('sheet de 220 px abajo: el target baja 110 px en unidades de mundo', () => {
    const d = 300;
    const ty = computeFitTargetY(d, portrait, { topPx: 0, bottomPx: 220 });
    const worldPerPx = (2 * d * Math.tan((16 * Math.PI) / 180)) / portrait.height;
    expect(ty).toBeCloseTo(-110 * worldPerPx, 5);
    expect(ty).toBeLessThan(0);
  });

  it('sin occlusions no hay desplazamiento', () => {
    expect(computeFitTargetY(300, portrait)).toBeCloseTo(0, 10);
  });
});
