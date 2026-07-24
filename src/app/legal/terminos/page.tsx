import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageShell } from '@/components/layout/PageShell';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal');
  return { title: t('terminos') };
}

export default async function TerminosPage() {
  const t = await getTranslations('legal');
  return (
    <PageShell>
      <article className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-[28px] font-semibold text-text">{t('terminos')}</h1>
        <section className="mt-4 rounded-card bg-pink-100 p-4">
          <h2 className="font-display text-[15px] font-semibold text-text">{t('resumen')}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-text">{t('terminosResumen')}</p>
        </section>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-text-soft">
          <p>{t('terminosP1')}</p>
          <p>{t('terminosP2')}</p>
          <p>{t('terminosP3')}</p>
        </div>
      </article>
    </PageShell>
  );
}
