import {
  aabbOverlap,
  inflateConvexPolygon,
  pointInPolygon,
  polygonAABB,
  roundedRectPolygon,
  segmentsIntersect,
  transformPolygon,
} from './geometry';
import { hitboxesCollide } from './sat';
import {
  CAMERA_INFLATE_MM,
  DEFAULT_MARGIN_MM,
  type AABB,
  type DeviceSpec,
  type ElementShape,
  type PlacedItem,
  type Polygon,
  type ValidationResult,
} from './types';

/**
 * Algoritmo canonico esValida (SS8.3):
 *  1) contencion: cada vertice de P dentro del contorno y ninguna arista de P
 *     interseca el contorno -> FUERA_DE_FUNDA
 *  2) camara: SAT(P, zonaCamaraInflada) -> SOBRE_CAMARA
 *  3) pares: broad-phase AABB (inflado margen) + SAT con margen -> SOLAPA(refs)
 */

export interface SceneContext {
  contour: Polygon;
  contourAABB: AABB;
  cameraInflated: Polygon;
  marginMm: number;
}

/** Precalcula el contexto de escena de un dispositivo (contorno + camara inflada). */
export function buildSceneContext(device: DeviceSpec, marginMm: number = DEFAULT_MARGIN_MM): SceneContext {
  const contour = roundedRectPolygon(device.anchoMm, device.altoMm, device.radioEsquinaMm);
  return {
    contour,
    contourAABB: polygonAABB(contour),
    cameraInflated:
      device.cameraZone.length >= 3
        ? inflateConvexPolygon(device.cameraZone, CAMERA_INFLATE_MM)
        : [],
    marginMm,
  };
}

/** Hitbox transformada de un item (rotacion + traslacion). */
export function worldHitbox(item: PlacedItem, shape: ElementShape): Polygon[] {
  return shape.hitbox.map((poly) => transformPolygon(poly, item.xMm, item.yMm, item.rotationDeg));
}

/** Regla 1: contencion total dentro del contorno. */
function isContained(world: Polygon[], ctx: SceneContext): boolean {
  for (const poly of world) {
    for (const p of poly) {
      if (!pointInPolygon(p, ctx.contour)) return false;
    }
    // Ninguna arista de P interseca el contorno (SS8.3)
    const n = poly.length;
    const m = ctx.contour.length;
    for (let i = 0; i < n; i++) {
      const a1 = poly[i]!;
      const a2 = poly[(i + 1) % n]!;
      for (let j = 0; j < m; j++) {
        if (segmentsIntersect(a1, a2, ctx.contour[j]!, ctx.contour[(j + 1) % m]!)) return false;
      }
    }
  }
  return true;
}

/** Valida la pose de UN item frente al contexto y al resto de la escena. */
export function esValida(
  item: PlacedItem,
  others: PlacedItem[],
  shapes: ReadonlyMap<string, ElementShape>,
  ctx: SceneContext,
): ValidationResult {
  const shape = shapes.get(item.elementId);
  if (!shape) return { valida: false, motivo: 'FUERA_DE_FUNDA' };

  const world = worldHitbox(item, shape);

  if (!isContained(world, ctx)) {
    return { valida: false, motivo: 'FUERA_DE_FUNDA' };
  }

  if (ctx.cameraInflated.length >= 3 && hitboxesCollide(world, [ctx.cameraInflated], 0)) {
    return { valida: false, motivo: 'SOBRE_CAMARA' };
  }

  const worldAABBs = world.map(polygonAABB);
  const refs: string[] = [];
  for (const other of others) {
    if (other.instanceId === item.instanceId) continue;
    const otherShape = shapes.get(other.elementId);
    if (!otherShape) continue;
    const otherWorld = worldHitbox(other, otherShape);
    const otherAABBs = otherWorld.map(polygonAABB);
    // Broad-phase por AABB inflada con el margen (SS8.3)
    let broadHit = false;
    for (const a of worldAABBs) {
      for (const b of otherAABBs) {
        if (aabbOverlap(a, b, ctx.marginMm)) {
          broadHit = true;
          break;
        }
      }
      if (broadHit) break;
    }
    if (!broadHit) continue;
    if (hitboxesCollide(world, otherWorld, ctx.marginMm)) {
      refs.push(other.instanceId);
    }
  }
  if (refs.length > 0) return { valida: false, motivo: 'SOLAPA', refs };
  return { valida: true };
}

/**
 * validarEscena (SS8.3): mapa de validez por instancia. Usado por el servidor
 * en cada guardado y por el seed de preestablecidos.
 */
export function validarEscena(
  items: PlacedItem[],
  shapes: ReadonlyMap<string, ElementShape>,
  device: DeviceSpec,
  marginMm: number = DEFAULT_MARGIN_MM,
): Map<string, ValidationResult> {
  const ctx = buildSceneContext(device, marginMm);
  const result = new Map<string, ValidationResult>();
  for (const item of items) {
    result.set(item.instanceId, esValida(item, items, shapes, ctx));
  }
  return result;
}

/** true si toda la escena es valida. */
export function escenaValida(
  items: PlacedItem[],
  shapes: ReadonlyMap<string, ElementShape>,
  device: DeviceSpec,
  marginMm: number = DEFAULT_MARGIN_MM,
): boolean {
  for (const r of validarEscena(items, shapes, device, marginMm).values()) {
    if (!r.valida) return false;
  }
  return true;
}
