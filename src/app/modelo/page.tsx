'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, EmptyState, Input, SkeletonGrid } from '@/components/ui';
import { api } from '@/lib/api-client';
import { getRememberedDevice, rememberDevice } from '@/lib/deviceStorage';

interface Device {
  id: string;
  nombre: string;
  generacion: string;
}

/** Selección de modelo (§5.3): acordeón por generación, buscador, modelo recordado. */
export default function ModeloPage() {
  const t = useTranslations();
  const router = useRouter();
  const { status } = useSession();
  const [query, setQuery] = useState('');
  const [openGen, setOpenGen] = useState<string | null>(null);
  const remembered = useMemo(() => getRememberedDevice(), []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<{ generaciones: Record<string, Device[]> }>('/api/devices'),
  });

  const pick = async (device: Device) => {
    rememberDevice({ id: device.id, nombre: device.nombre });
    if (status === 'authenticated') {
      // Persistir también en la cuenta (§5.3); fallo no bloqueante
      api('/api/account', { method: 'PATCH', body: JSON.stringify({ deviceId: device.id }) }).catch(
        () => undefined,
      );
    }
    router.push('/fundas');
  };

  const generations = data ? Object.keys(data.generaciones).sort((a, b) => b.localeCompare(a)) : [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-6">
        <h1 className="mb-4 text-center">{t('modelo.titulo')}</h1>

        {remembered && (
          <Card className="mb-6 flex items-center justify-between gap-3">
            <p className="font-bold">{t('modelo.recordado', { modelo: remembered.nombre })}</p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => router.push('/fundas')}>
                {t('common.acciones.continuar')}
              </Button>
            </div>
          </Card>
        )}

        <Input
          label={t('modelo.buscar')}
          placeholder={t('modelo.buscar')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-6"
        />

        {isLoading && <SkeletonGrid count={4} />}
        {isError && (
          <EmptyState
            emoji="🙈"
            title={t('common.estados.error')}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                {t('common.estados.reintentar')}
              </Button>
            }
          />
        )}

        {data && (
          <div className="flex flex-col gap-3">
            {generations.map((gen) => {
              const items = (data.generaciones[gen] ?? []).filter((d) =>
                d.nombre.toLowerCase().includes(query.toLowerCase()),
              );
              if (query && items.length === 0) return null;
              const open = query.length > 0 || openGen === gen;
              return (
                <Card key={gen}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-1 font-display text-lg font-semibold"
                    aria-expanded={open}
                    onClick={() => setOpenGen(open ? null : gen)}
                  >
                    {t('modelo.generacion', { gen })}
                    <span aria-hidden>{open ? '▴' : '▾'}</span>
                  </button>
                  {open && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {items.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => pick(d)}
                          className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-thumb border-2 border-pink-200 bg-surface px-2 py-2 font-bold transition-colors hover:border-pink-500"
                        >
                          {/* Silueta del módulo de cámara como ayuda visual (§5.3) */}
                          <span aria-hidden className="text-lg">
                            📱
                          </span>
                          <span className="text-sm">{d.nombre}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
            {query && generations.every((g) => (data.generaciones[g] ?? []).every((d) => !d.nombre.toLowerCase().includes(query.toLowerCase()))) && (
              <EmptyState emoji="🔍" title={t('modelo.sinResultados')} />
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
