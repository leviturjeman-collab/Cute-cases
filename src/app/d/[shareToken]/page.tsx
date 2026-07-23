import type { Metadata } from 'next';
import { prisma } from '@/server/db';
import { GiftPageClient } from './GiftPageClient';

export const dynamic = 'force-dynamic';

/**
 * Página pública de diseño compartido / regalo (§8.2): OG dinámico para
 * previsualización bonita en WhatsApp/IG + noindex (§13).
 */
export async function generateMetadata({
  params,
}: {
  params: { shareToken: string };
}): Promise<Metadata> {
  try {
    const design = await prisma.design.findUnique({
      where: { shareToken: params.shareToken },
      select: { nombre: true, shareNombre: true, thumbnailUrl: true },
    });
    if (!design) return { robots: { index: false } };
    const title = design.shareNombre
      ? `${design.shareNombre} quiere esta funda de regalo 💖`
      : `${design.nombre} · Cute Cases`;
    return {
      title,
      robots: { index: false, follow: false },
      openGraph: {
        title,
        description: 'Una funda personalizada hecha con mucho amor en Cute Cases ✨',
        images: design.thumbnailUrl ? [design.thumbnailUrl] : undefined,
      },
    };
  } catch {
    return { robots: { index: false } };
  }
}

export default function GiftPage({ params }: { params: { shareToken: string } }) {
  return <GiftPageClient shareToken={params.shareToken} />;
}
