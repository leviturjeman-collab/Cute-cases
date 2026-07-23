import { pointInRoundedRect, transformPolygon } from './geometry';
import { polygonsCollide } from './sat';
import type {
  CaseGeometry,
  ElementInstance,
  ElementShape,
  InvalidReason,
  PlacementResult,
  Polygon,
} from './types';
import { DEFAULT_SAFETY_MARGIN_MM } from './types';

/**
 * Reglas de validez de una posición (§6.6) — las TRES deben cumplirse:
 *  1. Sin solapamiento con la hitbox (rotada) de ningún otro elemento (margen configurable).
 *  2. Sin intersección con el polígono de la zona de cámara.
 *  3. Contención total dentro del contorno de la funda (rect. redondeado).
 */

export function getWorldHitbox(instance: ElementInstance, shape: ElementShape): Polygon {
  return transformPolygon(shape.hitbox, instance.xMm, instance.yMm, instance.rotacionGrados);
}

/** Regla 3: contención total. La funda es convexa → basta comprobar los vértices. */
export function isInsideCase(worldHitbox: Polygon, geometry: CaseGeometry): boolean {
  return worldHitbox.every((p) =>
    pointInRoundedRect(p, geometry.anchoMm, geometry.altoMm, geometry.radioEsquinaMm),
  );
}

/** Valida la posición de UNA instancia frente al resto, la cámara y el contorno. */
export function validatePlacement(
  instance: ElementInstance,
  others: ElementInstance[],
  shapes: ReadonlyMap<string, ElementShape>,
  geometry: CaseGeometry,
  marginMm: number = DEFAULT_SAFETY_MARGIN_MM,
): PlacementResult {
  const shape = shapes.get(instance.elementId);
  if (!shape) return { valid: false, reasons: [{ type: 'out-of-bounds' }] };

  const world = getWorldHitbox(instance, shape);
  const reasons: InvalidReason[] = [];

  if (!isInsideCase(world, geometry)) {
    reasons.push({ type: 'out-of-bounds' });
  }
  if (geometry.cameraZone.length >= 3 && polygonsCollide(world, geometry.cameraZone, 0)) {
    reasons.push({ type: 'camera' });
  }
  for (const other of others) {
    if (other.instanceId === instance.instanceId) continue;
    const otherShape = shapes.get(other.elementId);
    if (!otherShape) continue;
    const otherWorld = getWorldHitbox(other, otherShape);
    if (polygonsCollide(world, otherWorld, marginMm)) {
      reasons.push({ type: 'overlap', otherInstanceId: other.instanceId });
    }
  }
  return { valid: reasons.length === 0, reasons };
}

/**
 * Valida un diseño COMPLETO (todas las instancias). Usado por el servidor en
 * cada guardado/añadido a cesta (§12.5) y por el cliente al cargar un diseño.
 * Devuelve un mapa instanceId → razones (vacío si todo es válido).
 */
export function validateDesign(
  instances: ElementInstance[],
  shapes: ReadonlyMap<string, ElementShape>,
  geometry: CaseGeometry,
  marginMm: number = DEFAULT_SAFETY_MARGIN_MM,
): Map<string, InvalidReason[]> {
  const invalid = new Map<string, InvalidReason[]>();
  const worlds = new Map<string, Polygon>();
  for (const inst of instances) {
    const shape = shapes.get(inst.elementId);
    if (!shape) {
      invalid.set(inst.instanceId, [{ type: 'out-of-bounds' }]);
      continue;
    }
    worlds.set(inst.instanceId, getWorldHitbox(inst, shape));
  }

  const add = (id: string, reason: InvalidReason) => {
    const list = invalid.get(id) ?? [];
    list.push(reason);
    invalid.set(id, list);
  };

  for (const inst of instances) {
    const world = worlds.get(inst.instanceId);
    if (!world) continue;
    if (!isInsideCase(world, geometry)) add(inst.instanceId, { type: 'out-of-bounds' });
    if (geometry.cameraZone.length >= 3 && polygonsCollide(world, geometry.cameraZone, 0)) {
      add(inst.instanceId, { type: 'camera' });
    }
  }

  for (let i = 0; i < instances.length; i++) {
    for (let j = i + 1; j < instances.length; j++) {
      const a = instances[i]!;
      const b = instances[j]!;
      const wa = worlds.get(a.instanceId);
      const wb = worlds.get(b.instanceId);
      if (!wa || !wb) continue;
      if (polygonsCollide(wa, wb, marginMm)) {
        add(a.instanceId, { type: 'overlap', otherInstanceId: b.instanceId });
        add(b.instanceId, { type: 'overlap', otherInstanceId: a.instanceId });
      }
    }
  }
  return invalid;
}
