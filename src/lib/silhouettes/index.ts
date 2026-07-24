import { decomposeConvex } from '@/lib/collision/geometry';
import { rectHitbox } from '@/lib/collision';
import type { Hitbox, Polygon, Vec2 } from '@/lib/collision';

/**
 * Siluetas 2D por receta (SS10.1): cada receta genera el contorno del plano
 * XY del que el seed deriva la hitbox (SS11.6): contorno -> Douglas-Peucker
 * (tolerancia 0,4 mm) -> max. 16 vertices -> descomposicion en convexos.
 * Cadenas y letras usan rectangulo ajustado (aceptado explicitamente).
 * TS puro y determinista: sin three.js, sin Math.random.
 */

// ---------- primitivas ----------

export function ellipseOutline(w: number, h: number, n = 20): Polygon {
  const pts: Polygon = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI;
    pts.push({ x: (w / 2) * Math.cos(t), y: (h / 2) * Math.sin(t) });
  }
  return pts;
}

/** Corazon con dos curvas Bezier cubicas (SS10.2 heart-extrude), muestreado. */
export function heartOutline(w: number, h: number, samples = 24): Polygon {
  // Parametrizacion clasica del corazon, normalizada y escalada a w x h
  const raw: Polygon = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * 2 * Math.PI;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push({ x, y });
  }
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const sx = w / (Math.max(...xs) - Math.min(...xs));
  const sy = h / (Math.max(...ys) - Math.min(...ys));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return raw.map((p) => ({ x: (p.x - cx) * sx, y: (p.y - cy) * sy }));
}

/** Estrella de 5 puntas, radios 1 : 0.45 (SS10.2). */
export function starOutline(size: number, points = 5, innerRatio = 0.45): Polygon {
  const outer = size / 2;
  const inner = outer * innerRatio;
  const pts: Polygon = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * 2 * Math.PI - Math.PI / 2;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return pts;
}

/** Creciente por diferencia de dos circulos desplazados (SS10.2 moon-extrude). */
export function moonOutline(w: number, h: number): Polygon {
  const R = h / 2;
  const offset = w * 0.32;
  const pts: Polygon = [];
  // Arco exterior (izquierda), de arriba a abajo
  for (let i = 0; i <= 12; i++) {
    const t = Math.PI / 2 + (i / 12) * Math.PI;
    pts.push({ x: R * Math.cos(t) + w * 0.1, y: R * Math.sin(t) });
  }
  // Arco interior (borde del circulo restado), de abajo a arriba
  for (let i = 1; i < 12; i++) {
    const t = (3 * Math.PI) / 2 - (i / 12) * Math.PI;
    pts.push({ x: R * 0.72 * Math.cos(t) + offset - R * 0.15, y: R * 0.82 * Math.sin(t) });
  }
  return pts;
}

/** Lazo: dos lobulos + nudo (SS10.2 bow-3d/bow-flat). */
export function bowOutline(w: number, h: number): Polygon {
  const u = (x: number, y: number): Vec2 => ({ x: x * w, y: y * h });
  return [
    u(-0.5, -0.32), u(-0.28, -0.42), u(-0.1, -0.16), u(0.1, -0.16), u(0.28, -0.42),
    u(0.5, -0.32), u(0.42, 0.0), u(0.5, 0.32), u(0.28, 0.42), u(0.1, 0.16),
    u(-0.1, 0.16), u(-0.28, 0.42), u(-0.5, 0.32), u(-0.42, 0.0),
  ];
}

/** Mariposa: cuatro alas + cuerpo (silueta compuesta simplificada). */
export function butterflyOutline(w: number, h: number): Polygon {
  const u = (x: number, y: number): Vec2 => ({ x: x * w, y: y * h });
  return [
    u(0, -0.5), u(0.22, -0.46), u(0.5, -0.28), u(0.46, -0.02), u(0.24, 0.02),
    u(0.42, 0.24), u(0.32, 0.48), u(0.08, 0.4), u(0, 0.5),
    u(-0.08, 0.4), u(-0.32, 0.48), u(-0.42, 0.24), u(-0.24, 0.02),
    u(-0.46, -0.02), u(-0.5, -0.28), u(-0.22, -0.46),
  ];
}

/** Ola con dos crestas (SS10.2 wave-flat). */
export function waveOutline(w: number, h: number): Polygon {
  const u = (x: number, y: number): Vec2 => ({ x: x * w, y: y * h });
  return [
    u(-0.5, 0.5), u(-0.5, 0.05), u(-0.38, -0.35), u(-0.22, -0.1), u(-0.3, 0.12),
    u(-0.12, -0.02), u(0.02, -0.5), u(0.2, -0.18), u(0.1, 0.05),
    u(0.3, -0.08), u(0.5, 0.18), u(0.5, 0.5),
  ];
}

