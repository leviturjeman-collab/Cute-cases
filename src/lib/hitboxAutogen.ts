'use client';

import type { Polygon, Vec2 } from '@/lib/collision';

/**
 * Autogeneración de hitbox desde la silueta/alfa de un PNG (§6.6, §11):
 * se muestrea el canal alfa, se calcula el casco convexo de los píxeles
 * opacos y se simplifica con Douglas-Peucker. El resultado (en mm, origen =
 * centro del elemento) es ajustable a mano en el editor de vértices.
 */

function convexHull(points: Vec2[]): Vec2[] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec2[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function perpendicularDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

/** Simplificación Douglas-Peucker sobre una polilínea cerrada. */
export function simplifyPolygon(poly: Polygon, epsilonMm: number): Polygon {
  if (poly.length <= 4) return poly;
  const simplifySegment = (pts: Vec2[]): Vec2[] => {
    if (pts.length < 3) return pts;
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    let maxDist = 0;
    let maxIdx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpendicularDistance(pts[i]!, first, last);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > epsilonMm) {
      const left = simplifySegment(pts.slice(0, maxIdx + 1));
      const right = simplifySegment(pts.slice(maxIdx));
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  };
  const result = simplifySegment([...poly, poly[0]!]).slice(0, -1);
  return result.length >= 3 ? result : poly;
}

/**
 * Genera la hitbox (8–16 vértices) desde un PNG con alfa. anchoMm/altoMm son
 * las dimensiones físicas reales del elemento.
 */
export async function hitboxFromImage(
  file: File,
  anchoMm: number,
  altoMm: number,
): Promise<Polygon> {
  const bitmap = await createImageBitmap(file);
  const SAMPLE = 96;
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, SAMPLE, SAMPLE);
  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);

  const opaque: Vec2[] = [];
  for (let y = 0; y < SAMPLE; y++) {
    for (let x = 0; x < SAMPLE; x++) {
      const alpha = data[(y * SAMPLE + x) * 4 + 3]!;
      if (alpha > 32) opaque.push({ x, y });
    }
  }
  if (opaque.length < 3) {
    // sin silueta: rectángulo completo
    return [
      { x: -anchoMm / 2, y: -altoMm / 2 },
      { x: anchoMm / 2, y: -altoMm / 2 },
      { x: anchoMm / 2, y: altoMm / 2 },
      { x: -anchoMm / 2, y: altoMm / 2 },
    ];
  }
  const hull = convexHull(opaque);
  const simplified = simplifyPolygon(hull, SAMPLE * 0.02);
  // px muestreados → mm centrados
  return simplified.map((p) => ({
    x: Math.round(((p.x / SAMPLE) * anchoMm - anchoMm / 2) * 10) / 10,
    y: Math.round(((p.y / SAMPLE) * altoMm - altoMm / 2) * 10) / 10,
  }));
}
