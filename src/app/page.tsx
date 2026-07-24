import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/server/db';
import { formatCentimos } from '@/lib/pricing';
import { PageShell } from '@/components/layout/PageShell';
import { HeroCta } from '@/components/home/HeroCta';
import { ProductCard } from '@/components/ProductCard';
import { GalleryCard, type GalleryItem } from '@/components/GalleryCard';
import { CookieBanner } from '@/components/CookieBanner';
import { Badge } from '@/components/ui';

// SS5.1: SSG con revalidacion.
export const revalidate = 300;

async function getHomeData() {
  const now = new Date();
  const [settings, presets, season, publishedCount, topWeek] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.presetDesign.findMany({
      where: { publicado: true },
      orderBy: { orden: 'asc' },
      take: 4,
      select: { slug: true, nombre: true, precioCentimos: true, fotos: true },
    }),
    prisma.seasonCollection.findFirst({
      where: { activo: true, fechaInicio: { lte: now }, fechaFin: { gte: now } },
      include: {
        elementos: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
          take: 4,
          select: { slug: true, nombre: true },
        },
      },
    }),
    prisma.design.count({ where: { publicadoGaleria: true } }),
    prisma.design.findMany({
      where: { publicadoGaleria: true },
      orderBy: [{ likesCount: 'desc' }, { updatedAt: 'desc' }],
      take: 4,
      include: { user: { select: { nombre: true } } },
    }),
  ]);
  return { settings, presets, season, publishedCount, topWeek };
}

export default async function HomePage() {
  const t = await getTranslations();
  const { settings, presets, season, publishedCount, topWeek } = await getHomeData();

  const galleryItems: GalleryItem[] = topWeek.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    thumbnailUrl: d.thumbnailUrl,
    likesCount: d.likesCount,
    autor: d.autorVisible ? (d.user?.nombre?.split(' ')[0] ?? null) : null,
    shareToken: d.shareToken,
    likedByMe: false,
  }));

  const pasos = [
    { titulo: t('home.paso1Titulo'), texto: t('home.paso1Texto'), img: '/renders/pasos/modelo.webp', alt: t('home.pasoAlt1') },
    { titulo: t('home.paso2Titulo'), texto: t('home.paso2Texto'), img: '/renders/pasos/funda.webp', alt: t('home.pasoAlt2') },
    { titulo: t('home.paso3Titulo'), texto: t('home.paso3Texto'), img: '/renders/pasos/piezas.webp', alt: t('home.pasoAlt3') },
  ];

  return (
    <PageShell>
      {/* Hero (SS6.1): el CTA es el elemento dominante de la pagina */}
      <section className="relative -mt-14 flex max-h-[85svh] min-h-[560px] flex-col items-center justify-end overflow-hidden pb-12 pt-14">
        <div className="absolute inset-x-0 top-0 h-[55%]">
          <Image
            src="/renders/hero.webp"
            alt={t('home.heroAlt')}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-bg"
          />
        </div>
        <div className="relative mt-[42svh] flex flex-col items-center gap-4 px-6 text-center">
          <h1 className="max-w-xl font-display text-[32px] font-semibold leading-tight text-text sm:text-[40px]">
            {settings?.heroClaim ?? t('home.claim')}
          </h1>
          <p className="max-w-md text-[14px] text-text-soft">{t('home.subtitulo')}</p>
          <HeroCta />
        </div>
      </section>

      {/* Disenos destacados (SS6.1.2) */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-text">{t('home.destacados')}</h2>
          <Link href="/disenos" className="text-sm font-medium text-pink-700 hover:underline">
            {t('common.acciones.verTodos')}
          </Link>
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
          {presets.map((p, i) => (
            <div key={p.slug} className="w-[180px] shrink-0 snap-start sm:w-[220px]">
              <ProductCard
                href={`/disenos/${p.slug}`}
                nombre={p.nombre}
                imageUrl={(p.fotos as string[])[0] ?? null}
                imageAlt={p.nombre}
                priceLabel={formatCentimos(p.precioCentimos)}
                badge={<Badge variant="casa">{t('common.badges.disenoCasa')}</Badge>}
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Coleccion de temporada (SS6.1.3, condicional) */}
      {season && season.elementos.length > 0 && (
        <section className="bg-pink-100 py-10">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-semibold text-text">{season.nombre}</h2>
              <Link
                href="/editor?tab=temporada"
                className="text-sm font-medium text-pink-700 hover:underline"
              >
                {t('home.temporadaCta')}
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {season.elementos.map((el) => (
                <div
                  key={el.slug}
                  className="flex flex-col items-center gap-2 rounded-card bg-surface p-3 shadow-1"
                >
                  <div className="relative aspect-square w-full">
                    <Image
                      src={`/renders/elementos/${el.slug}.webp`}
                      alt={el.nombre}
                      fill
                      sizes="(max-width: 640px) 25vw, 160px"
                      className="object-contain"
                    />
                  </div>
                  <p className="text-center text-xs font-medium text-text-soft">{el.nombre}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Como funciona (SS6.1.4) */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="mb-4 font-display text-2xl font-semibold text-text">
          {t('home.comoFunciona')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {pasos.map((paso, i) => (
            <div
              key={paso.titulo}
              className="overflow-hidden rounded-card border border-border bg-surface shadow-1"
            >
              <div className="relative aspect-[4/3] bg-surface-2">
                <Image
                  src={paso.img}
                  alt={paso.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="flex gap-3 p-4">
                <span
                  aria-hidden
                  className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-pink-100 font-display font-semibold text-pink-700"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-semibold text-text">{paso.titulo}</h3>
                  <p className="text-sm text-text-soft">{paso.texto}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Galeria 2x2 (SS6.1.5): se oculta con menos de 4 publicados */}
      {publishedCount >= 4 && (
        <section className="mx-auto max-w-5xl px-4 py-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-text">
              {t('home.galeriaTitulo')}
            </h2>
            <Link href="/galeria" className="text-sm font-medium text-pink-700 hover:underline">
              {t('home.explorarGaleria')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:max-w-2xl">
            {galleryItems.map((item) => (
              <GalleryCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <CookieBanner />
      <script
        type="application/ld+json"
        // JSON-LD Organization (SS22)
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Cute Cases',
            url: 'https://cute-cases.vercel.app',
          }),
        }}
      />
    </PageShell>
  );
}
