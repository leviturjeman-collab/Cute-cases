import type { Metadata, Viewport } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Providers } from './providers';
import '@/styles/globals.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-fredoka',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-nunito',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('home');
  return {
    title: {
      default: t('titulo'),
      template: '%s · Cute Cases',
    },
    description: t('descripcion'),
    openGraph: {
      siteName: 'Cute Cases',
      locale: 'es_ES',
      type: 'website',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#FFE4F1',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${fredoka.variable} ${nunito.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
