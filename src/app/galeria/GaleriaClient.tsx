'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api-client';
import { GalleryCard, type GalleryItem } from '@/components/GalleryCard';
import { Button, EmptyState, SkeletonGrid, Tabs } from '@/components/ui';

interface Page {
  disenos: GalleryItem[];
  nextCursor: string | null;
}

/** Galeria social (SS16.3): pestanas Semana/Recientes, scroll infinito. */
export function GaleriaClient({ initialSemana }: { initialSemana: GalleryItem[] }) {
  const t = useTranslations();
  const [tab, setTab] = useState<'semana' | 'recientes'>('semana');
  const [items, setItems] = useState<GalleryItem[]>(initialSemana);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    async (nextTab: 'semana' | 'recientes', nextCursor: string | null, replace: boolean) => {
      setLoading(true);
      setError(false);
      try {
        const query = new URLSearchParams({ sort: nextTab });
        if (nextCursor) query.set('cursor', nextCursor);
        const page = await api<Page>(`/api/gallery?${query.toString()}`);
        setItems((prev) => (replace ? page.disenos : [...prev, ...page.disenos]));
        setCursor(page.nextCursor);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const changeTab = (id: string) => {
    const next = id === 'recientes' ? 'recientes' : 'semana';
    setTab(next);
    setItems([]);
    setCursor(null);
    void load(next, null, true);
  };

  // Scroll infinito (solo pestanya con cursor)
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loading) void load(tab, cursor, false);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loading, load, tab]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-[28px] font-semibold text-text">{t('galeria.titulo')}</h1>

      <div className="mt-4">
        <Tabs
          label={t('galeria.titulo')}
          tabs={[
            { id: 'semana', label: t('galeria.semana') },
            { id: 'recientes', label: t('galeria.recientes') },
          ]}
          active={tab}
          onChange={changeTab}
        />
      </div>

      <div className="mt-6">
        {error ? (
          <EmptyState
            title={t('common.estados.error')}
            action={
              <Button onClick={() => void load(tab, null, true)}>
                {t('common.estados.reintentar')}
              </Button>
            }
          />
        ) : items.length === 0 && !loading ? (
          <EmptyState
            title={t('galeria.vacio')}
            action={
              <Link href="/modelo">
                <Button>{t('galeria.vacioCta')}</Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {items.map((item) => (
                <GalleryCard key={item.id} item={item} />
              ))}
            </div>
            {loading && (
              <div className="mt-4">
                <SkeletonGrid count={4} />
              </div>
            )}
            <div ref={sentinel} aria-hidden className="h-px" />
          </>
        )}
      </div>
    </div>
  );
}
