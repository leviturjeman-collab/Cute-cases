/**
 * Motor de colisiones v4 (SS8). TypeScript puro, sin three.js ni DOM,
 * compartido tal cual entre cliente y servidor.
 * Espacio: plano 2D de la cara trasera, mm, origen esquina superior
 * izquierda, X a la derecha, Y hacia abajo (SS8.2).
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Poligono simple como lista ordenada de vertices en mm. */
export type Polygon = Vec2[];

/** Hitbox de elemento: uno o varios poligonos CONVEXOS, origen = centro (SS8.2). */
export type Hitbox = Polygon[];

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Instancia colocada (contrato PlacedItem de SS7.2, sin campos de UI). */
export interface PlacedItem {
  instanceId: string;
  elementId: string;
  xMm: number;
  yMm: number;
  rotationDeg: number; // 0-360 float
  letterChar?: string;
}

/** Datos de catalogo que necesita el validador por elemento. */
export interface ElementShape {
  hitbox: Hitbox;
  anchoMm: number;
  altoMm: number;
}

/** Geometria del dispositivo (SS8.2). */
export interface DeviceSpec {
  anchoMm: number;
  altoMm: number;
  radioEsquinaMm: number;
  /** Poligono de la zona de camara SIN inflar; el motor la infla 1 mm. */
  cameraZone: Polygon;
}

export type InvalidReasonCode = 'FUERA_DE_FUNDA' | 'SOBRE_CAMARA' | 'SOLAPA';

export interface ValidationResult {
  valida: boolean;
  motivo?: InvalidReasonCode;
  /** instanceIds implicados cuando motivo = SOLAPA (SS8.3). */
  refs?: string[];
}

/** Margen de seguridad entre piezas por defecto (Settings.collisionMarginMm). */
export const DEFAULT_MARGIN_MM = 0.5;

/** Inflado fijo de la zona de camara: margen de fabricacion (SS8.2). */
export const CAMERA_INFLATE_MM = 1;

/** Vertices por esquina del contorno redondeado (SS8.2: 7 por esquina, 28 total). */
export const CORNER_SEGMENTS = 7;
