import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Sparkles, Smartphone, Palette, Heart } from 'lucide-react';
import { prisma } from '@/server/db';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui';
import { CookieBanner } from '@/components/CookieBanner';
import { HomeCta } from '@/components/home/HomeCta';
import { formatCentimos } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

async function getHomeData() {
  try {
    const now = new Date();
    const [presets, gallery, season, heroClaim] = await Promise.all([
      prisma.presetDesign.findMany({
        where: { publicado: true },
        orderBy: { orden: 'asc' },
        take: 8,
        select: { slug: true, nombre: true, precioCentimos: true, fotos: true },
      }),
      prisma.design.findMany({
        where: { publicadoGaleria: true },
        orderBy: { likesCount: 'desc' },
        take: 4,
        select: { id: true, nombre: true, thumbnailUrl: true, likesCount: true, shareToken: true },
      }),
      prisma.seasonCollection.findFirst({
        where: { activo: true, fechaInicio: { lte: now }, fechaFin: { gte: now } },
      }),
      prisma.appSetting.findUnique({ where: { key: 'heroClaim' } }),
    ]);
    return {
      presets,
      gallery,
      season,
      heroClaim: typeof heroClaim?.value === 'string' ? heroClaim.value : null,
    };
  } catch {
    // Sin BD (p. ej. build sin entorno): la home renderiza con secciones vacías
    return { presets: [], gallery: [], season: null, heroClaim: null };
  }
}

/** Home (§5.2): hero rosa dominante + carrusel + galería + temporada + cómo funciona. */
export default async function HomePage() {
  const t = await getTranslations();
  const { presets, gallery, season, heroClaim } = await getHomeData();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4">
        {/* 2. Hero: vídeo/render pregenerado, NUNCA WebGL (§5.2, §14) */}
        <section className="relative mt-4 overflow-hidden rounded-card bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700 px-6 py-14 text-center shadow-lg">
          <div aria-hidden className="absolute inset-0 opacity-30">
            <span className="absolute left-[12%] top-[18%] text-2xl">✨</span>
            <span className="absolute right-[15%] top-[30%] text-xl">✨</span>
            <span className="absolute left-[25%] bottom-[22%] text-lg">🎀</span>
            <span className="absolute right-[22%] bottom-[15%] text-2xl">💖</span>
          </div>
          <div className="relative flex flex-col items-center gap-6">
            {/* Placeholder del vídeo en loop de la funda girando (§5.2; asset de
                producción pendiente). Mock CSS con doble bisel — nunca WebGL aquí (§14). */}
            <div aria-hidden className="rounded-[32px] bg-white/15 p-2 shadow-lg">
              <div className="relative h-48 w-[7.5rem] overflow-hidden rounded-[24px] border border-white/40 bg-gradient-to-br from-pink-200 via-pink-300 to-pink-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)]">
                <span className="absolute left-2 top-2 h-10 w-10 rounded-[12px] bg-white/35" />
                <span className="absolute left-1/2 top-[4.2rem] -translate-x-1/2 text-3xl">🎀</span>
                <span className="absolute left-4 top-[7.4rem] text-2xl">💖</span>
                <span className="absolute right-3 top-[8.6rem] rotate-12 text-xl">⭐</span>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-lg">🍓</span>
                <span className="absolute -left-8 top-0 h-full w-8 rotate-12 bg-white/25 blur-sm" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold text-white drop-shadow-sm">
              {heroClaim ?? t('common.claim')}
            </h1>
            <HomeCta label={t('home.ctaPrincipal')} />
          </div>
        </section>

        {/* 3. Carrusel de preestablecidos */}
        {presets.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4">{t('home.carruselTitulo')}</h2>
            <div className="flex snap-x gap-4 overflow-x-auto pb-2">
              {presets.map((p) => (
                <Link key={p.slug} href={`/disenos/${p.slug}`} className="snap-start">
                  <Card interactive className="w-44 shrink-0">
                    <div className="mb-2 flex aspect-square items-center justify-center rounded-thumb bg-pink-100 text-4xl">
                      🎀
                    </div>
                    <p className="truncate font-bold">{p.nombre}</p>
                    <p className="font-display text-pink-600">{formatCentimos(p.precioCentimos)}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 4. Galería de la semana (solo opt-in, §9) */}
        {gallery.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4">{t('home.galeriaTitulo')}</h2>
            <div className="grid grid-cols-2 gap-4">
              {gallery.map((d) => (
                <Link key={d.id} href={`/d/${d.shareToken}`}>
                  <Card interactive>
                    <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-thumb bg-pink-100">
                      {d.thumbnailUrl ? (
                        <img src={d.thumbnailUrl} alt={d.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-4xl">💖</span>
                      )}
                    </div>
                    <p className="truncate text-sm font-bold">{d.nombre}</p>
                    <p className="flex items-center gap-1 text-sm text-text-soft">
                      <Heart size={14} className="fill-pink-500 text-pink-500" /> {d.likesCount}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/galeria" className="font-bold text-pink-600 underline-offset-4 hover:underline">
                {t('home.verGaleria')}
              </Link>
            </div>
          </section>
        )}

        {/* 5. Bloque de temporada (solo con colección activa, §4.5) */}
        {season && (
          <section className="mt-10">
            <Link
              href="/editor?tab=temporada"
              className="flex items-center justify-between rounded-card bg-pink-500 px-6 py-5 text-white shadow-md transition-shadow hover:shadow-lg"
            >
              <span className="font-display text-lg font-semibold">
                {t('home.temporadaCta', { nombre: season.nombre })}
              </span>
              <span aria-hidden className="text-3xl">
                {season.emoji}
              </span>
            </Link>
          </section>
        )}

        {/* 6. Cómo funciona */}
        <section className="mt-12">
          <h2 className="mb-6 text-center">{t('home.comoFunciona')}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Smartphone, titulo: t('home.paso1Titulo'), texto: t('home.paso1Texto') },
              { icon: Sparkles, titulo: t('home.paso2Titulo'), texto: t('home.paso2Texto') },
              { icon: Palette, titulo: t('home.paso3Titulo'), texto: t('home.paso3Texto') },
            ].map((paso, i) => (
              <Card key={i} className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-pill bg-pink-100 text-pink-600">
                  <paso.icon size={28} strokeWidth={2} />
                </span>
                <h3>{paso.titulo}</h3>
                <p className="text-sm text-text-soft">{paso.texto}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <CookieBanner />
    </>
  );
}
