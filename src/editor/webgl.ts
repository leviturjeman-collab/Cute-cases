'use client';

/** El editor requiere WebGL2 (§14); sin él se muestra E-14. */
export function hasWebGL2(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}
