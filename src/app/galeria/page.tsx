'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Heart, Flag } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, EmptyState, SkeletonGrid, Tabs, useToast } from '@/components/ui';
import { api } from '@/lib/api-client';

interface GalleryCard {
  id: string;
  nombre: string;
  thumbnailUrl: string | null;
  likesCount: number;
  autor: string | null;
  shareToken: string;
}

/** Galería social (§9): opt-in, likes con sesión, orden semanal/reciente. */
export default function GaleriaPage() {
  const t = useTranslations();
  const router = useRouter();
  const { status } = useSession();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<'semana' | 'recientes'>('semana');
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['gallery', sort],
    queryFn: () => api<{ disenos: GalleryCard[] }>(`/api/gallery?sort=${sort}`),
  });

  const likeMutation = useMutation({
    mutationFn: async ({ id, unlike }: { id: string; unlike: boolean }) =>
      api<{ likesCount: number; liked: boolean }>(`/api/gallery/${id}/like`, {
        method: unlike ? 'DELETE' : 'POST',
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['gallery'] }),
  });

  const toggleLike = (id: string) => {
    if (status !== 'authenticated') {
      showToast(t('galeria.likeNecesitaCuenta'));
      router.push('/login?next=/galeria');
      return;
    }
    const unlike = liked.has(id);
    setLiked((prev) => {
      const next = new Set(prev);
      if (unlike) next.delete(id);
      else next.add(id);
      return next;
    });
    likeMutation.mutate({ id, unlike });
  };

  const report = async (id: string) => {
    try {
      await api(`/api/gallery/${id}/report`, { method: 'POST', body: JSON.stringify({}) });
      showToast(t('galeria.reportado'), 'success');
    } catch {
      showToast(t('toasts.E15'), 'error');
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 pt-6">
        <h1 className="mb-4">{t('galeria.titulo')}</h1>
        <Tabs
          label={t('galeria.titulo')}
          tabs={[
            { id: 'semana', label: t('galeria.masQueridas') },
            { id: 'recientes', label: t('galeria.recientes') },
          ]}
          active={sort}
          onChange={(id) => setSort(id as 'semana' | 'recientes')}
        />
        <div className="mt-4">
          {isLoading && <SkeletonGrid />}
          {data && data.disenos.length === 0 && <EmptyState emoji="✨" title={t('galeria.vacio')} />}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {data?.disenos.map((d) => (
              <Card key={d.id}>
                <Link href={`/d/${d.shareToken}`}>
                  <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-thumb bg-pink-100">
                    {d.thumbnailUrl ? (
                      <img src={d.thumbnailUrl} alt={d.nombre} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-5xl">💖</span>
                    )}
                  </div>
                  <p className="truncate font-bold">{d.nombre}</p>
                  <p className="truncate text-xs text-text-soft">{d.autor ?? t('galeria.anonimo')}</p>
                </Link>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    aria-pressed={liked.has(d.id)}
                    onClick={() => toggleLike(d.id)}
                    className="flex min-h-[44px] items-center gap-1 rounded-pill px-2 text-sm font-bold text-pink-600"
                  >
                    <Heart size={18} className={liked.has(d.id) ? 'fill-pink-600' : ''} />
                    {d.likesCount}
                  </button>
                  <button
                    type="button"
                    aria-label={t('galeria.reportar')}
                    onClick={() => void report(d.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-pill text-text-soft hover:text-error"
                  >
                    <Flag size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
