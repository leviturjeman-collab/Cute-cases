'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

/**
 * Header global (SS5.2): fijo, 56 px, fondo --surface con borde inferior;
 * en la home, transparente sobre el hero hasta el primer scroll. Wordmark a
 * la izquierda; a la derecha Mis disenos (con sesion), cesta con badge y
 * avatar/entrar.
 */
export function Header() {
  const t = useTranslations('common');
  const { status } = useSession();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api<{ items: { cantidad: number }[] }>('/api/cart'),
    staleTime: 15_000,
  });
  const cartCount = cart?.items.reduce((acc, i) => acc + i.cantidad, 0) ?? 0;

  const transparent = pathname === '/' && !scrolled;

  const iconLink = (active: boolean) =>
    `relative flex h-10 w-10 items-center justify-center rounded-control transition-colors duration-120 ${
      active ? 'bg-pink-100 text-pink-700' : 'text-text hover:bg-surface-2'
    }`;

  return (
    <header
      className={`sticky top-0 z-40 h-14 transition-colors duration-200 ${
        transparent ? 'bg-transparent' : 'border-b border-border bg-surface'
      }`}
    >
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="wordmark text-lg text-pink-700">
          {t('brand')}
        </Link>
        <nav aria-label={t('nav.menu')} className="flex items-center gap-1">
          {status === 'authenticated' && (
            <Link
              href="/mis-disenos"
              aria-label={t('nav.misDisenos')}
              aria-current={pathname === '/mis-disenos' ? 'page' : undefined}
              className={iconLink(pathname === '/mis-disenos')}
            >
              <LayoutGrid size={20} strokeWidth={1.8} />
            </Link>
          )}
          <Link
            href="/cesta"
            aria-label={t('nav.cesta')}
            aria-current={pathname === '/cesta' ? 'page' : undefined}
            className={iconLink(pathname === '/cesta')}
          >
            <ShoppingBag size={20} strokeWidth={1.8} />
            {cartCount > 0 && (
              <span
                aria-hidden
                className="tabular absolute right-0 top-0 flex h-4 min-w-[16px] items-center justify-center rounded-badge bg-pink-700 px-1 text-[11px] font-semibold leading-none text-white"
              >
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            href={status === 'authenticated' ? '/cuenta' : '/login'}
            aria-label={status === 'authenticated' ? t('nav.cuenta') : t('nav.entrar')}
            aria-current={pathname === '/cuenta' || pathname === '/login' ? 'page' : undefined}
            className={iconLink(pathname === '/cuenta' || pathname === '/login')}
          >
            <User size={20} strokeWidth={1.8} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
