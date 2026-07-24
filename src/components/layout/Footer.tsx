import Link from 'next/link';
import { useTranslations } from 'next-intl';

/** Footer (SS5.2): navegacion secundaria, legales, contacto y redes. */
export function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <p className="wordmark text-lg text-pink-700">{t('common.brand')}</p>
          <p className="mt-2 text-sm text-text-soft">{t('footer.eslogan')}</p>
        </div>
        <nav aria-label={t('footer.navegacion')} className="text-sm">
          <p className="mb-2 font-display font-semibold text-text">{t('footer.navegacion')}</p>
          <ul className="space-y-1.5 text-text-soft">
            <li>
              <Link href="/fundas" className="hover:text-pink-700">
                {t('common.nav.fundas')}
              </Link>
            </li>
            <li>
              <Link href="/disenos" className="hover:text-pink-700">
                {t('common.nav.disenos')}
              </Link>
            </li>
            <li>
              <Link href="/galeria" className="hover:text-pink-700">
                {t('common.nav.galeria')}
              </Link>
            </li>
            <li>
              <Link href="/modelo" className="hover:text-pink-700">
                {t('common.nav.modelo')}
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={t('footer.legales')} className="text-sm">
          <p className="mb-2 font-display font-semibold text-text">{t('footer.legales')}</p>
          <ul className="space-y-1.5 text-text-soft">
            <li>
              <Link href="/legal/privacidad" className="hover:text-pink-700">
                {t('legal.privacidad')}
              </Link>
            </li>
            <li>
              <Link href="/legal/terminos" className="hover:text-pink-700">
                {t('legal.terminos')}
              </Link>
            </li>
            <li>
              <Link href="/legal/cookies" className="hover:text-pink-700">
                {t('legal.cookies')}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="text-sm">
          <p className="mb-2 font-display font-semibold text-text">{t('footer.contacto')}</p>
          <p className="text-text-soft">
            <a href={`mailto:${t('footer.email')}`} className="hover:text-pink-700">
              {t('footer.email')}
            </a>
          </p>
          <p className="mb-2 mt-4 font-display font-semibold text-text">{t('footer.redes')}</p>
          <ul className="flex gap-3 text-text-soft">
            <li>
              <a
                href="https://instagram.com"
                rel="noopener noreferrer"
                target="_blank"
                className="hover:text-pink-700"
              >
                {t('footer.instagram')}
              </a>
            </li>
            <li>
              <a
                href="https://tiktok.com"
                rel="noopener noreferrer"
                target="_blank"
                className="hover:text-pink-700"
              >
                {t('footer.tiktok')}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-text-soft">
        {year} {t('footer.derechos')}
      </div>
    </footer>
  );
}
