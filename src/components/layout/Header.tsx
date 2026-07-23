'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Heart, ShoppingBag, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

/** Header fijo (§5.2): logo, Mis diseños, cesta con badge, avatar/login. */
export function Header() {
  const t = useTranslations('common');
  const { status } = useSession();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api<{ items: { cantidad: number }[] }>('/api/cart'),
  });
  const cartCount = cart?.items.reduce((acc, i) => acc + i.cantidad, 0) ?? 0;

  const iconLink = (href: string) =>
    `relative flex h-11 w-11 items-center justify-center rounded-pill transition-colors active:scale-[0.95] ${
      pathname === href ? 'bg-pink-200 text-pink-700' : 'text-pink-700 hover:bg-pink-200'
    }`;

  return (
    <header
      className={`sticky top-0 z-40 bg-pink-100/90 transition-shadow ${
        scrolled ? 'shadow-sm backdrop-blur-md' : ''
      }`}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-display text-xl font-bold text-pink-600">
          {t('brand')}
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/mis-disenos"
            aria-label={t('nav.misDisenos')}
            aria-current={pathname === '/mis-disenos' ? 'page' : undefined}
            className={iconLink('/mis-disenos')}
          >
            <Heart size={22} strokeWidth={2} />
          </Link>
          <Link
            href="/cesta"
            aria-label={t('nav.cesta')}
            aria-current={pathname === '/cesta' ? 'page' : undefined}
            className={iconLink('/cesta')}
          >
            <ShoppingBag size={22} strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-pill bg-pink-600 px-1 text-xs font-extrabold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            href={status === 'authenticated' ? '/cuenta' : '/login'}
            aria-label={status === 'authenticated' ? t('nav.cuenta') : t('nav.login')}
            aria-current={pathname === '/cuenta' || pathname === '/login' ? 'page' : undefined}
            className={iconLink(status === 'authenticated' ? '/cuenta' : '/login')}
          >
            <User size={22} strokeWidth={2} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
