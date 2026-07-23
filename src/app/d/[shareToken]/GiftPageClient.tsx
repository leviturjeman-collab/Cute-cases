'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, Confetti, EmptyState, Skeleton, useToast } from '@/components/ui';
import { api } from '@/lib/api-client';
import { formatCentimos } from '@/lib/pricing';
import type { ElementInstance, Polygon } from '@/lib/collision';
import type { CatalogElement } from '@/editor/types';
import { newInstanceId } from '@/editor/store';

const CaseViewer = dynamic(() => import('@/editor/CaseViewer').then((m) => m.CaseViewer), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

interface GiftData {
  id: string;
  nombre: string;
  shareNombre: string | null;
  device: { nombre: string; anchoMm: number; altoMm: number; radioEsquinaMm: number; cameraZone: Polygon };
  caseVariant: { colorNombre: string; colorHex: string; material: string; nombre: string };
  elementos: ElementInstance[];
  elementosCatalogo: CatalogElement[];
  desglose: { lines: { label: string; centimos: number }[]; totalCentimos: number };
  disponible: boolean;
}

/** Página regalo (§8.2): visor solo-ver + desglose + CTA "Regalárselo 🎁". */
export function GiftPageClient({ shareToken }: { shareToken: string }) {
  const t = useTranslations();
  const { showToast } = useToast();
  const [confetti, setConfetti] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gift', shareToken],
    queryFn: () => api<GiftData>(`/api/d/${shareToken}`),
  });

  const catalog = useMemo(() => {
    const map = new Map<string, CatalogElement>();
    for (const el of data?.elementosCatalogo ?? []) map.set(el.id, el);
    return map;
  }, [data]);

  const instances = useMemo(
    () => (data?.elementos ?? []).map((e) => ({ ...e, instanceId: e.instanceId ?? newInstanceId() })),
    [data],
  );

  const giftIt = async () => {
    if (!data) return;
    try {
      // En esta fase: añade el diseño a la cesta del visitante (§8.2)
      await api('/api/cart', { method: 'POST', body: JSON.stringify({ designId: data.id }) });
      setConfetti((c) => c + 1);
      showToast(t('toasts.E02'), 'success');
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
        <div className="h-[44dvh] overflow-hidden rounded-card shadow-sm">
          {data ? (
            <CaseViewer
              device={data.device}
              variant={data.caseVariant as never}
              instances={instances}
              catalog={catalog}
              view="trasera"
            />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </div>

        {isLoading || !data ? (
          <Skeleton className="mt-4 h-32 w-full" />
        ) : (
          <Card className="mt-4">
            <h1 className="text-center">
              {data.shareNombre
                ? t('regalo.titulo', { nombre: data.shareNombre })
                : t('regalo.tituloSinNombre')}
            </h1>
            <p className="mt-1 text-center text-sm text-text-soft">
              {data.nombre} · {data.device.nombre}
            </p>

            {!data.disponible && (
              <p className="mt-4 rounded-thumb bg-error-bg px-4 py-3 text-center font-bold text-error">
                {t('regalo.noDisponible')}
              </p>
            )}

            <div className="mt-4">
              <p className="mb-2 text-sm font-bold text-text-soft">{t('regalo.desglose')}</p>
              <ul className="flex flex-col gap-1 text-sm">
                {data.desglose.lines.map((line, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="truncate">{line.label}</span>
                    <span className="font-bold">{formatCentimos(line.centimos)}</span>
                  </li>
                ))}
                <li className="mt-1 flex justify-between border-t-2 border-pink-100 pt-2 font-display font-bold">
                  <span>{t('cesta.total')}</span>
                  <span className="text-pink-600">{formatCentimos(data.desglose.totalCentimos)}</span>
                </li>
              </ul>
            </div>

            <Button size="lg" className="mt-5 w-full" disabled={!data.disponible} onClick={() => void giftIt()}>
              {t('regalo.cta')}
            </Button>
          </Card>
        )}
      </main>
      <Footer />
    </>
  );
}
