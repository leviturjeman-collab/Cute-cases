import type { MetadataRoute } from 'next';

/** robots.txt (§16): /d/* y /admin fuera del índice. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/d/', '/admin/', '/api/', '/mis-disenos', '/cesta', '/cuenta'],
      },
    ],
    sitemap: 'https://cutecases.es/sitemap.xml',
  };
}
