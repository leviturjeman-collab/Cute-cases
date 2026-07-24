'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Share2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatCentimos } from '@/lib/pricing';
import { getRememberedDevice } from '@/lib/deviceStorage';
import { Badge, Button, Chip, useToast } from '@/components/ui';
import { track } from '@/lib/analytics';
import type { CatalogElement, DeviceSpec } from '@/editor/types';
import type { PlacedItem } from '@/lib/collision';

const ProductViewer = dynamic(
  () => import('@/editor/ProductViewer').then((m) => m.ProductViewer),
  {
    ssr: false,
    loading: () => <div className="skeleton-shimmer h-full w-full rounded-card" aria-hidden />,
  },
);

export interface PresetDetalle {
  id: string;
  slug: string;
  nombre: string;
  precioCentimos: number;
  fotos: string[];
  material: string;
  colorHex: string;
  fundaNombre: string | null;
  elementos: PlacedItem[];
  compatibles: DeviceSpec[];
  elementosCatalogo: CatalogElement[];
}

export function PresetFichaClient({ preset }: { preset: PresetDetalle }) {
  const t = useTranslations();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    track('preset_visto', { slug: preset.slug });
    const remembered = getRememberedDevice();
    if (remembered && preset.compatibles.some((d) => d.id === remembered.id)) {
      setDeviceId(remembered.id);
    }
  }, [preset.slug, preset.compatibles]);

  const device = preset.compatibles.find((d) => d.id === deviceId) ?? preset.compatibles[0] ?? null;
  const catalog = useMemo(
    () => new Map(preset.elementosCatalogo.map((e) => [e.id, e])),
    [preset.elementosCatalogo],
  );

  const addToCart = async () => {
    if (!deviceId) return;
    setAdding(true);
    try {
      await api('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ presetId: preset.id, deviceId, cantidad: 1 }),
      });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      track('anadido_cesta', { origen: 'preset' });
      showToast(t('toasts.T02'), 'success');
    } catch {
      showToast(t('toasts.T15'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: preset.nombre, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast(t('toasts.T03'), 'success');
      }
      track('compartido', { tipo: 'regalo' });
    } catch {
      // compartir cancelado por el usuario
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Solo visualizacion (SS6.5): camara libre, sin herramientas */}
        <div className="h-[62svh] min-h-[380px] overflow-hidden rounded-card border border-border bg-surface-2 lg:h-[560px]">
          {device && (
            <ProductViewer
              device={device}
              material={preset.material}
              colorHex={preset.colorHex}
              items={preset.elementos}
              catalog={catalog}
            />
          )}
        </div>

        <div>
          <Badge variant="casa">{t('common.badges.disenoCasa')}</Badge>
          <h1 className="mt-2 font-display text-[28px] font-semibold text-text">{preset.nombre}</h1>
          {preset.fundaNombre && <p className="mt-0.5 text-sm text-text-soft">{preset.fundaNombre}</p>}

          {/* Selector de modelo entre compatibles (SS6.5) */}
          <div className="mt-5">
            <p className="text-[13px] font-medium text-text">{t('disenos.eligeModelo')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {preset.compatibles.map((d) => (
                <Chip key={d.id} selected={deviceId === d.id} onClick={() => setDeviceId(d.id)}>
                  {d.nombre}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-baseline gap-2">
            <p className="tabular text-[20px] font-semibold text-text">
              {formatCentimos(preset.precioCentimos)}
            </p>
            <p className="text-sm text-text-soft">{t('disenos.precioCerrado')}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" onClick={addToCart} disabled={!deviceId} loading={adding}>
              {t('common.acciones.anadirCesta')}
            </Button>
            <Button size="lg" variant="secondary" icon={<Share2 aria-hidden />} onClick={share}>
              {t('common.acciones.compartir')}
            </Button>
          </div>

          {/* Regla de producto: los preestablecidos no se editan (SS6.5) */}
          <p className="mt-4 text-sm text-text-soft">{t('disenos.noEditable')}</p>
        </div>
      </div>
    </div>
  );
}
