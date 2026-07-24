import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { PageShell } from '@/components/layout/PageShell';
import type { GalleryItem } from '@/components/GalleryCard';
import { GaleriaClient } from './GaleriaClient';

// SS5.1: SSR paginada e indexable — primera pagina en servidor.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('galeria');
  return { title: t('titulo') };
}

export default async function GaleriaPage() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const likeGroups = await prisma.like.groupBy({
    by: ['designId'],
    where: { createdAt: { gte: since }, design: { publicadoGaleria: true } },
    _count: { designId: true },
    orderBy: { _count: { designId: 'desc' } },
    take: 100,
  });
  const rank = new Map(likeGroups.map((l, i) => [l.designId, i]));
  const designs = await prisma.design.findMany({
    where: { publicadoGaleria: true },
    include: { user: { select: { nombre: true } } },
    orderBy: [{ likesCount: 'desc' }, { updatedAt: 'desc' }],
    take: 24,
  });
  designs.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));

  const user = await getSessionUser();
  const likedSet = user
    ? new Set(
        (
          await prisma.like.findMany({
            where: { userId: user.id, designId: { in: designs.map((d) => d.id) } },
            select: { designId: true },
          })
        ).map((l) => l.designId),
      )
    : new Set<string>();

  const initial: GalleryItem[] = designs.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    thumbnailUrl: d.thumbnailUrl,
    likesCount: d.likesCount,
    autor: d.autorVisible ? (d.user?.nombre?.split(' ')[0] ?? null) : null,
    shareToken: d.shareToken,
    likedByMe: likedSet.has(d.id),
  }));

  return (
    <PageShell>
      <GaleriaClient initialSemana={initial} />
    </PageShell>
  );
}
