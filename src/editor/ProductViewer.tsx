'use client';

import { useEffect, useMemo } from 'react';
import { Viewer3D } from './Viewer3D';
import { loadLetterFont } from '@/assets-procedural';
import type { CatalogElement, DeviceSpec } from './types';
import type { PlacedItem } from '@/lib/collision';

export interface ProductViewerProps {
  device: DeviceSpec;
  material: string;
  colorHex: string;
  items?: PlacedItem[];
  catalog?: ReadonlyMap<string, CatalogElement>;
  className?: string;
}

/**
 * Visor de solo visualizacion (SS6.4, SS6.5, SS6.8): misma camara de orbita
 * por arrastre que el editor, sin herramientas ni seleccion.
 */
export function ProductViewer({
  device,
  material,
  colorHex,
  items = [],
  catalog,
  className = '',
}: ProductViewerProps) {
  useEffect(() => {
    void loadLetterFont().catch(() => undefined);
  }, []);

  const emptyCatalog = useMemo(() => new Map<string, CatalogElement>(), []);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <Viewer3D
        device={device}
        material={material}
        colorHex={colorHex}
        items={items}
        catalog={catalog ?? emptyCatalog}
      />
    </div>
  );
}
