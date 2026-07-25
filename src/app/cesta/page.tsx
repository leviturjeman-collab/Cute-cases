'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatCentimos } from '@/lib/pricing';
import { PageShell } from '@/components/layout/PageShell';
import { Badge, Button, EmptyState, Skeleton, Stepper, useToast } from '@/components/ui';

interface CartItem {
  id: string;
  tipo: 'diseno' | 'preset';
  cantidad: number;
  nombre: string;
  deviceNombre: string | null;
  thumbnailUrl: string | null;
  fundaNombre: string | null;
  numPiezas: number | null;
  precioCentimos: number;
  valido: boolean;
  motivo: string | null;
  designId?: string;
  presetId?: string;
}

interface Cart {
  items: CartItem[];
  totalCentimos: number;
  priceChanged: boolean;
}

/** Cesta (SS6.9): filas con Stepper, invalidos atenuados, checkout fase 2. */
export default function CestaPage() {
  const t = useTranslations();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [checkout, setCheckout] = useState(false);
  const priceWarned = useRef(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api<Cart>('/api/cart'),
  });

  // T-20: el precio de algun articulo ha cambiado (SS16.4)
  useEffect(() => {
    if (data?.priceChanged && !priceWarned.current) {
      priceWarned.current = true;
      showToast(t('toasts.T20'), 'info');
    }
  }, [data?.priceChanged, showToast, t]);

  const setCantidad = async (item: CartItem, cantidad: number) => {
    try {
      await api(`/api/cart/${item.id}`, { method: 'PATCH', body: JSON.stringify({ cantidad }) });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  const removeItem = async (item: CartItem) => {
    try {
      await api(`/api/cart/${item.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  // Pantalla de checkout de fase 2 (SS6.9, T-18): prohibido simular un pago
  if (checkout) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
          <h2 className="font-display text-2xl font-semibold text-text">
            {t('cesta.checkoutTitulo')}
          </h2>
          <p className="text-sm text-text-soft">{t('cesta.checkoutTexto')}</p>
          <Button variant="secondary" onClick={() => setCheckout(false)}>
            {t('cesta.volver')}
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-[28px] font-semibold text-text">{t('cesta.titulo')}</h1>

        {isPending ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : isError ? (
          <div className="mt-6">
            <EmptyState
              title={t('common.estados.error')}
              action={<Button onClick={() => void refetch()}>{t('common.estados.reintentar')}</Button>}
            />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={t('cesta.vacioTitulo')}
              action={
                <Link href="/modelo">
                  <Button>{t('cesta.vacioCta')}</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {data.items.map((item) => (
                <li
                  key={item.id}
                  className={`flex gap-3 rounded-card border border-border bg-surface p-3 ${
                    item.valido ? '' : 'opacity-70'
                  }`}
                >
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-control bg-surface-2">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.nombre}
                        fill
                        sizes="80px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <div aria-hidden className="flex h-full items-center justify-center">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 48 48"
                          fill="none"
                          stroke="var(--pink-300)"
                          strokeWidth="2"
                        >
                          <rect x="14" y="4" width="20" height="40" rx="6" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-text">{item.nombre}</p>
                        {item.deviceNombre && (
                          <p className="text-sm text-text-soft">{item.deviceNombre}</p>
                        )}
                        {item.fundaNombre && item.numPiezas !== null && (
                          <p className="text-sm text-text-soft">
                            {t('cesta.resumenItem', { funda: item.fundaNombre, n: item.numPiezas })}
                          </p>
                        )}
                      </div>
                      <p className="tabular shrink-0 text-[15px] font-semibold text-text">
                        {formatCentimos(item.precioCentimos)}
                      </p>
                    </div>

                    {!item.valido && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant="noDisponible">{t('cesta.noDisponible')}</Badge>
                        {item.tipo === 'diseno' && item.designId ? (
                          <Link
                            href={`/editor/${item.designId}`}
                            className="text-sm font-medium text-pink-700 hover:underline"
                          >
                            {t('cesta.revisarDiseno')}
                          </Link>
                        ) : null}
                      </div>
                    )}

                    <div className="mt-2">
                      <Stepper
                        value={item.cantidad}
                        label={t('cesta.unidades')}
                        onChange={(v) => void setCantidad(item, v)}
                        onRemove={() => void removeItem(item)}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Resumen (SS6.9) */}
            <div className="mt-6 rounded-card border border-border bg-surface p-4">
              <ul className="space-y-1.5 text-sm">
                {data.items.map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-text-soft">
                      {item.nombre}
                      {item.cantidad > 1 ? ` x${item.cantidad}` : ''}
                    </span>
                    <span className="tabular text-text">
                      {formatCentimos(item.precioCentimos * item.cantidad)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <span className="font-medium text-text">{t('cesta.total')}</span>
                <span className="tabular text-[20px] font-semibold text-text">
                  {formatCentimos(data.totalCentimos)}
                </span>
              </div>
              <Button
                size="lg"
                className="mt-4 w-full"
                disabled={data.items.some((i) => !i.valido)}
                onClick={() => {
                  if (data.items.some((i) => !i.valido)) {
                    showToast(t('toasts.T10'), 'warning');
                    return;
                  }
                  setCheckout(true);
                }}
              >
                {t('cesta.tramitar')}
              </Button>
              {data.items.some((i) => !i.valido) && (
                <p className="mt-2 text-center text-sm text-warning">{t('toasts.T10')}</p>
              )}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
