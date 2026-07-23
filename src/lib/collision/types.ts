/**
 * Módulo de colisiones de Cute Cases (§6.6).
 * TypeScript puro, sin dependencias de three.js. Compartido cliente/servidor.
 * Unidades: SIEMPRE milímetros. Origen del plano: esquina superior izquierda
 * de la cara trasera de la funda. Eje X hacia la derecha, eje Y hacia abajo.
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Polígono simple (convexo o cóncavo) como lista ordenada de vértices en mm. */
export type Polygon = Vec2[];

/** Caja alineada a ejes para broad-phase. */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Instancia de un elemento colocado en un diseño (§12.2 Design.elementos). */
export interface ElementInstance {
  /** id local de la instancia dentro del diseño (para selección/undo). */
  instanceId: string;
  elementId: string;
  /** Centro del elemento, en mm desde la esquina superior izquierda de la funda. */
  xMm: number;
  yMm: number;
  /** Rotación libre 0–360 (float, grados, sentido horario). */
  rotacionGrados: number;
  letraChar?: string;
}

/** Datos mínimos de catálogo que necesita el validador para cada elemento. */
export interface ElementShape {
  /** Hitbox en mm con origen en el CENTRO del elemento (§12.2 Element.hitbox). */
  hitbox: Polygon;
  anchoMm: number;
  altoMm: number;
}

/** Geometría de la funda/dispositivo necesaria para validar (§4.1). */
export interface CaseGeometry {
  anchoMm: number;
  altoMm: number;
  radioEsquinaMm: number;
  /** Polígono de la zona de cámara en mm, origen esquina sup. izq. */
  cameraZone: Polygon;
}

export type InvalidReason =
  | { type: 'overlap'; otherInstanceId: string }
  | { type: 'camera' }
  | { type: 'out-of-bounds' };

export interface PlacementResult {
  valid: boolean;
  reasons: InvalidReason[];
}

/** Margen de seguridad global por defecto entre hitboxes (§6.6, regla 1). */
export const DEFAULT_SAFETY_MARGIN_MM = 0.5;
