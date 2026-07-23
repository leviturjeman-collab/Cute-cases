import type { ElementInstance, Polygon } from '@/lib/collision';

/** Elemento de catálogo tal y como lo consume el editor/visor. */
export interface CatalogElement {
  id: string;
  nombre: string;
  tipo: 'charm3d' | 'plano';
  categoria?: string;
  precioCentimos?: number;
  anchoMm: number;
  altoMm: number;
  profundidadMm?: number | null;
  assetUrl: string;
  hitbox?: Polygon;
  esNuevo?: boolean;
  letraChar?: string | null;
}

export interface DeviceGeometry {
  id?: string;
  nombre?: string;
  anchoMm: number;
  altoMm: number;
  radioEsquinaMm: number;
  cameraZone: Polygon;
}

export interface VariantInfo {
  id: string;
  colorHex: string;
  colorNombre?: string;
  material: string; // "silicona" | "transparente" | "rigida" | ...
  precioCentimos?: number;
  nombre?: string;
}

/** Vistas controladas del visor (§6.2). Nunca órbita libre. */
export const VIEWS = ['trasera', 'lateral-izq', 'lateral-der', 'esquina-sup', 'esquina-inf'] as const;
export type ViewName = (typeof VIEWS)[number];

/** ¿Permite colocación esta vista? Solo la trasera (§6.2). */
export function viewAllowsPlacement(view: ViewName): boolean {
  return view === 'trasera';
}

export type { ElementInstance };
