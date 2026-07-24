import type { CSSProperties } from 'react';

interface Point {
  x: number;
  y: number;
}

export interface CameraModuleIconProps {
  anchoMm: number;
  altoMm: number;
  radioEsquinaMm: number;
  cameraZone: Point[];
  moduloForma: string;
  /** Alto del icono en px (el ancho se deriva de la proporcion real). */
  height?: number;
  title?: string;
  style?: CSSProperties;
}

/**
 * Esquema del modulo de camara (SS6.2): trasera del iPhone a escala real con
 * el modulo dibujado desde la zona de camara del seed. Es la ayuda de
 * identificacion para quien no sabe que modelo tiene.
 */
export function CameraModuleIcon({
  anchoMm,
  altoMm,
  radioEsquinaMm,
  cameraZone,
  moduloForma,
  height = 48,
  title,
  style,
}: CameraModuleIconProps) {
  const scale = height / altoMm;
  const w = anchoMm * scale;
  const xs = cameraZone.map((p) => p.x);
  const ys = cameraZone.map((p) => p.y);
  const zone = {
    x: Math.min(...xs) * scale,
    y: Math.min(...ys) * scale,
    w: (Math.max(...xs) - Math.min(...xs)) * scale,
    h: (Math.max(...ys) - Math.min(...ys)) * scale,
  };
  const lenses = lensLayout(moduloForma, zone);
  const moduleRadius = Math.min(zone.w, zone.h) * (moduloForma.startsWith('cuadrado') ? 0.28 : 0.5);

  return (
    <svg
      width={w}
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      style={style}
    >
      {title && <title>{title}</title>}
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={height - 1}
        rx={radioEsquinaMm * scale}
        fill="var(--surface-2)"
        stroke="var(--border)"
      />
      <rect
        x={zone.x}
        y={zone.y}
        width={zone.w}
        height={zone.h}
        rx={moduleRadius}
        fill="var(--pink-100)"
        stroke="var(--pink-300)"
      />
      {lenses.map((l, i) => (
        <circle
          key={i}
          cx={l.x}
          cy={l.y}
          r={l.r}
          fill="var(--surface)"
          stroke="var(--pink-500)"
          strokeWidth={1.2}
        />
      ))}
    </svg>
  );
}

function lensLayout(
  forma: string,
  zone: { x: number; y: number; w: number; h: number },
): { x: number; y: number; r: number }[] {
  const cx = zone.x + zone.w / 2;
  const cy = zone.y + zone.h / 2;
  const s = Math.min(zone.w, zone.h);
  switch (forma) {
    case 'cuadrado-triple':
      return [
        { x: zone.x + zone.w * 0.32, y: zone.y + zone.h * 0.28, r: s * 0.16 },
        { x: zone.x + zone.w * 0.32, y: zone.y + zone.h * 0.72, r: s * 0.16 },
        { x: zone.x + zone.w * 0.72, y: cy, r: s * 0.16 },
      ];
    case 'cuadrado-diagonal':
      return [
        { x: zone.x + zone.w * 0.34, y: zone.y + zone.h * 0.32, r: s * 0.17 },
        { x: zone.x + zone.w * 0.66, y: zone.y + zone.h * 0.68, r: s * 0.17 },
      ];
    case 'barra-horizontal':
      return [
        { x: zone.x + zone.w * 0.25, y: cy, r: zone.h * 0.28 },
        { x: cx, y: cy, r: zone.h * 0.28 },
        { x: zone.x + zone.w * 0.75, y: cy, r: zone.h * 0.28 },
      ];
    case 'vertical-doble':
    case 'vertical':
      return [
        { x: cx, y: zone.y + zone.h * 0.28, r: zone.w * 0.3 },
        { x: cx, y: zone.y + zone.h * 0.72, r: zone.w * 0.3 },
      ];
    case 'camara-unica-vertical':
      return [{ x: cx, y: cy, r: Math.min(zone.w, zone.h) * 0.34 }];
    default:
      return [{ x: cx, y: cy, r: s * 0.25 }];
  }
}
