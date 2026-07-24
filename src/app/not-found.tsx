import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageShell } from '@/components/layout/PageShell';
import { Button, EmptyState } from '@/components/ui';

export default async function NotFound() {
  const t = await getTranslations('errores');
  return (
    <PageShell>
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState
          title={t('notFoundTitulo')}
          text={t('notFoundTexto')}
          action={
            <Link href="/">
              <Button>{t('notFoundCta')}</Button>
            </Link>
          }
        />
      </div>
    </PageShell>
  );
}
