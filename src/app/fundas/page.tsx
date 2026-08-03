'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatCentimos } from '@/lib/pricing';
import { getRememberedDevice } from '@/lib/deviceStorage';
import { PageShell } from '@/components/layout/PageShell';
import { DeviceChip } from '@/components/DeviceChip';
import { ProductCard } from '@/components/ProductCard';
import { Button, Chip, EmptyState, SkeletonGrid } from '@/components/ui';

interface Variante {
  id: string;
  colorNombre: string;
  colorHex: string;
  precioCentimos: number;
  disponible: boolean;
}

interface Funda {
  id: string;
  slug: string;
  nombre: string;
  material: string;
  fotos: string[];
  variantes: Variante[];
}

const MATERIALES = ['silicona', 'transparente', 'rigida', 'rigida-perlada'] as const;

function FundasContent() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const [device, setDevice] = useState<
    { id: string; nombre: string; slug?: string } | null | undefined
  >(undefined);

  useEffect(() => {
    const remembered = getRememberedDevice();
    setDevice(remembered);
    if (!remembered) router.replace('/modelo?volver=%2Ffundas');
  }, [router]);

  // Slug del modelo para el arte de tarjeta exacto: selecciones antiguas
  // (sin slug guardado) lo resuelven contra /api/devices
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () =>
      api<{ generaciones: { modelos: { id: string; slug: string }[] }[] }>('/api/devices'),
    enabled: !!device && !device.slug,
    staleTime: Infinity,
  });
  const deviceSlug =
    device?.slug ??
    devicesData?.generaciones.flatMap((g) => g.modelos).find((m) => m.id === device?.id)?.slug ??
    null;

  const materialFilter = params.get('material');
  const colorFilter = params.get('color');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['cases', device?.id],
    queryFn: () => api<{ fundas: Funda[] }>(`/api/cases?deviceId=${device!.id}`),
    enabled: !!device,
  });

  // SS6.3: la URL refleja los filtros para que sea compartible
  const setFilter = (key: 'material' | 'color', value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.replace(`/fundas${next.size ? `?${next.toString()}` : ''}`, { scroll: false });
  };

  const colores = useMemo(() => {
    const seen = new Map<string, string>();
    for (const f of data?.fundas ?? []) {
      for (const v of f.variantes) {
        if (v.disponible && !seen.has(slugColor(v.colorNombre))) {
          seen.set(slugColor(v.colorNombre), v.colorHex);
        }
      }
    }
    return [...seen.entries()];
  }, [data]);

  const filtered = useMemo(() => {
    return (data?.fundas ?? []).filter((f) => {
      const disponibles = f.variantes.filter((v) => v.disponible);
      if (disponibles.length === 0) return false;
      if (materialFilter && f.material !== materialFilter) return false;
      if (colorFilter && !disponibles.some((v) => slugColor(v.colorNombre) === colorFilter)) {
        return false;
      }
      return true;
    });
  }, [data, materialFilter, colorFilter]);

  if (device === undefined || (device && isPending)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <SkeletonGrid count={8} />
      </div>
    );
  }
  if (!device) return null;

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <EmptyState
          title={t('common.estados.error')}
          action={
            <Button onClick={() => void refetch()}>{t('common.estados.reintentar')}</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Migas + chip de dispositivo (SS5.2) */}
      <nav aria-label={t('fundas.migas')} className="text-sm text-text-soft">
        {device.nombre} / {t('fundas.migas')}
      </nav>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-semibold text-text">
          {t('fundas.resultados', { n: filtered.length, modelo: device.nombre })}
        </h1>
        <DeviceChip nombre={device.nombre} returnTo="/fundas" />
      </div>

      {/* Filtros (SS6.3): fila scrollable, combinables */}
      <div className="mt-5 space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label={t('fundas.filtroMaterial')}>
          {MATERIALES.map((m) => (
            <Chip
              key={m}
              selected={materialFilter === m}
              onClick={() => setFilter('material', materialFilter === m ? null : m)}
            >
              {t(`fundas.materiales.${m}`)}
            </Chip>
          ))}
        </div>
        {colores.length > 0 && (
          <div className="-mx-4 flex items-center gap-2.5 overflow-x-auto px-4" role="group" aria-label={t('fundas.filtroColor')}>
            {colores.map(([nombre, hex]) => (
              <button
                key={nombre}
                type="button"
                aria-label={nombre}
                aria-pressed={colorFilter === nombre}
                onClick={() => setFilter('color', colorFilter === nombre ? null : nombre)}
                className={`h-7 w-7 shrink-0 rounded-full border border-border transition-shadow duration-120 ${
                  colorFilter === nombre ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-bg' : ''
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={t('fundas.vacio')}
            action={
              <Button variant="secondary" onClick={() => router.replace('/fundas')}>
                {t('common.acciones.quitarFiltros')}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {filtered.map((f) => {
            const disponibles = f.variantes.filter((v) => v.disponible);
            const desde = Math.min(...disponibles.map((v) => v.precioCentimos));
            const visibles = disponibles.slice(0, 5);
            return (
              <ProductCard
                key={f.id}
                href={`/fundas/${f.slug}`}
                nombre={f.nombre}
                // La tarjeta muestra la funda con el modulo de camara del
                // modelo seleccionado; el arte generico queda de reserva
                imageUrl={
                  deviceSlug ? `/renders/cases/${f.slug}/${deviceSlug}.webp` : f.fotos[0] ?? null
                }
                fallbackImageUrl={f.fotos[0] ?? null}
                imageAlt={`${f.nombre} - ${device.nombre}`}
                subtitle={t(`fundas.materiales.${f.material}`)}
                priceLabel={t('common.precio.desde', { precio: formatCentimos(desde) })}
                footer={
                  <div className="flex items-center gap-1.5">
                    {visibles.map((v) => (
                      <span
                        key={v.id}
                        aria-hidden
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: v.colorHex }}
                      />
                    ))}
                    {disponibles.length > 5 && (
                      <span className="text-xs text-text-soft">
                        {t('fundas.masColores', { n: disponibles.length - 5 })}
                      </span>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function slugColor(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
}

export default function FundasPage() {
  return (
    <PageShell>
      <Suspense>
        <FundasContent />
      </Suspense>
    </PageShell>
  );
}
