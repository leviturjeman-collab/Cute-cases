import type { Hitbox, PlacedItem, Polygon } from '@/lib/collision';

/** Especificaciones que consume el editor (contratos SS7.2). */

export interface DeviceSpec {
  id: string;
  slug: string;
  nombre: string;
  anchoMm: number;
  altoMm: number;
  radioEsquinaMm: number;
  grosorMm: number;
  cameraZone: Polygon;
  moduloForma: string;
}

export interface CaseBaseSpec {
  id: string;
  slug: string;
  nombre: string;
  material: string;
}

export interface CaseVariantSpec {
  id: string;
  colorNombre: string;
  colorHex: string;
  precioCentimos: number;
  disponible: boolean;
}

export interface CatalogElement {
  id: string;
  slug: string;
  nombre: string;
  tipo: 'charm3d' | 'plano';
  categoria: string;
  precioCentimos: number;
  anchoMm: number;
  altoMm: number;
  profundidadMm: number | null;
  recipe: string | null;
  recipeParams: Record<string, unknown> | null;
  assetUrl: string | null;
  hitbox: Hitbox;
  acabado: string;
  colores: string[];
  letraChar: string | null;
  esNuevo: boolean;
}

export type CategoryId =
  | 'corazones'
  | 'lazos'
  | 'flores'
  | 'frutas'
  | 'animales'
  | 'estrellas'
  | 'cadenas'
  | 'letras'
  | 'temporada';

export const CATEGORY_ORDER: CategoryId[] = [
  'corazones',
  'lazos',
  'flores',
  'frutas',
  'animales',
  'estrellas',
  'cadenas',
  'letras',
];

/** Poses nombradas de camara (atajos, SS7.3). */
export type SnapView = 'trasera' | 'lateral-izq' | 'lateral-der';

export interface CameraPose {
  azimuthDeg: number;
  polarDeg: number;
}

/** Vista inicial: trasera con 8 grados de inclinacion polar (SS7.3). */
export const SNAP_POSES: Record<SnapView, CameraPose> = {
  trasera: { azimuthDeg: 0, polarDeg: 82 },
  'lateral-izq': { azimuthDeg: -70, polarDeg: 90 },
  'lateral-der': { azimuthDeg: 70, polarDeg: 90 },
};

export type EditorStatus =
  | 'loading-assets'
  | 'ready'
  | 'dragging'
  | 'rotating-item'
  | 'saving'
  | 'resolving-expired'
  | 'asset-error';

export type { PlacedItem };
