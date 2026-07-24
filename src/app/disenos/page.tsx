import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/server/db';
import { compatibleDeviceIdsForPreset } from '@/server/presetService';
import { PageShell } from '@/components/layout/PageShell';
import { DisenosClient, type PresetCardData } from './DisenosClient';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('disenos');
  return { title: t('titulo') };
}

/** Catalogo de preestablecidos (SS6.5): grid con filtro por generacion. */
export default async function DisenosPage() {
  const presets = await prisma.presetDesign.findMany({
    where: { publicado: true },
    orderBy: { orden: 'asc' },
    select: { id: true, slug: true, nombre: true, precioCentimos: true, fotos: true },
  });

  const cards: PresetCardData[] = await Promise.all(
    presets.map(async (p) => {
      const deviceIds = await compatibleDeviceIdsForPreset(p.id);
      const devices = await prisma.deviceModel.findMany({
        where: { id: { in: deviceIds }, activo: true },
        select: { generacion: true },
      });
      return {
        slug: p.slug,
        nombre: p.nombre,
        precioCentimos: p.precioCentimos,
        foto: (p.fotos as string[])[0] ?? null,
        generaciones: [...new Set(devices.map((d) => d.generacion))],
        compatibles: devices.length,
      };
    }),
  );

  return (
    <PageShell>
      <DisenosClient presets={cards} />
    </PageShell>
  );
}
