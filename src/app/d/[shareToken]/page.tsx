import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { formatCentimos } from '@/lib/pricing';
import { getSharedDesignPayload } from '@/server/shareService';
import { PageShell } from '@/components/layout/PageShell';
import { GiftPageClient } from './GiftPageClient';

// SS5.1: SSR, noindex.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { shareToken: string };
}): Promise<Metadata> {
  const t = await getTranslations('regalo');
  const payload = await getSharedDesignPayload(params.shareToken);
  if (!payload) return { robots: { index: false } };
  return {
    title: t('ogTitulo'),
    description: t('ogDescripcion', { precio: formatCentimos(payload.precioCentimos) }),
    robots: { index: false },
    openGraph: {
      title: t('ogTitulo'),
      images: payload.thumbnailUrl ? [payload.thumbnailUrl] : undefined,
    },
  };
}

/** Diseno compartido / regalo (SS6.8). */
export default async function SharedDesignPage({
  params,
}: {
  params: { shareToken: string };
}) {
  const payload = await getSharedDesignPayload(params.shareToken);
  return (
    <PageShell>
      <GiftPageClient payload={payload} />
    </PageShell>
  );
}
