'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CatalogElement, DeviceSpec } from '@/editor/types';
import type { PlacedItem } from '@/lib/collision';

const Viewer3D = dynamic(() => import('@/editor/Viewer3D').then((m) => m.Viewer3D), {
  ssr: false,
});

export interface HeroSceneData {
  device: DeviceSpec;
  material: string;
  colorHex: string;
  items: PlacedItem[];
  elements: CatalogElement[];
}

/**
 * Hero de la home (rediseno realista): la funda rosa REAL en 3D, girando
 * suavemente y arrastrable — el producto es el hero, no una captura.
 * El render estatico actua de poster hasta que el visor esta listo.
 */
export function Hero3D({ scene }: { scene: HeroSceneData }) {
  const t = useTranslations('home');
  const [ready, setReady] = useState(false);
  const catalog = useMemo(
    () => new Map(scene.elements.map((e) => [e.id, e])),
    [scene.elements],
  );

  return (
    <div className="relative h-full w-full">
      {/* Poster estatico mientras carga el bundle 3D */}
      {!ready && (
        <Image
          src="/renders/hero-poster.webp"
          alt={t('heroAlt')}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain"
        />
      )}
      <div
        className={`h-full w-full transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
        onPointerEnter={() => setReady(true)}
      >
        <Viewer3D
          device={scene.device}
          material={scene.material}
          colorHex={scene.colorHex}
          items={scene.items}
          catalog={catalog}
          autoRotate
          transparentBg
          onCameraChange={ready ? undefined : () => setReady(true)}
        />
      </div>
    </div>
  );
}
