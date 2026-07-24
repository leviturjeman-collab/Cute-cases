import { aabbOverlap, polygonAABB } from './geometry';
import type { Polygon, Vec2 } from './types';

/**
 * SAT clasico (SS8.3): proyeccion sobre las normales de ambos poligonos con
 * el margen de seguridad aplicado como inflado de proyecciones. Con margen m,
 * dos poligonos se consideran en colision si ningun eje presenta una
 * separacion >= m (conservador en la direccion segura).
 */

function projectOntoAxis(poly: Polygon, axis: Vec2): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of poly) {
    const d = p.x * axis.x + p.y * axis.y;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

function axesOf(poly: Polygon): Vec2[] {
  const axes: Vec2[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const len = Math.hypot(ex, ey);
    if (len < 1e-12) continue;
    axes.push({ x: -ey / len, y: ex / len });
  }
  return axes;
}

/** Colisionan dos poligonos convexos considerando el margen (mm)? */
export function convexCollide(a: Polygon, b: Polygon, marginMm: number): boolean {
  for (const axis of [...axesOf(a), ...axesOf(b)]) {
    const pa = projectOntoAxis(a, axis);
    const pb = projectOntoAxis(b, axis);
    const gap = Math.max(pb.min - pa.max, pa.min - pb.max);
    if (gap >= marginMm) return false;
  }
  return true;
}

/** Colision entre dos conjuntos de poligonos convexos con broad-phase AABB. */
export function hitboxesCollide(a: Polygon[], b: Polygon[], marginMm: number): boolean {
  for (const pa of a) {
    const aabbA = polygonAABB(pa);
    for (const pb of b) {
      if (!aabbOverlap(aabbA, polygonAABB(pb), marginMm)) continue;
      if (convexCollide(pa, pb, marginMm)) return true;
    }
  }
  return false;
}
