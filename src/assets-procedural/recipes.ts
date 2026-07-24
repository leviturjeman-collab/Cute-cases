import * as THREE from 'three';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { finishMaterial } from './materials';
import {
  bowOutline,
  butterflyOutline,
  heartOutline,
  moonOutline,
  starOutline,
  waveOutline,
} from '@/lib/silhouettes';
import type { Vec2 } from '@/lib/collision';

/**
 * Recetas procedurales (SS10.2). Reglas comunes (SS10.1): 1 unidad = 1 mm;
 * origen en el centro del elemento; base apoyada en z = 0 (charms crecen
 * hacia +z; stickers, extrusion 0,15 mm); deterministas; sin texturas de
 * imagen. Presupuesto: <= 5.000 triangulos charm, <= 500 sticker.
 */

export interface ElementSpec {
  anchoMm: number;
  altoMm: number;
  profundidadMm?: number | null;
  acabado: string;
  colores: string[];
  letraChar?: string | null;
  recipeParams?: Record<string, unknown> | null;
}

const STICKER_DEPTH = 0.15;

// ---------- utilidades ----------

function shapeFrom(points: Vec2[]): THREE.Shape {
  const s = new THREE.Shape();
  points.forEach((p, i) => {
    // El plano de silueta usa y hacia abajo; el mundo three usa y hacia arriba
    if (i === 0) s.moveTo(p.x, -p.y);
    else s.lineTo(p.x, -p.y);
  });
  s.closePath();
  return s;
}

function extrudeCharm(shape: THREE.Shape, depth: number, mat: THREE.Material, bevel = 0.4): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.4, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function extrudeSticker(shape: THREE.Shape, mat: THREE.Material): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: STICKER_DEPTH,
    bevelEnabled: false,
    curveSegments: 10,
  });
  return new THREE.Mesh(geo, mat);
}

function sphere(r: number, mat: THREE.Material, wSeg = 14, hSeg = 10): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, wSeg, hSeg), mat);
  m.castShadow = true;
  return m;
}

function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}

/** Corazon con dos Bezier cubicas (SS10.2). */
function heartShapeBezier(w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = 0;
  const top = h * 0.3;
  s.moveTo(x, top);
  s.bezierCurveTo(x, h * 0.48, -w * 0.5, h * 0.42, -w * 0.5, h * 0.06);
  s.bezierCurveTo(-w * 0.5, -h * 0.26, -w * 0.14, -h * 0.36, x, -h * 0.5);
  s.bezierCurveTo(w * 0.14, -h * 0.36, w * 0.5, -h * 0.26, w * 0.5, h * 0.06);
  s.bezierCurveTo(w * 0.5, h * 0.42, x, h * 0.48, x, top);
  return s;
}

// ---------- fuente de letras ----------
// SS10.2 letter-extrude: typeface JSON incluida en el repo
// (/public/fonts/letters.typeface.json). Se precarga en la fase de carga del
// editor (SS7.11); sustitucion futura por Poppins Bold sin cambios de logica.

let letterFont: Font | null = null;

export async function loadLetterFont(): Promise<void> {
  if (letterFont) return;
  const res = await fetch('/fonts/letters.typeface.json');
  const json = (await res.json()) as object;
  letterFont = new FontLoader().parse(json as never);
}

export function letterFontLoaded(): boolean {
  return letterFont !== null;
}

