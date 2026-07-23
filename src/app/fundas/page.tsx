'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, Chip, EmptyState, SkeletonGrid } from '@/components/ui';
import { api } from '@/lib/api-client';
import { getRememberedDevice } from '@/lib/deviceStorage';
import { formatCentimos } from '@/lib/pricing';

interface Variant {
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
  variantes: Variant[];
}

/** Catálogo de fundas (§5.4): solo compatibles, filtros material/color, "desde X €". */
export default function FundasPage() {
  const t = useTranslations();
  const router = useRouter();
  const [device, setDevice] = useState<ReturnType<typeof getRememberedDevice>>(null);
  const [ready, setReady] = useState(false);
  const [material, setMaterial] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    const d = getRememberedDevice();
    setDevice(d);
    setReady(true);
    if (!d) router.replace('/modelo');
  }, [router]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cases', device?.id],
    queryFn: () => api<{ fundas: Funda[] }>(`/api/cases?deviceId=${device!.id}`),
    enabled: Boolean(device),
  });

  const materials = useMemo(
    () => [...new Set((data?.fundas ?? []).map((f) => f.material))],
    [data],
  );
  const colors = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of data?.fundas ?? []) {
      for (const v of f.variantes) {
        if (v.disponible) map.set(v.colorHex, v.colorNombre);
      }
    }
    return [...map.entries()];
  }, [data]);

  const filtered = (data?.fundas ?? []).filter((f) => {
    if (material && f.material !== material) return false;
    if (color && !f.variantes.some((v) => v.colorHex === color && v.disponible)) return false;
    return true;
  });

  if (!ready || !device) return null;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 pt-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1>{t('fundas.titulo')}</h1>
          <Chip selected onClick={() => router.push('/modelo')}>
            {device.nombre} ✏️
          </Chip>
        </div>

        <div className="mb-2 flex flex-wrap gap-2">
          <span className="self-center text-sm font-bold text-text-soft">
            {t('fundas.filtroMaterial')}:
          </span>
          {materials.map((m) => (
            <Chip key={m} selected={material === m} onClick={() => setMaterial(material === m ? null : m)}>
              {m}
            </Chip>
          ))}
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-text-soft">{t('fundas.filtroColor')}:</span>
          {colors.map(([hex, nombre]) => (
            <button
              key={hex}
              type="button"
              aria-label={nombre}
              aria-pressed={color === hex}
              onClick={() => setColor(color === hex ? null : hex)}
              className={`h-8 w-8 rounded-pill border-2 ${
                color === hex ? 'border-pink-700 ring-2 ring-pink-300' : 'border-pink-200'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>

        {isLoading && <SkeletonGrid />}
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
        {data && filtered.length === 0 && <EmptyState emoji="🥺" title={t('fundas.vacio')} />}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {filtered.map((f) => {
            const disponibles = f.variantes.filter((v) => v.disponible);
            const desde = disponibles.length
              ? Math.min(...disponibles.map((v) => v.precioCentimos))
              : null;
            return (
              <Link key={f.id} href={`/fundas/${f.slug}`}>
                <Card interactive className="h-full">
                  <div className="mb-2 flex aspect-square items-center justify-center rounded-thumb bg-pink-100 text-5xl">
                    📱
                  </div>
                  <p className="truncate font-bold">{f.nombre}</p>
                  <p className="text-sm text-text-soft">{f.material}</p>
                  {desde !== null && (
                    <p className="font-display font-semibold text-pink-600">
                      {t('common.precio.desde', { precio: formatCentimos(desde) })}
                    </p>
                  )}
                  <div className="mt-2 flex gap-1">
                    {f.variantes.map((v) => (
                      <span
                        key={v.id}
                        aria-hidden
                        className="h-4 w-4 rounded-pill border border-pink-200"
                        style={{ backgroundColor: v.colorHex, opacity: v.disponible ? 1 : 0.3 }}
                      />
                    ))}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
