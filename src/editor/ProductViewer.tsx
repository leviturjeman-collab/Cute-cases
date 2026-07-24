'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
 * por arrastre que el editor, sin herramientas ni seleccion. Hint discreto
 * "Arrastra para girar" la primera vez.
 */
export function ProductViewer({
  device,
  material,
  colorHex,
  items = [],
  catalog,
  className = '',
}: ProductViewerProps) {
  const t = useTranslations('fundas');
  const [hint, setHint] = useState(false);

  useEffect(() => {
    void loadLetterFont().catch(() => undefined);
    try {
      if (!window.sessionStorage.getItem('cc.hint.orbit')) {
        setHint(true);
        window.sessionStorage.setItem('cc.hint.orbit', '1');
        const timer = setTimeout(() => setHint(false), 3500);
        return () => clearTimeout(timer);
      }
    } catch {
      // sin sessionStorage
    }
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
      {hint && (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[13px] font-medium text-text-soft">
          {t('arrastraParaGirar')}
        </p>
      )}
    </div>
  );
}
