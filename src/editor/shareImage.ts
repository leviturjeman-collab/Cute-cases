'use client';

/**
 * Imagen para redes (SS16.1): composicion 1080x1920 en cliente — captura del
 * visor en vista tres cuartos sobre fondo --bg con vineta sutil, nombre en
 * Poppins 600 y wordmark + URL como marca de agua inferior (opacidad 85%).
 * WebP con fallback PNG; Web Share API con fallback a descarga.
 * (Formato 1080x1080: decision pendiente; por defecto solo 9:16.)
 */

export async function composeShareImage(
  renderCanvas: HTMLCanvasElement,
  designName: string,
): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FDF7FA';
  ctx.fillRect(0, 0, W, H);

  // Vineta sutil
  const vignette = ctx.createRadialGradient(W / 2, H * 0.44, H * 0.2, W / 2, H * 0.44, H * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(31,27,30,0.06)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Render centrado
  const side = Math.min(renderCanvas.width, renderCanvas.height);
  const sx = (renderCanvas.width - side) / 2;
  const sy = (renderCanvas.height - side) / 2;
  const target = W * 0.86;
  ctx.drawImage(renderCanvas, sx, sy, side, side, (W - target) / 2, H * 0.16, target, target);

  // Nombre del diseno en Poppins 600
  ctx.fillStyle = '#1F1B1E';
  ctx.textAlign = 'center';
  ctx.font = '600 64px Poppins, Inter, sans-serif';
  ctx.fillText(designName, W / 2, H * 0.16 + target + 110, W * 0.88);

  // Marca de agua inferior (85%)
  ctx.globalAlpha = 0.85;
  ctx.font = '600 44px Poppins, Inter, sans-serif';
  const wordmark = 'CUTE CASES';
  ctx.save();
  ctx.translate(W / 2, H - 140);
  ctx.fillText(wordmark.split('').join(' '), 0, 0);
  ctx.restore();
  ctx.font = '500 30px Inter, sans-serif';
  ctx.fillStyle = '#6E5F68';
  ctx.fillText('cutecases.es', W / 2, H - 88);
  ctx.globalAlpha = 1;

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('toBlob'))), 'image/png');
      },
      'image/webp',
      0.9,
    );
  });
}

export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Cute Cases' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
