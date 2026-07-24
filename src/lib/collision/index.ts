export * from './types';
export * from './geometry';
export * from './sat';
export * from './validate';
export * from './placement';

import type { Hitbox } from './types';

/** Hitbox rectangular centrada (cadenas y letras la usan por diseno, SS11.6). */
export function rectHitbox(anchoMm: number, altoMm: number): Hitbox {
  const w = anchoMm / 2;
  const h = altoMm / 2;
  return [
    [
      { x: -w, y: -h },
      { x: w, y: -h },
      { x: w, y: h },
      { x: -w, y: h },
    ],
  ];
}
