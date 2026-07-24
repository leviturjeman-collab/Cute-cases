import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageShell } from '@/components/layout/PageShell';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal');
  return { title: t('privacidad') };
}

export default async function PrivacidadPage() {
  const t = await getTranslations('legal');
  return (
    <PageShell>
      <article className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-[28px] font-semibold text-text">{t('privacidad')}</h1>
        <section className="mt-4 rounded-card bg-pink-100 p-4">
          <h2 className="font-display text-[15px] font-semibold text-text">{t('resumen')}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-text">{t('privacidadResumen')}</p>
        </section>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-text-soft">
          <p>{t('privacidadP1')}</p>
          <p>{t('privacidadP2')}</p>
          <p>{t('privacidadP3')}</p>
          <p>{t('privacidadP4')}</p>
        </div>
      </article>
    </PageShell>
  );
}
