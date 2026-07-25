import type { CSSProperties } from 'react';
import { moduleLayout } from '@/assets-procedural/moduleLayout';

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
  // Misma disposicion calibrada que la funda 3D; el layout trabaja en mm,
  // asi que se calcula sin escalar y se escala al dibujar
  const zoneMm = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
  const layout = moduleLayout(moduloForma, zoneMm);
  const lenses = layout.lenses.map((l) => ({ x: l.x * scale, y: l.y * scale, r: l.r * scale }));
  const flash = {
    x: layout.flash.x * scale,
    y: layout.flash.y * scale,
    r: layout.flash.r * scale,
  };
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
      <circle cx={flash.x} cy={flash.y} r={Math.max(1.2, flash.r)} fill="var(--pink-300)" />
    </svg>
  );
}
