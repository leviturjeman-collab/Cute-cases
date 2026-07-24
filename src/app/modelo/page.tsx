import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/server/db';
import { PageShell } from '@/components/layout/PageShell';
import { ModeloClient, type DeviceRow } from './ModeloClient';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('modelo');
  return { title: t('titulo'), description: t('subtitulo') };
}

/** Seleccion de modelo (SS6.2): acordeon por generacion, 17 -> 13. */
export default async function ModeloPage() {
  const devices = await prisma.deviceModel.findMany({
    where: { activo: true },
    orderBy: [{ generacion: 'desc' }, { nombre: 'asc' }],
    select: {
      id: true,
      slug: true,
      nombre: true,
      generacion: true,
      anchoMm: true,
      altoMm: true,
      radioEsquinaMm: true,
      cameraZone: true,
      moduloForma: true,
    },
  });
  return (
    <PageShell>
      <Suspense>
        <ModeloClient devices={devices as unknown as DeviceRow[]} />
      </Suspense>
    </PageShell>
  );
}
