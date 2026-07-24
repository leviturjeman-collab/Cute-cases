'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ProductCard } from '@/components/ProductCard';
import { Badge, Chip, EmptyState } from '@/components/ui';
import { formatCentimos } from '@/lib/pricing';

export interface PresetCardData {
  slug: string;
  nombre: string;
  precioCentimos: number;
  foto: string | null;
  generaciones: string[];
  compatibles: number;
}

export function DisenosClient({ presets }: { presets: PresetCardData[] }) {
  const t = useTranslations();
  const [gen, setGen] = useState<string | null>(null);

  const generaciones = useMemo(
    () =>
      [...new Set(presets.flatMap((p) => p.generaciones))].sort((a, b) =>
        b.localeCompare(a, 'es', { numeric: true }),
      ),
    [presets],
  );

  const filtered = gen ? presets.filter((p) => p.generaciones.includes(gen)) : presets;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-[28px] font-semibold text-text">{t('disenos.titulo')}</h1>

      {/* Filtro por generacion (SS6.5) */}
      <div
        className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4"
        role="group"
        aria-label={t('disenos.filtroGeneracion')}
      >
        <Chip selected={gen === null} onClick={() => setGen(null)}>
          {t('disenos.todasGeneraciones')}
        </Chip>
        {generaciones.map((g) => (
          <Chip key={g} selected={gen === g} onClick={() => setGen(gen === g ? null : g)}>
            {t('modelo.generacion', { gen: g })}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={t('fundas.vacio')} />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.slug}
              href={`/disenos/${p.slug}`}
              nombre={p.nombre}
              imageUrl={p.foto}
              imageAlt={p.nombre}
              subtitle={t('disenos.compatibleCon', { n: p.compatibles })}
              priceLabel={formatCentimos(p.precioCentimos)}
              badge={<Badge variant="casa">{t('common.badges.disenoCasa')}</Badge>}
            />
          ))}
        </div>
      )}
    </div>
  );
}
