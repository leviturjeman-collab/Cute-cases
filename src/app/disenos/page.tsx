'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, EmptyState, SkeletonGrid } from '@/components/ui';
import { api } from '@/lib/api-client';
import { formatCentimos } from '@/lib/pricing';

interface Preset {
  id: string;
  slug: string;
  nombre: string;
  precioCentimos: number;
  fotos: string[];
}

/** Diseños preestablecidos (§4.6): NO editables, precio cerrado. */
export default function DisenosPage() {
  const t = useTranslations();
  const { data, isLoading } = useQuery({
    queryKey: ['presets'],
    queryFn: () => api<{ presets: Preset[] }>('/api/presets'),
  });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 pt-6">
        <h1 className="mb-2">{t('disenos.titulo')}</h1>
        <p className="mb-6 text-sm text-text-soft">{t('disenos.noEditable')}</p>
        {isLoading && <SkeletonGrid />}
        {data && data.presets.length === 0 && <EmptyState emoji="✨" title={t('disenos.vacio')} />}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {data?.presets.map((p) => (
            <Link key={p.id} href={`/disenos/${p.slug}`}>
              <Card interactive>
                <div className="mb-2 flex aspect-square items-center justify-center rounded-thumb bg-pink-100 text-5xl">
                  🎀
                </div>
                <p className="truncate font-bold">{p.nombre}</p>
                <p className="font-display font-semibold text-pink-600">
                  {formatCentimos(p.precioCentimos)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
