import type { MetadataRoute } from 'next';
import { prisma } from '@/server/db';

const BASE = 'https://cutecases.es';

/** sitemap.xml (§16): páginas públicas + fichas de fundas y preestablecidos. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/modelo`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/fundas`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/disenos`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/galeria`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${BASE}/legal/privacidad`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${BASE}/legal/terminos`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${BASE}/legal/cookies`, changeFrequency: 'yearly', priority: 0.1 },
  ];
  try {
    const [cases, presets] = await Promise.all([
      prisma.caseBase.findMany({ where: { activo: true }, select: { slug: true } }),
      prisma.presetDesign.findMany({ where: { publicado: true }, select: { slug: true } }),
    ]);
    return [
      ...staticPages,
      ...cases.map((c) => ({ url: `${BASE}/fundas/${c.slug}`, priority: 0.7 })),
      ...presets.map((p) => ({ url: `${BASE}/disenos/${p.slug}`, priority: 0.6 })),
    ];
  } catch {
    return staticPages;
  }
}
