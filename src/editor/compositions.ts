import type { DeviceSpec } from './types';
import type { Vec2 } from '@/lib/collision';

/**
 * Composiciones rapidas (N9): plantillas de DISPOSICION (no de contenido).
 * Los anclajes se calculan por modelo, proporcionales al contorno y a la
 * zona de camara. Anclaje invalido se salta en la colocacion.
 */

export type CompositionId = 'marco' | 'diagonal' | 'columna' | 'orbita' | 'esquina';

export const COMPOSITIONS: CompositionId[] = ['marco', 'diagonal', 'columna', 'orbita', 'esquina'];

function cameraBounds(device: DeviceSpec) {
  const xs = device.cameraZone.map((p) => p.x);
  const ys = device.cameraZone.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function outsideCamera(device: DeviceSpec, p: Vec2, clearMm = 8): boolean {
  const c = cameraBounds(device);
  return (
    p.x < c.minX - clearMm || p.x > c.maxX + clearMm || p.y < c.minY - clearMm || p.y > c.maxY + clearMm
  );
}

export function compositionAnchors(id: CompositionId, device: DeviceSpec): Vec2[] {
  const a = device.anchoMm;
  const h = device.altoMm;
  const inset = 13;
  let pts: Vec2[] = [];
  switch (id) {
    case 'marco':
      // Perimetro con separacion uniforme; la esquina de la camara se descarta
      pts = [
        { x: a / 2, y: inset },
        { x: a - inset, y: inset },
        { x: a - inset, y: h * 0.33 },
        { x: a - inset, y: h * 0.66 },
        { x: a - inset, y: h - inset },
        { x: a / 2, y: h - inset },
        { x: inset, y: h - inset },
        { x: inset, y: h * 0.66 },
        { x: inset, y: h * 0.4 },
      ];
      break;
    case 'diagonal':
      pts = [
        { x: a * 0.3, y: h * 0.42 },
        { x: a * 0.45, y: h * 0.56 },
        { x: a * 0.6, y: h * 0.7 },
        { x: a * 0.75, y: h * 0.84 },
      ];
      break;
    case 'columna':
      pts = [
        { x: a - inset, y: h * 0.3 },
        { x: a - inset, y: h * 0.46 },
        { x: a - inset, y: h * 0.62 },
        { x: a - inset, y: h * 0.78 },
      ];
      break;
    case 'orbita': {
      // Arco alrededor del modulo de camara
      const c = cameraBounds(device);
      const cx = (c.minX + c.maxX) / 2;
      const cy = (c.minY + c.maxY) / 2;
      const radius = Math.max(c.maxX - c.minX, c.maxY - c.minY) / 2 + 13;
      for (const deg of [300, 330, 0, 30, 60]) {
        const rad = (deg * Math.PI) / 180;
        pts.push({ x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) });
      }
      break;
    }
    case 'esquina':
      pts = [
        { x: a - 16, y: h - 16 },
        { x: a - 32, y: h - 14 },
        { x: a - 14, y: h - 32 },
      ];
      break;
  }
  return pts.filter(
    (p) => p.x >= 8 && p.x <= a - 8 && p.y >= 8 && p.y <= h - 8 && outsideCamera(device, p),
  );
}