/** Casco convexo (Andrew monotone chain). */
export function convexHull(points: Vec2[]): Polygon {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const crossP = (o: Vec2, a: Vec2, b: Vec2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec2[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && crossP(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && crossP(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Simplificacion Douglas-Peucker sobre poligono cerrado (SS11.6). */
export function simplifyPolygon(poly: Polygon, epsilonMm: number): Polygon {
  if (poly.length <= 4) return poly;
  const perpDist = (p: Vec2, a: Vec2, b: Vec2): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
  };
  const simplifySeg = (pts: Vec2[]): Vec2[] => {
    if (pts.length < 3) return pts;
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    let maxDist = 0;
    let maxIdx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpDist(pts[i]!, first, last);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > epsilonMm) {
      const left = simplifySeg(pts.slice(0, maxIdx + 1));
      const right = simplifySeg(pts.slice(maxIdx));
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  };
  const result = simplifySeg([...poly, poly[0]!]).slice(0, -1);
  return result.length >= 3 ? result : poly;
}

/** Reduce a un maximo de vertices conservando la forma (submuestreo uniforme). */
function capVertices(poly: Polygon, max: number): Polygon {
  if (poly.length <= max) return poly;
  const out: Polygon = [];
  for (let i = 0; i < max; i++) {
    out.push(poly[Math.floor((i / max) * poly.length)]!);
  }
  return out;
}

// ---------- silueta por receta ----------

/**
 * Silueta canonica de una receta escalada a ancho x alto mm, origen centro.
 * Las recetas compuestas usan el casco convexo de sus partes (aproximacion
 * aceptada de la silueta para colision).
 */
export function recipeOutline(recipe: string, anchoMm: number, altoMm: number): Polygon {
  switch (recipe) {
    case 'heart-extrude':
    case 'heart-flat':
    case 'heart-outline-flat':
      return heartOutline(anchoMm, altoMm);
    case 'star-extrude':
    case 'star-flat':
      return starOutline(Math.max(anchoMm, altoMm));
    case 'sun-extrude':
      return starOutline(Math.max(anchoMm, altoMm), 12, 0.72);
    case 'moon-extrude':
      return moonOutline(anchoMm, altoMm);
    case 'shooting-star-3d': {
      // Estrella + estela: hull de estrella desplazada y cola rectangular
      const star = starOutline(altoMm).map((p) => ({ x: p.x + anchoMm / 2 - altoMm / 2, y: p.y }));
      const tail: Polygon = [
        { x: -anchoMm / 2, y: -altoMm * 0.18 },
        { x: 0, y: -altoMm * 0.3 },
        { x: 0, y: 0.3 * altoMm },
        { x: -anchoMm / 2, y: altoMm * 0.18 },
      ];
      return convexHull([...star, ...tail]);
    }
    case 'flower-3d':
    case 'flower-flat':
      return ellipseOutline(anchoMm, altoMm, 16);
    case 'tulip-3d':
    case 'icecream-3d':
      // copa/cono arriba-abajo: hull de elipse superior + punta inferior
      return convexHull([
        ...ellipseOutline(anchoMm, altoMm * 0.55, 12).map((p) => ({ x: p.x, y: p.y - altoMm * 0.2 })),
        { x: 0, y: altoMm / 2 },
        { x: -anchoMm * 0.18, y: altoMm * 0.1 },
        { x: anchoMm * 0.18, y: altoMm * 0.1 },
      ]);
    case 'bouquet-flat':
      return convexHull([
        ...ellipseOutline(anchoMm, altoMm * 0.6, 12).map((p) => ({ x: p.x, y: p.y - altoMm * 0.2 })),
        { x: -anchoMm * 0.12, y: altoMm / 2 },
        { x: anchoMm * 0.12, y: altoMm / 2 },
      ]);
    case 'bow-3d':
    case 'bow-flat':
    case 'bow-outline-flat':
      return bowOutline(anchoMm, altoMm);
    case 'cherry-3d':
      return convexHull([
        ...ellipseOutline(anchoMm * 0.55, altoMm * 0.5, 10).map((p) => ({
          x: p.x - anchoMm * 0.22,
          y: p.y + altoMm * 0.25,
        })),
        ...ellipseOutline(anchoMm * 0.55, altoMm * 0.5, 10).map((p) => ({
          x: p.x + anchoMm * 0.22,
          y: p.y + altoMm * 0.18,
        })),
        { x: anchoMm * 0.1, y: -altoMm / 2 },
      ]);
    case 'strawberry-3d':
      return convexHull([
        ...ellipseOutline(anchoMm, altoMm * 0.85, 14).map((p) => ({ x: p.x, y: p.y + altoMm * 0.07 })),
        { x: -anchoMm * 0.3, y: -altoMm / 2 },
        { x: anchoMm * 0.3, y: -altoMm / 2 },
      ]);
    case 'lemon-3d':
      return convexHull([
        ...ellipseOutline(anchoMm * 0.86, altoMm, 14),
        { x: -anchoMm / 2, y: 0 },
        { x: anchoMm / 2, y: 0 },
      ]);
    case 'apple-3d':
      return ellipseOutline(anchoMm, altoMm, 16);
    case 'banana-3d': {
      // Arco curvado: muestrear toro parcial 240 grados
      const pts: Polygon = [];
      const R = altoMm * 0.38;
      const thick = anchoMm * 0.42;
      for (let i = 0; i <= 10; i++) {
        const t = (-2 * Math.PI) / 3 + (i / 10) * ((4 * Math.PI) / 3);
        pts.push({ x: (R + thick / 2) * Math.sin(t) * (anchoMm / altoMm) * 1.6, y: -(R + thick / 2) * Math.cos(t) });
      }
      for (let i = 10; i >= 0; i--) {
        const t = (-2 * Math.PI) / 3 + (i / 10) * ((4 * Math.PI) / 3);
        pts.push({ x: (R - thick / 2) * Math.sin(t) * (anchoMm / altoMm) * 1.6, y: -(R - thick / 2) * Math.cos(t) });
      }
      return convexHull(pts);
    }
    case 'watermelon-flat': {
      // Semicirculo con base recta
      const pts: Polygon = [];
      for (let i = 0; i <= 12; i++) {
        const t = Math.PI + (i / 12) * Math.PI;
        pts.push({ x: (anchoMm / 2) * Math.cos(t), y: (altoMm * 0.9) * Math.sin(t) + altoMm * 0.4 });
      }
      return pts;
    }
    case 'pineapple-flat':
      return convexHull([
        ...ellipseOutline(anchoMm, altoMm * 0.68, 14).map((p) => ({ x: p.x, y: p.y + altoMm * 0.16 })),
        { x: -anchoMm * 0.28, y: -altoMm / 2 },
        { x: 0, y: -altoMm * 0.34 },
        { x: anchoMm * 0.28, y: -altoMm / 2 },
      ]);
    case 'bear-3d':
    case 'cat-3d':
    case 'bunny-3d':
    case 'catface-flat':
      // Cabeza + orejas: hull de las partes
      return convexHull([
        ...ellipseOutline(anchoMm, altoMm * 0.78, 14).map((p) => ({ x: p.x, y: p.y + altoMm * 0.11 })),
        { x: -anchoMm * 0.38, y: -altoMm / 2 },
        { x: anchoMm * 0.38, y: -altoMm / 2 },
      ]);
    case 'butterfly-3d':
    case 'butterfly-flat':
      return butterflyOutline(anchoMm, altoMm);
    case 'bee-3d':
      return ellipseOutline(anchoMm, altoMm, 14);
    case 'paw-flat':
      return ellipseOutline(anchoMm, altoMm, 12);
    case 'umbrella-3d':
      return convexHull([
        ...ellipseOutline(anchoMm, altoMm * 0.6, 12).map((p) => ({ x: p.x, y: p.y - altoMm * 0.2 })),
        { x: 0, y: altoMm / 2 },
      ]);
    case 'shell-3d':
      return convexHull([
        ...ellipseOutline(anchoMm, altoMm * 0.8, 14).map((p) => ({ x: p.x, y: p.y - altoMm * 0.1 })),
        { x: 0, y: altoMm / 2 },
      ]);
    case 'constellation-flat':
    case 'wave-flat':
      return recipe === 'wave-flat'
        ? waveOutline(anchoMm, altoMm)
        : rectOutline(anchoMm, altoMm);
    case 'chain-segment':
    case 'pearl-strand':
    case 'chain-flat':
    case 'letter-extrude':
    case 'letter-flat':
      // Rectangulo ajustado, aceptado explicitamente (SS11.6)
      return rectOutline(anchoMm, altoMm);
    default:
      return rectOutline(anchoMm, altoMm);
  }
}

function rectOutline(w: number, h: number): Polygon {
  return [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 },
  ];
}

/**
 * Hitbox de una receta (SS11.6): silueta -> Douglas-Peucker (0,4 mm) ->
 * max. 16 vertices -> descomposicion en convexos.
 */
export function recipeHitbox(recipe: string, anchoMm: number, altoMm: number): Hitbox {
  const outline = recipeOutline(recipe, anchoMm, altoMm);
  if (outline.length <= 4) return rectHitbox(anchoMm, altoMm);
  const simplified = capVertices(simplifyPolygon(outline, 0.4), 16);
  const parts = decomposeConvex(simplified);
  return parts.length > 0 ? parts : rectHitbox(anchoMm, altoMm);
}
