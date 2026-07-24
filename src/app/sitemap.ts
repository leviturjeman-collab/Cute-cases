import type { MetadataRoute } from 'next';
import { prisma } from '@/server/db';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cute-cases.vercel.app';

/** sitemap.xml (SS22): solo rutas indexables de SS5.1. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/modelo',
    '/fundas',
    '/disenos',
    '/galeria',
    '/legal/privacidad',
    '/legal/terminos',
    '/legal/cookies',
  ].map((path) => ({ url: `${BASE}${path}`, changeFrequency: 'weekly' as const }));

  const [cases, presets] = await Promise.all([
    prisma.caseBase.findMany({ where: { activo: true }, select: { slug: true } }),
    prisma.presetDesign.findMany({ where: { publicado: true }, select: { slug: true } }),
  ]).catch(() => [[], []] as [{ slug: string }[], { slug: string }[]]);

  return [
    ...staticRoutes,
    ...cases.map((c) => ({ url: `${BASE}/fundas/${c.slug}`, changeFrequency: 'weekly' as const })),
    ...presets.map((p) => ({ url: `${BASE}/disenos/${p.slug}`, changeFrequency: 'weekly' as const })),
  ];
}
