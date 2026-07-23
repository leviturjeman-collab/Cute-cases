import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EmptyState } from '@/components/ui';

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 pt-12">
        <EmptyState
          emoji="🎀"
          title={t('errores.paginaNoExiste')}
          action={
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-pill bg-pink-600 px-6 font-bold text-white"
            >
              {t('home.ctaPrincipal')}
            </Link>
          }
        />
      </main>
      <Footer />
    </>
  );
}
