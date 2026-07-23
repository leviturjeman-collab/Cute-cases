'use client';

/**
 * Imagen para redes (§8.1): composición 1080×1920 en cliente sobre canvas —
 * degradado rosa de marca con sparkles, render de la funda, nombre del diseño
 * y marca de agua Cute Cases. Entrega por Web Share API con fallback a
 * descarga. (Decisión pendiente del formato cuadrado: por defecto solo 9:16.)
 */

export async function composeStoryImage(
  renderCanvas: HTMLCanvasElement,
  designName: string,
): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Fondo degradado rosa de marca
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#FF69B4');
  grad.addColorStop(0.55, '#F5259C');
  grad.addColorStop(1, '#C71585');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Sparkles
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const sparkles = [
    [110, 220, 5], [940, 180, 7], [200, 1500, 6], [880, 1400, 5],
    [150, 800, 4], [980, 760, 5], [540, 130, 4], [90, 1180, 6], [1000, 1120, 4],
  ] as const;
  for (const [x, y, r] of sparkles) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const radius = i % 2 === 0 ? r * 2.4 : r;
      ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
  }

  // Render de la funda centrado
  const rw = renderCanvas.width;
  const rh = renderCanvas.height;
  const targetW = W * 0.78;
  const targetH = (rh / rw) * targetW;
  const rx = (W - targetW) / 2;
  const ry = (H - targetH) / 2 - 60;
  ctx.save();
  ctx.shadowColor = 'rgba(61,34,51,0.35)';
  ctx.shadowBlur = 60;
  ctx.drawImage(renderCanvas, rx, ry, targetW, targetH);
  ctx.restore();

  // Nombre del diseño
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '700 72px Fredoka, "Baloo 2", Quicksand, sans-serif';
  ctx.fillText(designName, W / 2, ry + targetH + 130, W * 0.9);

  // Marca de agua Cute Cases (logo + URL) abajo
  ctx.font = '700 54px Fredoka, "Baloo 2", Quicksand, sans-serif';
  ctx.fillText('Cute Cases 💖', W / 2, H - 150);
  ctx.font = '600 38px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('cutecases.es', W / 2, H - 90);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob falló'))),
      'image/webp',
      0.92,
    );
  });
}

/** Web Share API con fallback a descarga directa (§8.1). */
export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Cute Cases' });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // usuario canceló
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Miniatura 800×800 WebP para guardar (§6.9). */
export async function captureThumbnail(renderCanvas: HTMLCanvasElement): Promise<string> {
  const size = 800;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFE4F1';
  ctx.fillRect(0, 0, size, size);
  const scale = Math.min(size / renderCanvas.width, size / renderCanvas.height);
  const w = renderCanvas.width * scale;
  const h = renderCanvas.height * scale;
  ctx.drawImage(renderCanvas, (size - w) / 2, (size - h) / 2, w, h);
  const dataUrl = canvas.toDataURL('image/webp', 0.85);
  return dataUrl.split(',')[1] ?? '';
}
