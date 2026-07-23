import type { CaseGeometry, ElementInstance, ElementShape, Vec2 } from './types';
import { DEFAULT_SAFETY_MARGIN_MM } from './types';
import { validatePlacement } from './validate';

/**
 * Búsqueda de hueco libre (§6.4): al tocar una miniatura, el elemento se añade
 * en el centro libre de la funda o en la zona libre más cercana al centro,
 * con búsqueda en espiral. Si no hay hueco → null (la UI muestra E-06).
 */
export function findFreeSpot(
  elementId: string,
  shape: ElementShape,
  others: ElementInstance[],
  shapes: ReadonlyMap<string, ElementShape>,
  geometry: CaseGeometry,
  marginMm: number = DEFAULT_SAFETY_MARGIN_MM,
  preferred?: Vec2,
): Vec2 | null {
  const center: Vec2 = preferred ?? { x: geometry.anchoMm / 2, y: geometry.altoMm / 2 };
  const probe = (x: number, y: number): boolean => {
    const candidate: ElementInstance = {
      instanceId: '__probe__',
      elementId,
      xMm: x,
      yMm: y,
      rotacionGrados: 0,
    };
    const all = new Map(shapes);
    all.set(elementId, shape);
    return validatePlacement(candidate, others, all, geometry, marginMm).valid;
  };

  if (probe(center.x, center.y)) return center;

  // Espiral de Arquímedes discretizada: paso radial 2 mm, muestreo angular denso
  const stepMm = 2;
  const maxRadius = Math.hypot(geometry.anchoMm, geometry.altoMm) / 2 + stepMm;
  for (let r = stepMm; r <= maxRadius; r += stepMm) {
    const samples = Math.max(8, Math.ceil((2 * Math.PI * r) / stepMm));
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * 2 * Math.PI;
      const x = center.x + r * Math.cos(angle);
      const y = center.y + r * Math.sin(angle);
      if (x < 0 || y < 0 || x > geometry.anchoMm || y > geometry.altoMm) continue;
      if (probe(x, y)) return { x, y };
    }
  }
  return null;
}

export interface LetterPlacement {
  letraChar: string;
  elementId: string;
  xMm: number;
  yMm: number;
}

/** Separación entre hitboxes de letras contiguas (§4.4). */
export const LETTER_GAP_MM = 2;

/**
 * Coloca una fila de letras centrada en la mayor zona libre disponible (§4.4).
 * Si no caben todas: coloca las que quepan EN ORDEN (E-07). Si no cabe
 * ninguna: lista vacía (E-06).
 */
export function placeLettersRow(
  letters: { letraChar: string; elementId: string; shape: ElementShape }[],
  others: ElementInstance[],
  shapes: ReadonlyMap<string, ElementShape>,
  geometry: CaseGeometry,
  marginMm: number = DEFAULT_SAFETY_MARGIN_MM,
): LetterPlacement[] {
  const allShapes = new Map(shapes);
  for (const l of letters) allShapes.set(l.elementId, l.shape);

  const tryRow = (count: number): LetterPlacement[] | null => {
    const subset = letters.slice(0, count);
    const totalWidth =
      subset.reduce((acc, l) => acc + l.shape.anchoMm, 0) + LETTER_GAP_MM * (count - 1);
    if (totalWidth > geometry.anchoMm) return null;
    const maxAlto = Math.max(...subset.map((l) => l.shape.altoMm));

    // Candidatos de fila: y desde el centro hacia fuera en pasos de 2 mm
    const centerY = geometry.altoMm / 2;
    const yCandidates: number[] = [centerY];
    for (let d = 2; d <= geometry.altoMm / 2; d += 2) {
      yCandidates.push(centerY + d, centerY - d);
    }

    for (const y of yCandidates) {
      if (y - maxAlto / 2 < 0 || y + maxAlto / 2 > geometry.altoMm) continue;
      const startX = (geometry.anchoMm - totalWidth) / 2;
      let cursor = startX;
      const placed: LetterPlacement[] = [];
      const placedInstances: ElementInstance[] = [];
      let ok = true;
      for (const l of subset) {
        const x = cursor + l.shape.anchoMm / 2;
        const candidate: ElementInstance = {
          instanceId: `__letter_${placed.length}__`,
          elementId: l.elementId,
          xMm: x,
          yMm: y,
          rotacionGrados: 0,
          letraChar: l.letraChar,
        };
        const result = validatePlacement(
          candidate,
          [...others, ...placedInstances],
          allShapes,
          geometry,
          marginMm,
        );
        if (!result.valid) {
          ok = false;
          break;
        }
        placed.push({ letraChar: l.letraChar, elementId: l.elementId, xMm: x, yMm: y });
        placedInstances.push(candidate);
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
