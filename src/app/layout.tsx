import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Providers } from './providers';
import '@/styles/globals.css';

// Tipografía v4 (§3.3): Poppins 500/600 para marca y títulos, Inter para UI.
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-poppins',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
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
  themeColor: '#FDF7FA',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${poppins.variable} ${inter.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
