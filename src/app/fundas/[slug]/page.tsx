import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { PageShell } from '@/components/layout/PageShell';
import { FundaFichaClient, type FundaDetalle } from './FundaFichaClient';

export const revalidate = 300;

async function getFunda(slug: string) {
  const caseBase = await prisma.caseBase.findUnique({
    where: { slug },
    include: { variantes: true, compat: { include: { device: true } } },
  });
  if (!caseBase || !caseBase.activo) return null;
  return caseBase;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const funda = await getFunda(params.slug);
  if (!funda) return {};
  return {
    title: funda.nombre,
    description: funda.descripcion,
    openGraph: { images: (funda.fotos as string[]).slice(0, 1) },
  };
}

/** Ficha de funda (SS6.4): visor 3D, swatches, acordeones y JSON-LD. */
export default async function FundaPage({ params }: { params: { slug: string } }) {
  const funda = await getFunda(params.slug);
  if (!funda) notFound();

  const detalle: FundaDetalle = {
    id: funda.id,
    slug: funda.slug,
    nombre: funda.nombre,
    descripcion: funda.descripcion,
    material: funda.material,
    fotos: funda.fotos as string[],
    variantes: funda.variantes.map((v) => ({
      id: v.id,
      colorNombre: v.colorNombre,
      colorHex: v.colorHex,
      precioCentimos: v.precioCentimos,
      disponible: v.disponible,
    })),
    compatibles: funda.compat
      .filter((c) => c.device.activo)
      .map((c) => ({
        id: c.device.id,
        slug: c.device.slug,
        nombre: c.device.nombre,
        generacion: c.device.generacion,
        anchoMm: c.device.anchoMm,
        altoMm: c.device.altoMm,
        radioEsquinaMm: c.device.radioEsquinaMm,
        grosorMm: c.device.grosorMm,
        cameraZone: c.device.cameraZone as { x: number; y: number }[],
        moduloForma: c.device.moduloForma,
      })),
  };

  const disponibles = detalle.variantes.filter((v) => v.disponible);
  const minPrecio = disponibles.length ? Math.min(...disponibles.map((v) => v.precioCentimos)) : 0;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: funda.nombre,
    description: funda.descripcion,
    image: (funda.fotos as string[])[0],
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: (minPrecio / 100).toFixed(2),
      availability:
        disponibles.length > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <PageShell>
      <FundaFichaClient funda={detalle} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </PageShell>
  );
}
