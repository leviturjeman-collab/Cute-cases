import { prisma } from './db';
import { parseHitbox } from './designService';
import {
  escenaValida,
  type DeviceSpec,
  type ElementShape,
  type PlacedItem,
  type Polygon,
} from '@/lib/collision';

/**
 * Modelos compatibles de un preset (SS13.4, SS26.25): validacion de
 * colisiones por modelo, cacheada en memoria por (presetId, updatedAt-ish).
 */

const cache = new Map<string, string[]>();

function parsePolygon(json: unknown): Polygon {
  if (!Array.isArray(json)) return [];
  return json
    .filter(
      (p): p is { x: number; y: number } =>
        typeof p === 'object' && p !== null && typeof (p as { x?: unknown }).x === 'number',
    )
    .map((p) => ({ x: p.x, y: p.y }));
}

export interface PresetData {
  caseSlug?: string;
  caseVariantId?: string;
  elementos?: (PlacedItem & { elementSlug?: string })[];
}

export async function compatibleDeviceIdsForPreset(presetId: string): Promise<string[]> {
  const cached = cache.get(presetId);
  if (cached) return cached;

  const preset = await prisma.presetDesign.findUnique({ where: { id: presetId } });
  if (!preset) return [];
  const data = preset.designData as PresetData;
  const items = (data.elementos ?? []).map((e, i) => ({
    instanceId: e.instanceId ?? `p${i}`,
    elementId: e.elementId,
    xMm: e.xMm,
    yMm: e.yMm,
    rotationDeg: e.rotationDeg,
    letterChar: e.letterChar ?? undefined,
  }));
  const elementIds = [...new Set(items.map((i) => i.elementId))];
  const elements = await prisma.element.findMany({ where: { id: { in: elementIds } } });
  const shapes = new Map<string, ElementShape>(
    elements.map((e) => [e.id, { hitbox: parseHitbox(e.hitbox), anchoMm: e.anchoMm, altoMm: e.altoMm }]),
  );

  const caseBase = data.caseSlug
    ? await prisma.caseBase.findUnique({
        where: { slug: data.caseSlug },
        include: { compat: { include: { device: true } } },
      })
    : null;
  const devices = caseBase?.compat.map((c) => c.device).filter((d) => d.activo) ?? [];

  const ids: string[] = [];
  for (const d of devices) {
    const spec: DeviceSpec = {
      anchoMm: d.anchoMm,
      altoMm: d.altoMm,
      radioEsquinaMm: d.radioEsquinaMm,
      cameraZone: parsePolygon(d.cameraZone),
    };
    if (escenaValida(items, shapes, spec)) ids.push(d.id);
  }
  cache.set(presetId, ids);
  return ids;
}

export function invalidatePresetCache(presetId?: string): void {
  if (presetId) cache.delete(presetId);
  else cache.clear();
}
