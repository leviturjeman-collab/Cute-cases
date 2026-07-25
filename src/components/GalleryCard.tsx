'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui';
import { track } from '@/lib/analytics';

export interface GalleryItem {
  id: string;
  nombre: string;
  thumbnailUrl: string | null;
  likesCount: number;
  autor: string | null;
  shareToken: string;
  likedByMe: boolean;
}

/**
 * Tarjeta de galeria (SS6.5 galeria, SS16.3): miniatura, nombre, autor o
 * "Anonimo", contador de likes con corazon conmutable (requiere sesion).
 */
export function GalleryCard({ item }: { item: GalleryItem }) {
  const t = useTranslations('galeria');
  const { status } = useSession();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(item.likedByMe);
  const [count, setCount] = useState(item.likesCount);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (status !== 'authenticated') {
      showToast(t('likeNecesitaCuenta'), 'info');
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      await api(`/api/gallery/${item.id}/like`, { method: next ? 'POST' : 'DELETE' });
      if (next) track('like');
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group overflow-hidden rounded-card border border-border bg-surface shadow-1 transition-shadow duration-200 hover:shadow-2">
      <Link href={`/d/${item.shareToken}`} aria-label={t('verDiseno')} className="block">
        <div
          className="relative aspect-[4/5]"
          style={{ background: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #F6EEF2 85%)' }}
        >
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt={item.nombre}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-contain p-2 transition-transform duration-200 group-hover:scale-[1.04]"
            />
          ) : (
            <div aria-hidden className="flex h-full items-center justify-center">
              <svg
                width="44"
                height="44"
                viewBox="0 0 48 48"
                fill="none"
                stroke="var(--pink-300)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="14" y="4" width="20" height="40" rx="6" />
                <circle cx="20" cy="11" r="2.5" />
              </svg>
            </div>
          )}
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-text">{item.nombre}</p>
          <p className="truncate text-sm text-text-soft">{item.autor ?? t('anonimo')}</p>
        </div>
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={t('likes', { n: count })}
          className="flex h-10 items-center gap-1 rounded-control px-2 text-sm text-text-soft transition-colors duration-120 hover:bg-surface-2"
        >
          <Heart
            size={18}
            strokeWidth={1.8}
            className={liked ? 'fill-pink-500 text-pink-500' : 'text-text-soft'}
          />
          <span className="tabular">{count}</span>
        </button>
      </div>
    </div>
  );
}
