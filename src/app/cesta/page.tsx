'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, EmptyState, Modal, Skeleton, Stepper } from '@/components/ui';
import { api } from '@/lib/api-client';
import { formatCentimos } from '@/lib/pricing';

interface CartItem {
  id: string;
  tipo: 'diseno' | 'preset';
  cantidad: number;
  nombre: string;
  deviceNombre: string | null;
  thumbnailUrl: string | null;
  fundaNombre: string | null;
  numElementos: number | null;
  precioCentimos: number;
  disponible: boolean;
  designId?: string;
}

/** Cesta (§10) — solo UI en esta fase; checkout placeholder honesto (E-18). */
export default function CestaPage() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api<{ items: CartItem[]; totalCentimos: number }>('/api/cart'),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['cart'] });
  const updateQty = useMutation({
    mutationFn: ({ id, cantidad }: { id: string; cantidad: number }) =>
      api(`/api/cart/${id}`, { method: 'PATCH', body: JSON.stringify({ cantidad }) }),
    onSuccess: invalidate,
  });
  const removeItem = useMutation({
    mutationFn: (id: string) => api(`/api/cart/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-6">
        <h1 className="mb-4">{t('cesta.titulo')}</h1>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {data && data.items.length === 0 && (
          <EmptyState
            emoji="🛒"
            title={t('cesta.vacioTitulo')}
            action={<Button onClick={() => router.push('/modelo')}>{t('cesta.vacioCta')}</Button>}
          />
        )}
        <div className="flex flex-col gap-3">
          {data?.items.map((item) => (
            <Card key={item.id} className="flex gap-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-thumb bg-pink-100">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.nombre} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl">💖</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{item.nombre}</p>
                {item.deviceNombre && <p className="text-xs text-text-soft">{item.deviceNombre}</p>}
                {item.fundaNombre && (
                  <p className="truncate text-xs text-text-soft">
                    {item.fundaNombre}
                    {item.numElementos !== null && ` · ${item.numElementos} elementos`}
                  </p>
                )}
                <p className="font-display text-sm font-semibold text-pink-600">
                  {formatCentimos(item.precioCentimos)}
                </p>
                {!item.disponible && (
                  <p className="mt-1 text-xs font-bold text-error">
                    {t('cesta.noDisponible')}{' '}
                    {item.designId && (
                      <Link className="underline" href={`/editor/${item.designId}`}>
                        {t('cesta.resolver')}
                      </Link>
                    )}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <Stepper
                    label={t('cesta.unidades')}
                    value={item.cantidad}
                    onChange={(v) => updateQty.mutate({ id: item.id, cantidad: v })}
                  />
                  <button
                    type="button"
                    aria-label={t('common.acciones.eliminar')}
                    onClick={() => removeItem.mutate(item.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-pill text-error hover:bg-error-bg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {data && data.items.length > 0 && (
          <Card className="mt-4">
            <div className="flex items-center justify-between font-display text-lg font-bold">
              <span>{t('cesta.total')}</span>
              <span className="text-pink-600">{formatCentimos(data.totalCentimos)}</span>
            </div>
            <Button size="lg" className="mt-4 w-full" onClick={() => setCheckoutOpen(true)}>
              {t('cesta.tramitar')}
            </Button>
          </Card>
        )}
      </main>

      {/* Placeholder honesto de checkout (E-18): no simula un pago */}
      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title={t('cesta.checkoutPlaceholder')}>
        <p className="mb-4 text-sm text-text-soft">{t('cesta.checkoutNota')}</p>
        <Button onClick={() => setCheckoutOpen(false)}>{t('common.acciones.aceptar')}</Button>
      </Modal>
      <Footer />
    </>
  );
}
