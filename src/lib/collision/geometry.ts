import {
  CORNER_SEGMENTS,
  type AABB,
  type Polygon,
  type Vec2,
} from './types';

const EPS = 1e-9;

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Rota (origen = centro) y traslada un poligono a (xMm, yMm). */
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

export function aabbOverlap(a: AABB, b: AABB, marginMm: number): boolean {
  return (
    a.minX - marginMm < b.maxX &&
    a.maxX + marginMm > b.minX &&
    a.minY - marginMm < b.maxY &&
    a.maxY + marginMm > b.minY
  );
}

export function cross(o: Vec2, a: Vec2, b: Vec2): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Es convexo? (tolerante a colineales) */
export function isConvex(poly: Polygon): boolean {
  const n = poly.length;
  if (n < 4) return true;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const c = cross(poly[i]!, poly[(i + 1) % n]!, poly[(i + 2) % n]!);
    if (Math.abs(c) < EPS) continue;
    const s = Math.sign(c);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

export function signedArea(poly: Polygon): number {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
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
 * Descomposicion de un poligono simple (posiblemente concavo) en convexos
 * via ear clipping (SS8.2: los concavos se descomponen en build del asset).
 */
export function decomposeConvex(poly: Polygon): Polygon[] {
  if (poly.length < 3) return [];
  if (isConvex(poly)) return [poly];

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
      if (cross(a, b, c) > -EPS) continue;
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
    if (!earFound) break;
  }
  if (indices.length === 3) {
    triangles.push([pts[indices[0]!]!, pts[indices[1]!]!, pts[indices[2]!]!]);
  }
  return triangles.length > 0 ? triangles : [poly];
}

/** Punto dentro de poligono (ray casting; borde cuenta como dentro). */
export function pointInPolygon(p: Vec2, poly: Polygon): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    const d = cross(a, b, p);
    if (
      Math.abs(d) < 1e-7 &&
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

/** Interseccion propia de segmentos (excluye toques en extremos exactos). */
export function segmentsIntersect(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) &&
      ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) {
    return true;
  }
  return false;
}

/**
 * Contorno de la funda (SS8.2): rectangulo redondeado aproximado como
 * poligono de 4 x CORNER_SEGMENTS vertices (28 con 7 por esquina).
 */
export function roundedRectPolygon(anchoMm: number, altoMm: number, radioMm: number): Polygon {
  const r = Math.min(radioMm, anchoMm / 2, altoMm / 2);
  const pts: Polygon = [];
  // Centros de esquina en orden horario empezando por la superior izquierda
  const corners: { cx: number; cy: number; start: number }[] = [
    { cx: r, cy: r, start: Math.PI }, // sup-izq: 180 -> 270
    { cx: anchoMm - r, cy: r, start: 1.5 * Math.PI }, // sup-der: 270 -> 360
    { cx: anchoMm - r, cy: altoMm - r, start: 0 }, // inf-der: 0 -> 90
    { cx: r, cy: altoMm - r, start: 0.5 * Math.PI }, // inf-izq: 90 -> 180
  ];
  for (const { cx, cy, start } of corners) {
    for (let i = 0; i < CORNER_SEGMENTS; i++) {
      const t = start + (i / (CORNER_SEGMENTS - 1)) * (Math.PI / 2);
      pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
    }
  }
  return pts;
}

/**
 * Inflado de un poligono convexo desplazando cada vertice a lo largo de la
 * bisectriz de sus aristas (exacto para rectangulos; aproximacion valida
 * para las zonas de camara del admin). SS8.2: camara inflada 1 mm.
 */
export function inflateConvexPolygon(poly: Polygon, byMm: number): Polygon {
  const n = poly.length;
  if (n < 3 || byMm === 0) return poly;
  const ccw = signedArea(poly) > 0;
  const out: Polygon = [];
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n]!;
    const curr = poly[i]!;
    const next = poly[(i + 1) % n]!;
    const e1 = normalize({ x: curr.x - prev.x, y: curr.y - prev.y });
    const e2 = normalize({ x: next.x - curr.x, y: next.y - curr.y });
    // Normales exteriores (dependen de la orientacion)
    const n1 = ccw ? { x: e1.y, y: -e1.x } : { x: -e1.y, y: e1.x };
    const n2 = ccw ? { x: e2.y, y: -e2.x } : { x: -e2.y, y: e2.x };
    const bis = normalize({ x: n1.x + n2.x, y: n1.y + n2.y });
    const dot = bis.x * n1.x + bis.y * n1.y;
    const scale = dot > 0.1 ? byMm / dot : byMm;
    out.push({ x: curr.x + bis.x * scale, y: curr.y + bis.y * scale });
  }
  return out;
}

function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  return len < 1e-12 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}
