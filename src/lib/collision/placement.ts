import { buildSceneContext, esValida } from './validate';
import {
  DEFAULT_MARGIN_MM,
  type DeviceSpec,
  type ElementShape,
  type PlacedItem,
  type Vec2,
} from './types';

/**
 * Anadir por tap (SS7.5): posicion valida mas cercana al centro. Se evalua el
 * centro; si es invalido, busqueda en espiral (paso 2 mm, hasta 400
 * candidatos) probando 4 rotaciones (0/90/180/270) por candidato.
 */
export function findFreeSpot(
  elementId: string,
  shape: ElementShape,
  others: PlacedItem[],
  shapes: ReadonlyMap<string, ElementShape>,
  device: DeviceSpec,
  marginMm: number = DEFAULT_MARGIN_MM,
  preferred?: Vec2,
): { x: number; y: number; rotationDeg: number } | null {
  const ctx = buildSceneContext(device, marginMm);
  const all = new Map(shapes);
  all.set(elementId, shape);
  const center: Vec2 = preferred ?? { x: device.anchoMm / 2, y: device.altoMm / 2 };

  const probe = (x: number, y: number, rot: number): boolean =>
    esValida(
      { instanceId: '__probe__', elementId, xMm: x, yMm: y, rotationDeg: rot },
      others,
      all,
      ctx,
    ).valida;

  const ROTATIONS = [0, 90, 180, 270];

  for (const rot of ROTATIONS) {
    if (probe(center.x, center.y, rot)) return { x: center.x, y: center.y, rotationDeg: rot };
  }

  const stepMm = 2;
  let candidates = 0;
  const maxRadius = Math.hypot(device.anchoMm, device.altoMm) / 2 + stepMm;
  for (let r = stepMm; r <= maxRadius && candidates < 400; r += stepMm) {
    const samples = Math.max(8, Math.ceil((2 * Math.PI * r) / stepMm));
    for (let i = 0; i < samples && candidates < 400; i++) {
      const angle = (i / samples) * 2 * Math.PI;
      const x = center.x + r * Math.cos(angle);
      const y = center.y + r * Math.sin(angle);
      if (x < 0 || y < 0 || x > device.anchoMm || y > device.altoMm) continue;
      candidates++;
      for (const rot of ROTATIONS) {
        if (probe(x, y, rot)) return { x, y, rotationDeg: rot };
      }
    }
  }
  return null;
}

export interface LetterPlacement {
  letterChar: string;
  elementId: string;
  xMm: number;
  yMm: number;
}

/** Separacion entre hitboxes de letras contiguas (SS11.5). */
export const LETTER_GAP_MM = 2;

/**
 * Colocacion de letras (SS11.5): fila centrada en la mayor franja horizontal
 * libre, separacion 2 mm; parciales permitidos (T-07); imposible -> [] (T-06).
 */
export function placeLettersRow(
  letters: { letterChar: string; elementId: string; shape: ElementShape }[],
  others: PlacedItem[],
  shapes: ReadonlyMap<string, ElementShape>,
  device: DeviceSpec,
  marginMm: number = DEFAULT_MARGIN_MM,
): LetterPlacement[] {
  const ctx = buildSceneContext(device, marginMm);
  const allShapes = new Map(shapes);
  for (const l of letters) allShapes.set(l.elementId, l.shape);

  const tryRow = (count: number): LetterPlacement[] | null => {
    const subset = letters.slice(0, count);
    const totalWidth =
      subset.reduce((acc, l) => acc + l.shape.anchoMm, 0) + LETTER_GAP_MM * (count - 1);
    if (totalWidth > device.anchoMm) return null;
    const maxAlto = Math.max(...subset.map((l) => l.shape.altoMm));

    const centerY = device.altoMm / 2;
    const yCandidates: number[] = [centerY];
    for (let d = 2; d <= device.altoMm / 2; d += 2) {
      yCandidates.push(centerY + d, centerY - d);
    }

    for (const y of yCandidates) {
      if (y - maxAlto / 2 < 0 || y + maxAlto / 2 > device.altoMm) continue;
      const startX = (device.anchoMm - totalWidth) / 2;
      let cursor = startX;
      const placed: LetterPlacement[] = [];
      const placedItems: PlacedItem[] = [];
      let ok = true;
      for (const l of subset) {
        const x = cursor + l.shape.anchoMm / 2;
        const candidate: PlacedItem = {
          instanceId: `__letter_${placed.length}__`,
          elementId: l.elementId,
          xMm: x,
          yMm: y,
          rotationDeg: 0,
          letterChar: l.letterChar,
        };
        if (!esValida(candidate, [...others, ...placedItems], allShapes, ctx).valida) {
          ok = false;
          break;
        }
        placed.push({ letterChar: l.letterChar, elementId: l.elementId, xMm: x, yMm: y });
        placedItems.push(candidate);
        cursor += l.shape.anchoMm + LETTER_GAP_MM;
      }
      if (ok) return placed;
    }
    return null;
  };

  for (let count = letters.length; count >= 1; count--) {
    const row = tryRow(count);
    if (row) return row;
  }
  return [];
}
