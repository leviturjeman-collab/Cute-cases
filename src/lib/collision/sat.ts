import { aabbOverlap, decomposeConvex, polygonAABB } from './geometry';
import type { Polygon, Vec2 } from './types';

/**
 * SAT (Separating Axis Theorem) para pares de polígonos CONVEXOS (§6.6).
 *
 * Con margen de seguridad m: se consideran en colisión si no existe ningún eje
 * con separación >= m. Nota: en configuraciones vértice-vértice el hueco máximo
 * por ejes subestima la distancia real, lo que hace el test ligeramente MÁS
 * estricto que la distancia euclídea — conservador en la dirección segura.
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
    axes.push({ x: -ey / len, y: ex / len }); // normal unitaria del lado
  }
  return axes;
}

/** ¿Colisionan dos polígonos convexos considerando el margen (mm)? */
export function convexPolygonsCollide(a: Polygon, b: Polygon, marginMm: number): boolean {
  for (const axis of [...axesOf(a), ...axesOf(b)]) {
    const pa = projectOntoAxis(a, axis);
    const pb = projectOntoAxis(b, axis);
    const gap = Math.max(pb.min - pa.max, pa.min - pb.max);
    if (gap >= marginMm) return false; // eje separador con margen suficiente
  }
  return true;
}

/**
 * Colisión entre dos polígonos simples cualesquiera (cóncavos permitidos):
 * broad-phase AABB inflada con el margen + SAT sobre las partes convexas.
 */
export function polygonsCollide(a: Polygon, b: Polygon, marginMm: number): boolean {
  if (a.length < 3 || b.length < 3) return false;
  if (!aabbOverlap(polygonAABB(a), polygonAABB(b), marginMm)) return false;
  const partsA = decomposeConvex(a);
  const partsB = decomposeConvex(b);
  for (const pa of partsA) {
    for (const pb of partsB) {
      if (!aabbOverlap(polygonAABB(pa), polygonAABB(pb), marginMm)) continue;
      if (convexPolygonsCollide(pa, pb, marginMm)) return true;
    }
  }
  return false;
}
