/**
 * Encaje de camara (anexo v4.3 E1): la distancia se deriva del fov, del
 * aspecto del area util (canvas menos UI superpuesta) y de la geometria del
 * modelo — nunca de una constante estetica.
 */

export interface FitViewport {
  width: number;
  height: number;
}

export interface FitOcclusions {
  topPx: number;
  bottomPx: number;
}

export const FIT_MARGIN = 1.12;
export const FIT_FOV_DEG = 32;

const degToRad = (d: number): number => (d * Math.PI) / 180;

/**
 * Distancia minima a la que la funda entra completa en el area util del
 * canvas, con margen perimetral. El area util es el viewport menos las
 * franjas ocluidas arriba/abajo; el encaje considera alto Y ancho.
 */
export function computeFitDistance(
  device: { anchoMm: number; altoMm: number },
  viewport: FitViewport,
  occlusions: FitOcclusions = { topPx: 0, bottomPx: 0 },
  fovVDeg: number = FIT_FOV_DEG,
  margin: number = FIT_MARGIN,
): number {
  const height = Math.max(1, viewport.height);
  const usableH = Math.max(1, height - occlusions.topPx - occlusions.bottomPx);
  const usableW = Math.max(1, viewport.width);
  const halfTanV = Math.tan(degToRad(fovVDeg) / 2);
  // Semitangentes efectivas del sub-rectangulo util (el fov vertical nominal
  // corresponde al alto TOTAL del canvas).
  const tanV = halfTanV * (usableH / height);
  const tanH = halfTanV * (usableW / height);
  const dV = device.altoMm / 2 / tanV;
  const dH = device.anchoMm / 2 / tanH;
  return Math.max(dV, dH) * margin;
}

/**
 * Desplazamiento vertical del target (unidades de mundo) para que el centro
 * optico coincida con el centro del area util, no con el del canvas.
 * Target hacia abajo (negativo) sube la escena en pantalla.
 */
export function computeFitTargetY(
  distance: number,
  viewport: FitViewport,
  occlusions: FitOcclusions = { topPx: 0, bottomPx: 0 },
  fovVDeg: number = FIT_FOV_DEG,
): number {
  const height = Math.max(1, viewport.height);
  const worldPerPx = (2 * distance * Math.tan(degToRad(fovVDeg) / 2)) / height;
  return -((occlusions.bottomPx - occlusions.topPx) / 2) * worldPerPx;
}

/** Distancia para encuadrar una pieza (N5): 30% de aire alrededor. */
export function computePieceFitDistance(
  sizeMm: number,
  viewport: FitViewport,
  fovVDeg: number = FIT_FOV_DEG,
): number {
  const halfTanV = Math.tan(degToRad(fovVDeg) / 2);
  const aspect = Math.max(0.2, viewport.width / Math.max(1, viewport.height));
  const tanMin = halfTanV * Math.min(1, aspect);
  return (sizeMm * 1.3) / 2 / tanMin;
}
