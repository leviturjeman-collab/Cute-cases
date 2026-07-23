'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, EmptyState, PriceTag, Select, Skeleton, useToast, Confetti } from '@/components/ui';
import { api } from '@/lib/api-client';
import type { ElementInstance, Polygon } from '@/lib/collision';
import type { CatalogElement } from '@/editor/types';
import { newInstanceId } from '@/editor/store';

const CaseViewer = dynamic(() => import('@/editor/CaseViewer').then((m) => m.CaseViewer), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

interface PresetDetail {
  id: string;
  slug: string;
  nombre: string;
  precioCentimos: number;
  elementos: ElementInstance[];
  caseVariantId: string | null;
  caseBase: {
    nombre: string;
    material: string;
    variantes: { id: string; colorNombre: string; colorHex: string }[];
    compatibles: { id: string; nombre: string; anchoMm: number; altoMm: number; radioEsquinaMm: number; cameraZone: Polygon }[];
  } | null;
  elementosCatalogo: CatalogElement[];
}

/** Ficha de preestablecido (§5.6): visor 3D giratorio, sin edición. */
export default function PresetFichaPage({ params }: { params: { slug: string } }) {
  const t = useTranslations();
  const { showToast } = useToast();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(0);

  const { data: preset, isLoading, isError } = useQuery({
    queryKey: ['preset', params.slug],
    queryFn: () => api<PresetDetail>(`/api/presets/${params.slug}`),
  });

  useEffect(() => {
    if (preset?.caseBase && !deviceId) {
      setDeviceId(preset.caseBase.compatibles[0]?.id ?? null);
    }
  }, [preset, deviceId]);

  const device = preset?.caseBase?.compatibles.find((d) => d.id === deviceId) ?? null;
  const variant = preset?.caseBase?.variantes.find((v) => v.id === preset.caseVariantId) ??
    preset?.caseBase?.variantes[0] ?? null;

  const catalog = useMemo(() => {
    const map = new Map<string, CatalogElement>();
    for (const el of preset?.elementosCatalogo ?? []) map.set(el.id, el);
    return map;
  }, [preset]);

  const instances = useMemo(
    () =>
      (preset?.elementos ?? []).map((e) => ({
        ...e,
        instanceId: e.instanceId ?? newInstanceId(),
      })),
    [preset],
  );

  const addToCart = async () => {
    if (!preset) return;
    try {
      await api('/api/cart', { method: 'POST', body: JSON.stringify({ presetId: preset.id }) });
      setConfetti((c) => c + 1);
      showToast(t('toasts.E02'), 'success');
    } catch {
      showToast(t('toasts.E15'), 'error');
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast(t('toasts.E03'), 'success');
    } catch {
      showToast(t('toasts.E15'), 'error');
    }
  };

  if (isError) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-4 pt-10">
          <EmptyState emoji="🥺" title={t('errores.noEncontrado')} />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <Confetti trigger={confetti} />
      <main className="mx-auto max-w-3xl px-4 pt-4">
        <div className="h-[46dvh] overflow-hidden rounded-card shadow-sm">
          {device && variant && preset ? (
            <CaseViewer
              device={device}
              variant={{ ...variant, material: preset.caseBase!.material }}
              instances={instances}
              catalog={catalog}
              view="trasera"
            />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </div>

        {isLoading || !preset ? (
          <Skeleton className="mt-4 h-24 w-full" />
        ) : (
          <Card className="mt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1>{preset.nombre}</h1>
                <p className="text-sm text-text-soft">{t('disenos.precioCerrado')}</p>
              </div>
              <PriceTag centimos={preset.precioCentimos} />
            </div>

            {preset.caseBase && preset.caseBase.compatibles.length > 0 && (
              <Select
                label={t('disenos.eligeModelo')}
                className="mt-4"
                value={deviceId ?? ''}
                onChange={(e) => setDeviceId(e.target.value)}
                options={preset.caseBase.compatibles.map((d) => ({ value: d.id, label: d.nombre }))}
              />
            )}

            <p className="mt-3 text-xs text-text-soft">{t('disenos.noEditable')}</p>

            <div className="mt-5 flex flex-col gap-2">
              <Button size="lg" onClick={() => void addToCart()}>
                {t('common.acciones.anadirCesta')}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => void share()}>
                {t('common.acciones.compartir')}
              </Button>
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </>
  );
}
