'use client';

/**
 * Captura de miniatura (SS7.10): canvas en vista trasera pura, 1024x1024,
 * recortada y exportada a WebP (~80 KB objetivo, max 300 KB en API).
 */
export async function captureThumbnail(renderCanvas: HTMLCanvasElement): Promise<Blob> {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FDF7FA';
  ctx.fillRect(0, 0, size, size);
  // Recorte cuadrado centrado del render
  const side = Math.min(renderCanvas.width, renderCanvas.height);
  const sx = (renderCanvas.width - side) / 2;
  const sy = (renderCanvas.height - side) / 2;
  ctx.drawImage(renderCanvas, sx, sy, side, side, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/webp', 0.8);
  });
}