function letterMesh(spec: ElementSpec, flat: boolean): THREE.Group {
  const char = spec.letraChar ?? 'A';
  const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#D4AF37');
  const depth = flat ? STICKER_DEPTH : (spec.profundidadMm ?? 2.5);
  const baseChar = char === 'Ñ' ? 'N' : char;

  if (!letterFont) {
    // Fallback determinista si la fuente aun no esta cargada: bloque
    const g = extrudeCharm(
      shapeFrom([
        { x: -spec.anchoMm / 2, y: -spec.altoMm / 2 },
        { x: spec.anchoMm / 2, y: -spec.altoMm / 2 },
        { x: spec.anchoMm / 2, y: spec.altoMm / 2 },
        { x: -spec.anchoMm / 2, y: spec.altoMm / 2 },
      ]),
      depth,
      mat,
      flat ? 0 : 0.2,
    );
    return group(g);
  }

  const geo = new TextGeometry(baseChar, {
    font: letterFont,
    size: spec.altoMm,
    depth: flat ? STICKER_DEPTH : Math.max(0.5, depth - 0.4),
    bevelEnabled: !flat,
    bevelThickness: flat ? 0 : 0.2,
    bevelSize: flat ? 0 : 0.2,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const width = bb.max.x - bb.min.x;
  const height = bb.max.y - bb.min.y;
  // Normalizar altura exacta a altoMm y centrar (SS10.2)
  const scale = spec.altoMm / height;
  geo.scale(scale, scale, 1);
  geo.computeBoundingBox();
  const bb2 = geo.boundingBox!;
  geo.translate(-(bb2.min.x + bb2.max.x) / 2, -(bb2.min.y + bb2.max.y) / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = !flat;
  const g = group(mesh);

  if (char === 'Ñ') {
    // Virgulilla: barra suave sobre la N
    const tilde = new THREE.Mesh(
      new THREE.CapsuleGeometry(spec.altoMm * 0.07, width * scale * 0.55, 3, 6),
      mat,
    );
    tilde.rotation.z = Math.PI / 2 - 0.18;
    tilde.position.set(0, spec.altoMm * 0.62, flat ? STICKER_DEPTH : depth / 2);
    tilde.castShadow = !flat;
    g.add(tilde);
    g.position.y = -spec.altoMm * 0.06;
  }
  return g;
}

// ---------- recetas ----------

type RecipeBuilder = (spec: ElementSpec) => THREE.Group;

const R: Record<string, RecipeBuilder> = {
  'heart-extrude': (spec) => {
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#E84393');
    const depth = spec.profundidadMm ?? 3;
    if ((spec.recipeParams as { doble?: boolean } | null)?.doble) {
      const w = spec.anchoMm * 0.55;
      const a = extrudeCharm(heartShapeBezier(w, spec.altoMm * 0.9), depth, mat);
      a.position.x = -spec.anchoMm * 0.22;
      const b = extrudeCharm(
        heartShapeBezier(w * 0.85, spec.altoMm * 0.78),
        depth * 0.9,
        finishMaterial(spec.acabado, spec.colores[1] ?? '#FFFFFF'),
      );
      b.position.set(spec.anchoMm * 0.22, -spec.altoMm * 0.05, 0);
      return group(a, b);
    }
    return group(extrudeCharm(heartShapeBezier(spec.anchoMm, spec.altoMm), depth, mat));
  },
  'heart-flat': (spec) =>
    group(extrudeSticker(heartShapeBezier(spec.anchoMm, spec.altoMm), finishMaterial(spec.acabado, spec.colores[0] ?? '#F4A7C3'))),
  'heart-outline-flat': (spec) => {
    const outer = heartShapeBezier(spec.anchoMm, spec.altoMm);
    const innerPts = heartOutline(spec.anchoMm - 4, spec.altoMm - 4);
    const hole = new THREE.Path();
    innerPts.forEach((p, i) => (i === 0 ? hole.moveTo(p.x, -p.y) : hole.lineTo(p.x, -p.y)));
    hole.closePath();
    outer.holes.push(hole);
    return group(extrudeSticker(outer, finishMaterial(spec.acabado, spec.colores[0] ?? '#E84393')));
  },
  'star-extrude': (spec) =>
    group(
      extrudeCharm(
        shapeFrom(starOutline(Math.max(spec.anchoMm, spec.altoMm))),
        spec.profundidadMm ?? 3,
        finishMaterial(spec.acabado, spec.colores[0] ?? '#D4AF37'),
        0.3,
      ),
    ),
  'star-flat': (spec) =>
    group(extrudeSticker(shapeFrom(starOutline(Math.max(spec.anchoMm, spec.altoMm))), finishMaterial(spec.acabado, spec.colores[0] ?? '#F5D547'))),
  'sun-extrude': (spec) => {
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#D4AF37');
    const depth = spec.profundidadMm ?? 3;
    const discR = spec.anchoMm * 0.3;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(discR, discR, depth, 20), mat);
    disc.rotation.x = Math.PI / 2;
    disc.position.z = depth / 2;
    disc.castShadow = true;
    const g = group(disc);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(spec.anchoMm * 0.055, spec.anchoMm * 0.2, 4), mat);
      ray.position.set(Math.cos(a) * spec.anchoMm * 0.4, Math.sin(a) * spec.anchoMm * 0.4, depth / 2);
      ray.rotation.z = a - Math.PI / 2;
      ray.castShadow = true;
      g.add(ray);
    }
    return g;
  },
  'moon-extrude': (spec) =>
    group(
      extrudeCharm(
        shapeFrom(moonOutline(spec.anchoMm, spec.altoMm)),
        spec.profundidadMm ?? 3,
        finishMaterial(spec.acabado, spec.colores[0] ?? '#D4AF37'),
        0.3,
      ),
    ),
  'shooting-star-3d': (spec) => {
    const mat = finishMaterial('metal-oro', '#D4AF37');
    const star = extrudeCharm(shapeFrom(starOutline(spec.altoMm)), spec.profundidadMm ?? 3, mat, 0.3);
    star.position.x = spec.anchoMm / 2 - spec.altoMm / 2;
    const g = group(star);
    const trailMat = finishMaterial('esmalte', spec.colores[1] ?? '#F4A7C3');
    for (let i = 0; i < 3; i++) {
      const len = spec.anchoMm * (0.26 - i * 0.06);
      const hgt = spec.altoMm * (0.16 - i * 0.04);
      const trap = new THREE.Mesh(new THREE.BoxGeometry(len, hgt, 1), trailMat);
      trap.position.set(-spec.anchoMm * (0.08 + i * 0.22), (i - 1) * spec.altoMm * 0.16, 0.6);
      trap.castShadow = true;
      g.add(trap);
    }
    return g;
  },
  'flower-3d': (spec) => {
    const petals = Number((spec.recipeParams as { petalos?: number } | null)?.petalos ?? 6);
    const petalMat = finishMaterial(spec.acabado, spec.colores[0] ?? '#F4A7C3');
    const centerMat = finishMaterial(spec.acabado, spec.colores[1] ?? '#F0B429');
    const rad = spec.anchoMm / 2;
    const g = new THREE.Group();
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      const petal = sphere(rad * 0.34, petalMat, 10, 8);
      petal.scale.set(1, 0.45, 0.25);
      petal.rotation.z = a;
      petal.position.set(Math.cos(a) * rad * 0.55, Math.sin(a) * rad * 0.55, rad * 0.12);
      g.add(petal);
    }
    const center = sphere(rad * 0.3, centerMat, 12, 8);
    center.scale.z = 0.6;
    center.position.z = rad * 0.18;
    g.add(center);
    g.position.z = rad * 0.1;
    return g;
  },
  'flower-flat': (spec) => {
    const g = new THREE.Group();
    const petalMat = finishMaterial('vinilo', spec.colores[0] ?? '#FFFFFF');
    const centerMat = finishMaterial('vinilo', spec.colores[1] ?? '#F0B429');
    const rad = spec.anchoMm / 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const petal = extrudeSticker(shapeFrom(starOutline(rad * 0.8, 3, 0.8).map((p) => ({ x: p.x * 0.5, y: p.y }))), petalMat);
      petal.rotation.z = a;
      petal.position.set(Math.cos(a) * rad * 0.5, Math.sin(a) * rad * 0.5, 0);
      g.add(petal);
    }
    const center = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.32, rad * 0.32, STICKER_DEPTH, 14), centerMat);
    center.rotation.x = Math.PI / 2;
    center.position.z = STICKER_DEPTH;
    g.add(center);
    return g;
  },
  'tulip-3d': (spec) => {
    const cupMat = finishMaterial(spec.acabado, spec.colores[0] ?? '#F0705A');
    const stemMat = finishMaterial('esmalte', spec.colores[1] ?? '#5B8C5A');
    // Copa por Lathe con perfil de tulipan
    const profile: THREE.Vector2[] = [];
    const H = spec.altoMm * 0.45;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const r = (spec.anchoMm / 2) * (0.18 + 0.82 * Math.sin(t * Math.PI * 0.72));
      profile.push(new THREE.Vector2(r, t * H));
    }
    const cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 12), cupMat);
    cup.rotation.x = Math.PI / 2;
    cup.position.set(0, spec.altoMm * 0.22, spec.profundidadMm ?? 4);
    cup.scale.z = 0.5;
    cup.castShadow = true;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, spec.altoMm * 0.5, 8), stemMat);
    stem.position.set(0, -spec.altoMm * 0.2, (spec.profundidadMm ?? 4) * 0.4);
    stem.castShadow = true;
    const leaf = sphere(spec.altoMm * 0.14, stemMat, 8, 6);
    leaf.scale.set(1.6, 0.5, 0.3);
    leaf.rotation.z = 0.6;
    leaf.position.set(spec.anchoMm * 0.2, -spec.altoMm * 0.24, (spec.profundidadMm ?? 4) * 0.4);
    return group(cup, stem, leaf);
  },
  'bouquet-flat': (spec) => {
    const g = new THREE.Group();
    const stemMat = finishMaterial('vinilo', '#5B8C5A');
    const colors = spec.colores.length > 0 ? spec.colores : ['#F4A7C3'];
    const positions: [number, number][] = [
      [-spec.anchoMm * 0.24, -spec.altoMm * 0.18],
      [0, -spec.altoMm * 0.3],
      [spec.anchoMm * 0.24, -spec.altoMm * 0.14],
    ];
    positions.forEach(([px, py], i) => {
      const stem = new THREE.Mesh(new THREE.BoxGeometry(1.1, spec.altoMm * 0.5, STICKER_DEPTH), stemMat);
      stem.rotation.z = px * 0.02;
      stem.position.set(px * 0.4, py + spec.altoMm * 0.32, STICKER_DEPTH / 2);
      g.add(stem);
      const flowerMat = finishMaterial('vinilo', colors[i % colors.length]!);
      const fl = new THREE.Mesh(
        new THREE.CylinderGeometry(spec.anchoMm * 0.16, spec.anchoMm * 0.16, STICKER_DEPTH, 10),
        flowerMat,
      );
      fl.rotation.x = Math.PI / 2;
      fl.position.set(px, py - spec.altoMm * 0.06, STICKER_DEPTH);
      g.add(fl);
    });
    return g;
  },
  'bow-3d': (spec) => {
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#E8B4C8');
    const depth = spec.profundidadMm ?? 4;
    const lobeR = spec.altoMm * 0.42;
    const left = new THREE.Mesh(new THREE.TorusGeometry(lobeR, lobeR * 0.42, 8, 14, Math.PI * 1.7), mat);
    left.scale.set(1, 0.62, 0.36);
    left.rotation.z = Math.PI * 0.9;
    left.position.set(-spec.anchoMm * 0.26, 0, depth * 0.45);
    left.castShadow = true;
    const right = left.clone();
    right.rotation.z = -Math.PI * 0.9;
    right.position.x = spec.anchoMm * 0.26;
    const knotGeo = new THREE.BoxGeometry(spec.anchoMm * 0.18, spec.altoMm * 0.34, depth * 0.7);
    const knot = new THREE.Mesh(knotGeo, mat);
    knot.position.z = depth * 0.45;
    knot.castShadow = true;
    const ribbonL = new THREE.Mesh(new THREE.BoxGeometry(spec.anchoMm * 0.13, spec.altoMm * 0.42, depth * 0.3), mat);
    ribbonL.rotation.z = 0.5;
    ribbonL.position.set(-spec.anchoMm * 0.14, -spec.altoMm * 0.32, depth * 0.25);
    ribbonL.castShadow = true;
    const ribbonR = ribbonL.clone();
    ribbonR.rotation.z = -0.5;
    ribbonR.position.x = spec.anchoMm * 0.14;
    return group(left, right, knot, ribbonL, ribbonR);
  },
  'bow-flat': (spec) =>
    group(extrudeSticker(shapeFrom(bowOutline(spec.anchoMm, spec.altoMm)), finishMaterial(spec.acabado, spec.colores[0] ?? '#F4A7C3'))),
  'bow-outline-flat': (spec) => {
    const outer = shapeFrom(bowOutline(spec.anchoMm, spec.altoMm));
    const innerPts = bowOutline(spec.anchoMm - 3.4, spec.altoMm - 3.4);
    const hole = new THREE.Path();
    innerPts.forEach((p, i) => (i === 0 ? hole.moveTo(p.x, -p.y) : hole.lineTo(p.x, -p.y)));
    hole.closePath();
    outer.holes.push(hole);
    return group(extrudeSticker(outer, finishMaterial(spec.acabado, spec.colores[0] ?? '#1E1E1E')));
  },
  'cherry-3d': (spec) => {
    const fruitMat = finishMaterial(spec.acabado, spec.colores[0] ?? '#D7263D');
    const stemMat = finishMaterial('esmalte', spec.colores[1] ?? '#5B8C5A');
    const r = spec.anchoMm * 0.27;
    const a = sphere(r, fruitMat);
    a.position.set(-spec.anchoMm * 0.2, -spec.altoMm * 0.24, r * 0.8);
    const b = sphere(r, fruitMat);
    b.position.set(spec.anchoMm * 0.22, -spec.altoMm * 0.16, r * 0.8);
    const curveA = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-spec.anchoMm * 0.2, -spec.altoMm * 0.24 + r, r * 0.8),
      new THREE.Vector3(-spec.anchoMm * 0.05, spec.altoMm * 0.14, r * 0.7),
      new THREE.Vector3(spec.anchoMm * 0.08, spec.altoMm * 0.46, r * 0.6),
    ]);
    const stemA = new THREE.Mesh(new THREE.TubeGeometry(curveA, 8, 0.55, 6), stemMat);
    stemA.castShadow = true;
    const curveB = new THREE.CatmullRomCurve3([
      new THREE.Vector3(spec.anchoMm * 0.22, -spec.altoMm * 0.16 + r, r * 0.8),
      new THREE.Vector3(spec.anchoMm * 0.14, spec.altoMm * 0.18, r * 0.7),
      new THREE.Vector3(spec.anchoMm * 0.08, spec.altoMm * 0.46, r * 0.6),
    ]);
    const stemB = new THREE.Mesh(new THREE.TubeGeometry(curveB, 8, 0.55, 6), stemMat);
    stemB.castShadow = true;
    const leaf = sphere(r * 0.5, stemMat, 8, 6);
    leaf.scale.set(1.7, 0.55, 0.3);
    leaf.rotation.z = 0.5;
    leaf.position.set(spec.anchoMm * 0.02, spec.altoMm * 0.42, r * 0.7);
    return group(a, b, stemA, stemB, leaf);
  },
  'strawberry-3d': (spec) => {
    const bodyMat = finishMaterial(spec.acabado, spec.colores[0] ?? '#D7263D');
    const dotMat = finishMaterial('esmalte', spec.colores[1] ?? '#F5D547');
    const crownMat = finishMaterial('esmalte', '#5B8C5A');
    const r = spec.anchoMm / 2;
    const body = sphere(r, bodyMat, 14, 12);
    body.scale.set(1, 1.15, 0.9);
    body.position.set(0, -spec.altoMm * 0.06, r * 0.86);
    const g = group(body);
    // 12 puntitos incrustados deterministas
    for (let i = 0; i < 12; i++) {
      const phi = ((i * 137.5) % 360) * (Math.PI / 180);
      const theta = 0.5 + (i % 4) * 0.35;
      const dot = sphere(r * 0.09, dotMat, 6, 5);
      dot.position.set(
        Math.sin(theta) * Math.cos(phi) * r * 0.92,
        -spec.altoMm * 0.06 + Math.cos(theta) * r * 1.05,
        r * 0.86 + Math.sin(theta) * Math.sin(phi) * r * 0.8,
      );
      g.add(dot);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const hoja = sphere(r * 0.24, crownMat, 6, 5);
      hoja.scale.set(1.6, 0.5, 0.3);
      hoja.rotation.z = a;
      hoja.position.set(Math.cos(a) * r * 0.35, spec.altoMm * 0.42, r * 0.9);
      g.add(hoja);
    }
    return g;
  },
  'lemon-3d': (spec) => {
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#F5D547');
    const r = spec.altoMm / 2;
    const body = sphere(r, mat, 14, 12);
    body.scale.set(spec.anchoMm / spec.altoMm, 1, 0.85);
    body.position.z = r * 0.8;
    const tipL = new THREE.Mesh(new THREE.ConeGeometry(r * 0.28, r * 0.5, 8), mat);
    tipL.rotation.z = Math.PI / 2;
    tipL.position.set(-spec.anchoMm / 2 + r * 0.1, 0, r * 0.8);
    tipL.castShadow = true;
    const tipR = tipL.clone();
    tipR.rotation.z = -Math.PI / 2;
    tipR.position.x = spec.anchoMm / 2 - r * 0.1;
    return group(body, tipL, tipR);
  },
  'apple-3d': (spec) => {
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#7BB661');
    const r = spec.anchoMm / 2;
    const body = sphere(r, mat, 14, 12);
    body.scale.set(1, 0.95, 0.85);
    body.position.z = r * 0.8;
    // Hendidura superior sugerida con esfera de tono mas oscuro hundida
    const dimple = sphere(r * 0.3, mat, 8, 6);
    dimple.scale.set(1, 0.4, 0.5);
    dimple.position.set(0, r * 0.82, r * 0.8);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.65, spec.altoMm * 0.24, 6),
      finishMaterial('esmalte', '#6B4226'),
    );
    stem.position.set(0, r * 0.95, r * 0.8);
    stem.rotation.z = 0.2;
    stem.castShadow = true;
    return group(body, dimple, stem);
  },
  'banana-3d': (spec) => {
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#F5D547');
    const R = spec.altoMm * 0.34;
    const tube = spec.anchoMm * 0.36;
    const body = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 8, 14, (Math.PI * 4) / 3), mat);
    body.rotation.z = Math.PI / 3 + Math.PI / 2;
    body.position.z = tube;
    body.castShadow = true;
    const g = group(body);
    g.scale.set(spec.anchoMm / (2 * (R + tube)) * 1.6, 1, 1);
    return g;
  },
  'watermelon-flat': (spec) => {
    const g = new THREE.Group();
    const rind = finishMaterial('vinilo', spec.colores[1] ?? '#5B8C5A');
    const flesh = finishMaterial('vinilo', spec.colores[0] ?? '#D7263D');
    const seed = finishMaterial('vinilo', '#1E1E1E');
    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.anchoMm / 2, spec.anchoMm / 2, STICKER_DEPTH, 20, 1, false, 0, Math.PI),
      rind,
    );
    outer.rotation.x = Math.PI / 2;
    outer.rotation.z = Math.PI / 2 + Math.PI / 2;
    outer.position.y = -spec.altoMm * 0.14;
    g.add(outer);
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.anchoMm * 0.42, spec.anchoMm * 0.42, STICKER_DEPTH, 18, 1, false, 0, Math.PI),
      flesh,
    );
    inner.rotation.copy(outer.rotation);
    inner.position.set(0, -spec.altoMm * 0.14, STICKER_DEPTH * 0.9);
    g.add(inner);
    for (let i = 0; i < 5; i++) {
      const pip = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, STICKER_DEPTH, 6), seed);
      pip.rotation.x = Math.PI / 2;
      const a = Math.PI * (0.25 + (i / 4) * 0.5);
      pip.position.set(Math.cos(a) * spec.anchoMm * 0.26, -spec.altoMm * 0.12 + Math.sin(a) * spec.altoMm * 0.34, STICKER_DEPTH * 2);
      g.add(pip);
    }
    g.rotation.z = 0;
    return g;
  },
  'pineapple-flat': (spec) => {
    const g = new THREE.Group();
    const body = finishMaterial('vinilo', spec.colores[0] ?? '#F0B429');
    const crown = finishMaterial('vinilo', spec.colores[1] ?? '#5B8C5A');
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.anchoMm * 0.42, spec.anchoMm * 0.46, STICKER_DEPTH, 16),
      body,
    );
    b.rotation.x = Math.PI / 2;
    b.scale.y = spec.altoMm * 0.62 / (spec.anchoMm * 0.88);
    b.position.y = -spec.altoMm * 0.12;
    g.add(b);
    for (let i = 0; i < 3; i++) {
      const leaf = extrudeSticker(
        shapeFrom([
          { x: -1.4, y: 0 },
          { x: 0, y: -spec.altoMm * 0.36 },
          { x: 1.4, y: 0 },
        ]),
        crown,
      );
      leaf.rotation.z = (i - 1) * 0.5;
      leaf.position.set((i - 1) * spec.anchoMm * 0.14, spec.altoMm * 0.2, 0);
      g.add(leaf);
    }
    return g;
  },
  'bear-3d': (spec) => {
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#D7B899');
    const r = spec.anchoMm * 0.38;
    const head = sphere(r, mat, 14, 12);
    head.position.set(0, -spec.altoMm * 0.06, r * 0.8);
    const earL = sphere(r * 0.42, mat, 10, 8);
    earL.position.set(-r * 0.75, spec.altoMm * 0.3, r * 0.7);
    const earR = earL.clone();
    earR.position.x = r * 0.75;
    const snout = sphere(r * 0.42, finishMaterial('esmalte', '#F5EBDD'), 10, 8);
    snout.scale.z = 0.55;
    snout.position.set(0, -spec.altoMm * 0.16, r * 1.42);
    return group(head, earL, earR, snout);
  },
  'cat-3d': (spec) => {
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#FFFFFF');
    const earMat = finishMaterial('esmalte', spec.colores[1] ?? '#F4A7C3');
    const r = spec.anchoMm * 0.4;
    const head = sphere(r, mat, 14, 12);
    head.position.set(0, -spec.altoMm * 0.08, r * 0.75);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(r * 0.4, r * 0.75, 4), earMat);
    earL.position.set(-r * 0.58, spec.altoMm * 0.3, r * 0.7);
    earL.rotation.z = 0.3;
    earL.castShadow = true;
    const earR = earL.clone();
    earR.position.x = r * 0.58;
    earR.rotation.z = -0.3;
    return group(head, earL, earR);
  },
  'bunny-3d': (spec) => {
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#FFFFFF');
    const r = spec.anchoMm * 0.42;
    const head = sphere(r, mat, 14, 12);
    head.position.set(0, -spec.altoMm * 0.22, r * 0.75);
    const earL = sphere(r * 0.42, mat, 10, 8);
    earL.scale.set(0.55, 1.9, 0.5);
    earL.position.set(-r * 0.45, spec.altoMm * 0.22, r * 0.65);
    earL.rotation.z = 0.12;
    const earR = earL.clone();
    earR.position.x = r * 0.45;
    earR.rotation.z = -0.12;
    return group(head, earL, earR);
  },
  'butterfly-3d': (spec) => {
    const wingMat = finishMaterial(spec.acabado, spec.colores[0] ?? '#C3B1E1');
    const bodyMat = finishMaterial('esmalte', '#3A3A3C');
    const g = new THREE.Group();
    const dihedral = (12 * Math.PI) / 180;
    const wing = (upper: boolean, side: 1 | -1) => {
      const w = spec.anchoMm * (upper ? 0.46 : 0.36);
      const h = spec.altoMm * (upper ? 0.52 : 0.42);
      const shape = shapeFrom([
        { x: 0, y: 0 },
        { x: side * w * 0.9, y: upper ? -h * 0.7 : h * 0.15 },
        { x: side * w, y: upper ? -h * 0.2 : h * 0.75 },
        { x: side * w * 0.35, y: upper ? h * 0.1 : h * 0.9 },
      ]);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: false, curveSegments: 6 });
      const m = new THREE.Mesh(geo, wingMat);
      m.rotation.y = side * dihedral;
      m.position.set(0, upper ? spec.altoMm * 0.06 : -spec.altoMm * 0.12, 1.2);
      m.castShadow = true;
      return m;
    };
    g.add(wing(true, 1), wing(true, -1), wing(false, 1), wing(false, -1));
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(spec.anchoMm * 0.05, spec.altoMm * 0.5, 3, 8), bodyMat);
    body.position.z = 1.2;
    body.castShadow = true;
    g.add(body);
    return g;
  },
  'bee-3d': (spec) => {
    const bodyMat = finishMaterial(spec.acabado, spec.colores[0] ?? '#F5D547');
    const stripeMat = finishMaterial('esmalte', spec.colores[1] ?? '#1E1E1E');
    const wingMat = finishMaterial('cristal', '#FFFFFF');
    const r = spec.altoMm * 0.42;
    const body = sphere(r, bodyMat, 14, 10);
    body.scale.set(spec.anchoMm / spec.altoMm * 0.9, 1, 0.8);
    body.position.z = r * 0.7;
    const g = group(body);
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(r * (0.94 - i * 0.06), r * 0.1, 6, 14), stripeMat);
      stripe.rotation.y = Math.PI / 2;
      stripe.position.set((i - 1) * spec.anchoMm * 0.2, 0, r * 0.7);
      stripe.scale.y = 0.98;
      g.add(stripe);
    }
    for (const side of [1, -1]) {
      const wing = sphere(r * 0.55, wingMat, 8, 6);
      wing.scale.set(0.9, 0.5, 0.12);
      wing.rotation.z = side * 0.5;
      wing.position.set(side * spec.anchoMm * 0.14, spec.altoMm * 0.34, r * 1.2);
      g.add(wing);
    }
    return g;
  },
  'paw-flat': (spec) => {
    const mat = finishMaterial('vinilo', spec.colores[0] ?? '#F4A7C3');
    const g = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(spec.anchoMm * 0.28, spec.anchoMm * 0.28, STICKER_DEPTH, 12), mat);
    pad.rotation.x = Math.PI / 2;
    pad.scale.y = 0.85;
    pad.position.y = -spec.altoMm * 0.14;
    g.add(pad);
    for (let i = 0; i < 4; i++) {
      const toe = new THREE.Mesh(new THREE.CylinderGeometry(spec.anchoMm * 0.1, spec.anchoMm * 0.1, STICKER_DEPTH, 8), mat);
      toe.rotation.x = Math.PI / 2;
      const a = Math.PI * (0.2 + (i / 3) * 0.6);
      toe.position.set(Math.cos(a) * spec.anchoMm * 0.32, spec.altoMm * 0.1 + Math.sin(a) * spec.altoMm * 0.2, 0);
      g.add(toe);
    }
    return g;
  },
  'catface-flat': (spec) => {
    const mat = finishMaterial('vinilo', spec.colores[0] ?? '#1E1E1E');
    const outer = shapeFrom([
      { x: -spec.anchoMm * 0.5, y: -spec.altoMm * 0.5 },
      { x: -spec.anchoMm * 0.28, y: -spec.altoMm * 0.12 },
      { x: spec.anchoMm * 0.28, y: -spec.altoMm * 0.12 },
      { x: spec.anchoMm * 0.5, y: -spec.altoMm * 0.5 },
      { x: spec.anchoMm * 0.46, y: spec.altoMm * 0.2 },
      { x: 0, y: spec.altoMm * 0.5 },
      { x: -spec.anchoMm * 0.46, y: spec.altoMm * 0.2 },
    ]);
    return group(extrudeSticker(outer, mat));
  },
  'chain-segment': (spec) => {
    const links = Number((spec.recipeParams as { eslabones?: number } | null)?.eslabones ?? 6);
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#D4AF37');
    const g = new THREE.Group();
    const paso = 5.5;
    const linkR = spec.anchoMm * 0.36;
    const total = (links - 1) * paso;
    for (let i = 0; i < links; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(linkR, 0.8, 6, 12), mat);
      link.position.set(0, total / 2 - i * paso, linkR * 0.4 + 0.8);
      link.rotation.y = i % 2 === 0 ? 0 : Math.PI / 2;
      link.rotation.x = i % 2 === 0 ? 0 : 0.12;
      link.castShadow = true;
      g.add(link);
    }
    return g;
  },
  'pearl-strand': (spec) => {
    const pearls = Number((spec.recipeParams as { perlas?: number } | null)?.perlas ?? 11);
    const mat = finishMaterial('nacar', spec.colores[0] ?? '#F6EFF2');
    const g = new THREE.Group();
    const r = 1.6; // esferas de 3,2 mm (SS10.2)
    const paso = 3.2 + 0.4;
    const total = (pearls - 1) * paso;
    for (let i = 0; i < pearls; i++) {
      const pearl = sphere(r, mat, 10, 8);
      pearl.position.set(0, total / 2 - i * paso, r);
      g.add(pearl);
    }
    return g;
  },
  'chain-flat': (spec) => {
    const mat = finishMaterial('vinilo', spec.colores[0] ?? '#D4AF37');
    const g = new THREE.Group();
    const links = 7;
    const paso = spec.altoMm / links;
    for (let i = 0; i < links; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(spec.anchoMm * 0.32, spec.anchoMm * 0.1, 4, 10), mat);
      ring.scale.set(1, 1.4, 1);
      ring.position.set(0, spec.altoMm / 2 - paso * (i + 0.5), STICKER_DEPTH);
      ring.scale.z = 0.08;
      g.add(ring);
    }
    return g;
  },
  'constellation-flat': (spec) => {
    const mat = finishMaterial('vinilo', spec.colores[0] ?? '#D4AF37');
    const g = new THREE.Group();
    // Distribucion determinista de 6 discos conectados
    const nodes: [number, number, number][] = [
      [-0.42, -0.3, 1.1], [-0.15, -0.05, 0.8], [0.1, -0.35, 1.25],
      [0.35, -0.05, 0.9], [0.15, 0.3, 1.0], [-0.25, 0.32, 0.75],
    ];
    const pts = nodes.map(([nx, ny, r]) => ({ x: nx * spec.anchoMm, y: ny * spec.altoMm, r }));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const conn = new THREE.Mesh(new THREE.BoxGeometry(len, 0.6, STICKER_DEPTH), mat);
      conn.position.set((a.x + b.x) / 2, -(a.y + b.y) / 2, STICKER_DEPTH / 2);
      conn.rotation.z = -Math.atan2(b.y - a.y, b.x - a.x);
      g.add(conn);
    }
    for (const p of pts) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, STICKER_DEPTH, 10), mat);
      disc.rotation.x = Math.PI / 2;
      disc.position.set(p.x, -p.y, STICKER_DEPTH / 2);
      g.add(disc);
    }
    return g;
  },
  'letter-extrude': (spec) => letterMesh(spec, false),
  'letter-flat': (spec) => letterMesh(spec, true),
  'umbrella-3d': (spec) => {
    const colorA = finishMaterial(spec.acabado, spec.colores[0] ?? '#F4A7C3');
    const colorB = finishMaterial(spec.acabado, spec.colores[1] ?? '#FFFFFF');
    const g = new THREE.Group();
    const R = spec.anchoMm / 2;
    for (let i = 0; i < 8; i++) {
      const gore = new THREE.Mesh(
        new THREE.SphereGeometry(R, 6, 8, (i / 8) * Math.PI * 2, Math.PI / 4, 0, Math.PI / 2.4),
        i % 2 === 0 ? colorA : colorB,
      );
      gore.rotation.x = -Math.PI / 2;
      gore.position.set(0, spec.altoMm * 0.14, 0.5);
      gore.castShadow = true;
      g.add(gore);
    }
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, spec.altoMm * 0.8, 8),
      finishMaterial('metal-oro', '#D4AF37'),
    );
    mast.rotation.z = 0.16;
    mast.position.set(spec.anchoMm * 0.04, -spec.altoMm * 0.08, 1.2);
    mast.castShadow = true;
    g.add(mast);
    return g;
  },
  'icecream-3d': (spec) => {
    const coneMat = finishMaterial('esmalte', spec.colores[0] ?? '#F5EBDD');
    const creamMat = finishMaterial(spec.acabado, spec.colores[1] ?? '#F4A7C3');
    const cone = new THREE.Mesh(new THREE.ConeGeometry(spec.anchoMm * 0.4, spec.altoMm * 0.55, 10), coneMat);
    cone.rotation.x = Math.PI;
    cone.position.set(0, -spec.altoMm * 0.18, spec.anchoMm * 0.32);
    cone.castShadow = true;
    const ball = sphere(spec.anchoMm * 0.42, creamMat, 12, 10);
    ball.position.set(0, spec.altoMm * 0.2, spec.anchoMm * 0.34);
    const drip = sphere(spec.anchoMm * 0.14, creamMat, 8, 6);
    drip.scale.y = 1.6;
    drip.position.set(spec.anchoMm * 0.18, spec.altoMm * 0.02, spec.anchoMm * 0.36);
    return group(cone, ball, drip);
  },
  'shell-3d': (spec) => {
    const mat = finishMaterial(spec.acabado, spec.colores[0] ?? '#F6EFF2');
    // Vieira: lathe con estrias senoidales (9 estrias, SS10.2)
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const r = (spec.anchoMm / 2) * Math.sin(t * Math.PI * 0.5);
      profile.push(new THREE.Vector2(r, t * spec.altoMm * 0.5));
    }
    const geo = new THREE.LatheGeometry(profile, 18);
    const pos = geo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const angle = Math.atan2(z, x);
      const wobble = 1 + 0.07 * Math.sin(angle * 9);
      pos.setX(i, x * wobble);
      pos.setZ(i, z * wobble);
    }
    geo.computeVertexNormals();
    const shell = new THREE.Mesh(geo, mat);
    shell.rotation.x = -Math.PI / 2.6;
    shell.position.set(0, -spec.altoMm * 0.18, spec.altoMm * 0.16);
    shell.castShadow = true;
    return group(shell);
  },
  'wave-flat': (spec) =>
    group(extrudeSticker(shapeFrom(waveOutline(spec.anchoMm, spec.altoMm)), finishMaterial('vinilo', spec.colores[0] ?? '#7EB6D9'))),
  'butterfly-flat': (spec) =>
    group(extrudeSticker(shapeFrom(butterflyOutline(spec.anchoMm, spec.altoMm)), finishMaterial('vinilo', spec.colores[0] ?? '#C3B1E1'))),
};

/**
 * buildElementMesh (SS10.1): malla procedural de un elemento. Fallback a un
 * bloque redondeado si la receta no existe (nunca geometria rota, D7).
 */
export function buildElementMesh(recipe: string, spec: ElementSpec): THREE.Group {
  const builder = R[recipe];
  if (builder) return builder(spec);
  const fallback = extrudeCharm(
    shapeFrom([
      { x: -spec.anchoMm / 2, y: -spec.altoMm / 2 },
      { x: spec.anchoMm / 2, y: -spec.altoMm / 2 },
      { x: spec.anchoMm / 2, y: spec.altoMm / 2 },
      { x: -spec.anchoMm / 2, y: spec.altoMm / 2 },
    ]),
    spec.profundidadMm ?? 2,
    finishMaterial(spec.acabado, spec.colores[0] ?? '#F4A7C3'),
  );
  return group(fallback);
}

export const KNOWN_RECIPES = Object.keys(R);
