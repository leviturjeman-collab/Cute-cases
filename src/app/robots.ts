import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cute-cases.vercel.app';

/** robots.txt (SS22): sin editor, rutas privadas, admin ni /d/*. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/editor', '/mis-disenos', '/cesta', '/cuenta', '/admin', '/d/', '/api/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
