'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, EmptyState, PriceTag, Skeleton } from '@/components/ui';
import { api } from '@/lib/api-client';
import { getRememberedDevice } from '@/lib/deviceStorage';
import type { Polygon } from '@/lib/collision';

const CaseViewer = dynamic(() => import('@/editor/CaseViewer').then((m) => m.CaseViewer), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

interface CaseDetail {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  material: string;
  fotos: string[];
  variantes: { id: string; colorNombre: string; colorHex: string; precioCentimos: number; disponible: boolean }[];
  compatibles: { id: string; nombre: string }[];
}

interface DevicesResponse {
  generaciones: Record<
    string,
    { id: string; nombre: string; anchoMm: number; altoMm: number; radioEsquinaMm: number; cameraZone: Polygon }[]
  >;
}

/** Ficha de funda (§5.5): visor 3D de la funda desnuda + selector de variante. */
export default function FundaFichaPage({ params }: { params: { slug: string } }) {
  const t = useTranslations();
  const router = useRouter();
  const [variantId, setVariantId] = useState<string | null>(null);

  const { data: funda, isLoading, isError } = useQuery({
    queryKey: ['case', params.slug],
    queryFn: () => api<CaseDetail>(`/api/cases/${params.slug}`),
  });
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<DevicesResponse>('/api/devices'),
  });

  useEffect(() => {
    if (funda && !variantId) {
      const first = funda.variantes.find((v) => v.disponible);
      if (first) setVariantId(first.id);
    }
  }, [funda, variantId]);

  const device = useMemo(() => {
    const remembered = getRememberedDevice();
    const all = devicesData ? Object.values(devicesData.generaciones).flat() : [];
    return (
      all.find((d) => d.id === remembered?.id && funda?.compatibles.some((c) => c.id === d.id)) ??
      all.find((d) => funda?.compatibles.some((c) => c.id === d.id)) ??
      null
    );
  }, [devicesData, funda]);

  const variant = funda?.variantes.find((v) => v.id === variantId) ?? null;

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
      <main className="mx-auto max-w-3xl px-4 pt-4">
        <div className="h-[46dvh] overflow-hidden rounded-card shadow-sm">
          {device && variant ? (
            <CaseViewer
              device={device}
              variant={{ ...variant, material: funda!.material }}
              instances={[]}
              catalog={new Map()}
              view="trasera"
            />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </div>

        {isLoading || !funda ? (
          <div className="mt-4 flex flex-col gap-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <Card className="mt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1>{funda.nombre}</h1>
                <p className="text-sm text-text-soft">{funda.material}</p>
              </div>
              {variant && <PriceTag centimos={variant.precioCentimos} />}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-bold text-text-soft">{t('fundas.colores')}</p>
              <div className="flex gap-2">
                {funda.variantes.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-label={v.colorNombre + (v.disponible ? '' : ` (${t('common.precio.agotada')})`)}
                    aria-pressed={v.id === variantId}
                    disabled={!v.disponible}
                    onClick={() => setVariantId(v.id)}
                    className={`h-10 w-10 rounded-pill border-2 disabled:opacity-30 ${
                      v.id === variantId ? 'border-pink-700 ring-2 ring-pink-300' : 'border-pink-200'
                    }`}
                    style={{ backgroundColor: v.colorHex }}
                  />
                ))}
              </div>
            </div>

            <p className="mt-4 text-sm">{funda.descripcion}</p>
            <p className="mt-2 text-xs text-text-soft">
              {t('fundas.compatibilidad')}: {funda.compatibles.map((c) => c.nombre).join(', ')}
            </p>

            <Button
              size="lg"
              className="mt-5 w-full"
              disabled={!variant}
              onClick={() => router.push(`/editor?variant=${variantId}`)}
            >
              {t('fundas.personalizar')}
            </Button>
          </Card>
        )}
      </main>
      <Footer />
    </>
  );
}
