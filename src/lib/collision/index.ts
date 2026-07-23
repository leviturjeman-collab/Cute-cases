export * from './types';
export * from './geometry';
export * from './sat';
export * from './validate';
export * from './placement';

import type { Polygon } from './types';

/** Hitbox rectangular centrada (fallback para elementos sin silueta afinada). */
export function rectHitbox(anchoMm: number, altoMm: number): Polygon {
  const w = anchoMm / 2;
  const h = altoMm / 2;
  return [
    { x: -w, y: -h },
    { x: w, y: -h },
    { x: w, y: h },
    { x: -w, y: h },
  ];
}
