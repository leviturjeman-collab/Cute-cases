import type { AABB, Polygon, Vec2 } from './types';

const EPS = 1e-9;

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Rota un polígono (origen = centro) y lo traslada a (xMm, yMm). */
export function transformPolygon(poly: Polygon, xMm: number, yMm: number, rotDeg: number): Polygon {
  const rad = degToRad(rotDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return poly.map((p) => ({
    x: xMm + p.x * cos - p.y * sin,
    y: yMm + p.x * sin + p.y * cos,
  }));
}

export function polygonAABB(poly: Polygon): AABB {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Broad-phase: ¿se solapan dos AABB infladas con el margen? */
export function aabbOverlap(a: AABB, b: AABB, marginMm: number): boolean {
  return (
    a.minX - marginMm < b.maxX &&
    a.maxX + marginMm > b.minX &&
    a.minY - marginMm < b.maxY &&
    a.maxY + marginMm > b.minY
  );
}

function cross(o: Vec2, a: Vec2, b: Vec2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** ¿Es convexo el polígono? (tolerante a vértices colineales) */
export function isConvex(poly: Polygon): boolean {
  const n = poly.length;
  if (n < 4) return true;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const o = poly[i]!;
    const a = poly[(i + 1) % n]!;
    const b = poly[(i + 2) % n]!;
    const c = cross(o, a, b);
    if (Math.abs(c) < EPS) continue;
    const s = Math.sign(c);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** Área con signo (positiva si el polígono está en sentido antihorario en ejes y-abajo). */
export function signedArea(poly: Polygon): number {
  let area = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % n]!;
    area += p.x * q.y - q.x * p.y;
  }
  return area / 2;
}

function pointInTriangle(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
  const d1 = cross(a, b, p);
  const d2 = cross(b, c, p);
  const d3 = cross(c, a, p);
  const hasNeg = d1 < -EPS || d2 < -EPS || d3 < -EPS;
  const hasPos = d1 > EPS || d2 > EPS || d3 > EPS;
  return !(hasNeg && hasPos);
}

/**
 * Descompone un polígono simple (posiblemente cóncavo) en triángulos (ear clipping).
 * Los cóncavos se descomponen en convexos en build-time del asset (§6.6); esta
 * implementación cubre también la validación en runtime para hitboxes de admin.
 */
export function decomposeConvex(poly: Polygon): Polygon[] {
  if (poly.length < 3) return [];
  if (isConvex(poly)) return [poly];

  // Normalizar orientación a antihoraria (área negativa con y hacia abajo)
  const pts = signedArea(poly) > 0 ? [...poly].reverse() : [...poly];
  const triangles: Polygon[] = [];
  const indices = pts.map((_, i) => i);

  let guard = pts.length * pts.length;
  while (indices.length > 3 && guard-- > 0) {
    let earFound = false;
    for (let i = 0; i < indices.length; i++) {
      const iPrev = indices[(i - 1 + indices.length) % indices.length]!;
      const iCurr = indices[i]!;
      const iNext = indices[(i + 1) % indices.length]!;
      const a = pts[iPrev]!;
      const b = pts[iCurr]!;
      const c = pts[iNext]!;
      // Vértice convexo (orientación antihoraria con y-abajo → cross negativo)
      if (cross(a, b, c) > -EPS) continue;
      // Ninguna otra punta dentro del triángulo candidato
      let contains = false;
      for (const j of indices) {
        if (j === iPrev || j === iCurr || j === iNext) continue;
        if (pointInTriangle(pts[j]!, a, b, c)) {
          contains = true;
          break;
        }
      }
      if (contains) continue;
      triangles.push([a, b, c]);
      indices.splice(i, 1);
      earFound = true;
      break;
    }
    if (!earFound) break; // polígono degenerado: devolver lo que haya
  }
  if (indices.length === 3) {
    triangles.push([pts[indices[0]!]!, pts[indices[1]!]!, pts[indices[2]!]!]);
  }
  return triangles.length > 0 ? triangles : [poly];
}

/** ¿Está el punto dentro del polígono? (ray casting, borde cuenta como dentro) */
export function pointInPolygon(p: Vec2, poly: Polygon): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    // ¿Sobre el segmento?
    const d = cross(a, b, p);
    if (
      Math.abs(d) < EPS &&
      p.x >= Math.min(a.x, b.x) - EPS &&
      p.x <= Math.max(a.x, b.x) + EPS &&
      p.y >= Math.min(a.y, b.y) - EPS &&
      p.y <= Math.max(a.y, b.y) + EPS
    ) {
      return true;
    }
    if (a.y > p.y !== b.y > p.y) {
      const xIntersect = ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
      if (p.x < xIntersect) inside = !inside;
    }
  }
  return inside;
}

/**
 * ¿Está el punto dentro del rectángulo redondeado de la funda?
 * Rectángulo: (0,0)–(ancho, alto) con esquinas de radio r.
 */
export function pointInRoundedRect(
  p: Vec2,
  anchoMm: number,
  altoMm: number,
  radioMm: number,
): boolean {
  if (p.x < 0 || p.y < 0 || p.x > anchoMm || p.y > altoMm) return false;
  const r = Math.min(radioMm, anchoMm / 2, altoMm / 2);
  // Centros de las 4 esquinas
  const cx = p.x < r ? r : p.x > anchoMm - r ? anchoMm - r : null;
  const cy = p.y < r ? r : p.y > altoMm - r ? altoMm - r : null;
  if (cx === null || cy === null) return true; // fuera de la zona de esquina
  const dx = p.x - cx;
  const dy = p.y - cy;
  return dx * dx + dy * dy <= r * r + EPS;
}
