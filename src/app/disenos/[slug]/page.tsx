import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/server/db';
import { compatibleDeviceIdsForPreset, type PresetData } from '@/server/presetService';
import { PageShell } from '@/components/layout/PageShell';
import { PresetFichaClient, type PresetDetalle } from './PresetFichaClient';

export const revalidate = 300;

async function getPreset(slug: string): Promise<PresetDetalle | null> {
  const preset = await prisma.presetDesign.findUnique({ where: { slug } });
  if (!preset || !preset.publicado) return null;

  const data = preset.designData as PresetData;
  const compatibleIds = await compatibleDeviceIdsForPreset(preset.id);
  const devices = await prisma.deviceModel.findMany({
    where: { id: { in: compatibleIds }, activo: true },
    orderBy: [{ generacion: 'desc' }, { nombre: 'asc' }],
  });
  const caseBase = data.caseSlug
    ? await prisma.caseBase.findUnique({ where: { slug: data.caseSlug }, include: { variantes: true } })
    : null;
  const variant = caseBase?.variantes.find((v) => v.id === data.caseVariantId) ?? null;
  const elementIds = [...new Set((data.elementos ?? []).map((e) => e.elementId))];
  const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });

  return {
    id: preset.id,
    slug: preset.slug,
    nombre: preset.nombre,
    precioCentimos: preset.precioCentimos,
    fotos: preset.fotos as string[],
    material: caseBase?.material ?? 'silicona',
    colorHex: variant?.colorHex ?? '#F8C8DC',
    fundaNombre: caseBase && variant ? `${caseBase.nombre} ${variant.colorNombre}` : null,
    elementos: (data.elementos ?? []).map((e, i) => ({
      instanceId: e.instanceId ?? `preset-${i}`,
      elementId: e.elementId,
      xMm: e.xMm,
      yMm: e.yMm,
      rotationDeg: e.rotationDeg,
      letterChar: e.letterChar ?? undefined,
    })),
    compatibles: devices.map((d) => ({
      id: d.id,
      slug: d.slug,
      nombre: d.nombre,
      generacion: d.generacion,
      anchoMm: d.anchoMm,
      altoMm: d.altoMm,
      radioEsquinaMm: d.radioEsquinaMm,
      grosorMm: d.grosorMm,
      cameraZone: d.cameraZone as { x: number; y: number }[],
      moduloForma: d.moduloForma,
    })),
    elementosCatalogo: elements.map((e) => ({
      id: e.id,
      slug: e.slug,
      nombre: e.nombre,
      tipo: e.tipo as 'charm3d' | 'plano',
      categoria: e.categoria,
      precioCentimos: e.precioCentimos,
      anchoMm: e.anchoMm,
      altoMm: e.altoMm,
      profundidadMm: e.profundidadMm,
      recipe: e.recipe,
      recipeParams: e.recipeParams as Record<string, unknown> | null,
      assetUrl: e.assetUrl,
      hitbox: e.hitbox as never,
      acabado: e.acabado,
      colores: e.colores as string[],
      letraChar: e.letraChar,
      esNuevo: e.esNuevo,
    })),
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const preset = await prisma.presetDesign.findUnique({ where: { slug: params.slug } });
  if (!preset || !preset.publicado) return {};
  return {
    title: preset.nombre,
    openGraph: { images: (preset.fotos as string[]).slice(0, 1) },
  };
}

/** Ficha de preestablecido (SS6.5): visor 3D de solo visualizacion. */
export default async function PresetPage({ params }: { params: { slug: string } }) {
  const preset = await getPreset(params.slug);
  if (!preset) notFound();
  return (
    <PageShell>
      <PresetFichaClient preset={preset} />
    </PageShell>
  );
}
