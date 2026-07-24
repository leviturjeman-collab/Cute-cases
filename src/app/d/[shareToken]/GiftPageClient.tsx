'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatCentimos } from '@/lib/pricing';
import { track } from '@/lib/analytics';
import { Button, EmptyState, Input, Modal, useToast } from '@/components/ui';
import type { SharedDesignPayload } from '@/server/shareService';
import type { CatalogElement, DeviceSpec } from '@/editor/types';

const ProductViewer = dynamic(
  () => import('@/editor/ProductViewer').then((m) => m.ProductViewer),
  {
    ssr: false,
    loading: () => <div className="skeleton-shimmer h-full w-full rounded-card" aria-hidden />,
  },
);

/**
 * Contenido de /d/[token] (SS6.8): visor de solo visualizacion, texto segun
 * configuracion del dueno, desglose y CTA de cesta. Estado amable si el
 * diseno ya no esta disponible.
 */
export function GiftPageClient({ payload }: { payload: SharedDesignPayload | null }) {
  const t = useTranslations();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMotivo, setReportMotivo] = useState('');

  useEffect(() => {
    if (payload?.disponible) track('regalo_abierto');
  }, [payload?.disponible]);

  const catalog = useMemo(() => {
    const map = new Map<string, CatalogElement>();
    for (const e of payload?.elementosCatalogo ?? []) {
      map.set(e.id, e as unknown as CatalogElement);
    }
    return map;
  }, [payload?.elementosCatalogo]);

  if (!payload || !payload.disponible) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState
          title={t('regalo.noDisponibleTitulo')}
          text={t('regalo.noDisponibleTexto')}
          action={
            <Link href="/modelo">
              <Button>{t('common.acciones.crearElMio')}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const device = payload.device as unknown as DeviceSpec;

  const addToCart = async () => {
    setAdding(true);
    try {
      await api('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ designId: payload.id, cantidad: 1 }),
      });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      track('anadido_cesta', { origen: 'regalo' });
      showToast(t('toasts.T02'), 'success');
    } catch {
      showToast(t('toasts.T15'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const sendReport = async () => {
    try {
      await api(`/api/gallery/${payload.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ motivo: reportMotivo.trim() || undefined }),
      });
      showToast(t('galeria.reportado'), 'success');
    } catch {
      showToast(t('toasts.T15'), 'error');
    } finally {
      setReportOpen(false);
      setReportMotivo('');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[62svh] min-h-[380px] overflow-hidden rounded-card border border-border bg-surface-2 lg:h-[560px]">
          <ProductViewer
            device={device}
            material={payload.caseVariant.material}
            colorHex={payload.caseVariant.colorHex}
            items={payload.elementos}
            catalog={catalog}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-pink-700">
            {payload.shareNombre
              ? t('regalo.tituloConNombre', { nombre: payload.shareNombre })
              : t('regalo.tituloSinNombre')}
          </p>
          <h1 className="mt-1 font-display text-[28px] font-semibold text-text">{payload.nombre}</h1>
          <p className="mt-0.5 text-sm text-text-soft">
            {payload.caseVariant.nombre} {payload.caseVariant.colorNombre} - {payload.device.nombre}
          </p>

          {/* Desglose de precio (SS6.8) */}
          <div className="mt-5 rounded-card border border-border bg-surface p-4">
            <h2 className="mb-2 font-display text-[15px] font-semibold text-text">
              {t('regalo.desglose')}
            </h2>
            <ul className="space-y-1.5 text-sm">
              {payload.desglose.lines.map((line, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3">
                  <span className="text-text-soft">{line.label}</span>
                  <span className="tabular text-text">{formatCentimos(line.centimos)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
              <span className="font-medium text-text">{t('common.precio.total')}</span>
              <span className="tabular text-[20px] font-semibold text-text">
                {formatCentimos(payload.precioCentimos)}
              </span>
            </div>
          </div>

          <Button size="lg" className="mt-4 w-full sm:w-auto" onClick={addToCart} loading={adding}>
            {t('common.acciones.anadirCesta')}
          </Button>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm text-text-soft hover:text-text"
            >
              <Flag size={14} aria-hidden />
              {t('galeria.reportar')}
            </button>
          </div>
        </div>
      </div>

      {/* Reporte (SS16.3): motivo opcional, max 200 */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title={t('galeria.reportar')}>
        <div className="space-y-4">
          <Input
            label={t('galeria.reportarMotivo')}
            value={reportMotivo}
            maxLength={200}
            showCount
            onChange={(e) => setReportMotivo(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              {t('common.acciones.cancelar')}
            </Button>
            <Button onClick={sendReport}>{t('common.acciones.enviar')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
