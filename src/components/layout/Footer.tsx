import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations();
  return (
    <footer className="mt-16 bg-pink-200/60 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-sm text-text-soft">
        <p className="font-display text-lg font-bold text-pink-700">{t('common.brand')}</p>
        <nav className="flex flex-wrap justify-center gap-4">
          <Link href="/legal/privacidad" className="hover:text-pink-700">
            {t('legal.privacidad')}
          </Link>
          <Link href="/legal/terminos" className="hover:text-pink-700">
            {t('legal.terminos')}
          </Link>
          <Link href="/legal/cookies" className="hover:text-pink-700">
            {t('legal.cookies')}
          </Link>
        </nav>
        <p>© {new Date().getFullYear()} Cute Cases 💖</p>
      </div>
    </footer>
  );
}
