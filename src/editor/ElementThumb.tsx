'use client';

import { useEffect, useState } from 'react';
import { queueElementThumbnail } from '@/assets-procedural/thumbnails';
import type { CatalogElement } from './types';

/**
 * Miniatura renderizada de un elemento (SS10.4): generacion offscreen en
 * cola idle con cache (memoria + IndexedDB). Mientras llega, un bloque
 * shimmer que replica la geometria (SS4.10) — nunca una imagen rota (D7).
 */
export function ElementThumb({ element, size = 56 }: { element: CatalogElement; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void queueElementThumbnail(element.id, element.recipe ?? 'fallback', {
      anchoMm: element.anchoMm,
      altoMm: element.altoMm,
      profundidadMm: element.profundidadMm,
      acabado: element.acabado,
      colores: element.colores,
      letraChar: element.letraChar,
      recipeParams: element.recipeParams,
    }).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [element]);

  if (!src) {
    return <span aria-hidden className="skeleton-shimmer rounded-thumb" style={{ width: size, height: size }} />;
  }
  return (
    <img
      src={src}
      alt={element.letraChar ? `${element.nombre} ${element.letraChar}` : element.nombre}
      width={size}
      height={size}
      className="rounded-thumb"
      draggable={false}
    />
  );
}
