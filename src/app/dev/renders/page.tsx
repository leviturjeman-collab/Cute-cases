'use client';

import { notFound } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Viewer3D } from '@/editor/Viewer3D';
import { getElementThumbnail } from '@/assets-procedural/thumbnails';
import { loadLetterFont } from '@/assets-procedural';
import type { CatalogElement, DeviceSpec } from '@/editor/types';
import type { PlacedItem } from '@/lib/collision';

/**
 * Utilidad interna de renders (SS10.5, solo desarrollo): produce las imagenes
 * estaticas de tarjetas de catalogo, fichas, hero y pasos con las mismas
 * camaras nombradas ("frontal", "tres-cuartos") y las versiona via
 * /api/dev/render-save en /public/renders/.
 */

interface RenderJob {
  path: string;
  width: number;
  height: number;
  device: DeviceSpec;
  material: string;
  colorHex: string;
  items: PlacedItem[];
  catalog: Map<string, CatalogElement>;
  camera: 'frontal' | 'tres-cuartos';
}

interface CaseApi {
  id: string;
  slug: string;
  nombre: string;
  material: string;
  variantes: { id: string; colorNombre: string; colorHex: string; disponible: boolean }[];
}

async function uploadWebp(path: string, blob: Blob): Promise<void> {
  await fetch(`/api/dev/render-save?path=${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: blob,
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head!.match(/data:([^;]+)/)?.[1] ?? 'image/webp';
  const bin = atob(body!);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function DevRendersPage() {
  const [jobs, setJobs] = useState<RenderJob[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  if (process.env.NODE_ENV === 'production') notFound();

  // 1) Construir la lista de trabajos desde el catalogo real
  useEffect(() => {
    const boot = async () => {
      await loadLetterFont().catch(() => undefined);
      const devicesRes = (await (await fetch('/api/devices')).json()) as {
        generaciones: { nombre: string; modelos: (DeviceSpec & { grosorMm: number })[] }[];
      };
      const allDevices = devicesRes.generaciones.flatMap((g) => g.modelos);
      const device =
        allDevices.find((d) => d.slug === 'iphone-15-pro') ?? allDevices[0]!;

      const casesRes = (await (await fetch(`/api/cases?deviceId=${device.id}`)).json()) as {
        fundas: CaseApi[];
      };

      const list: RenderJob[] = [];

      // Tarjetas de fundas (frontal 1200x1200)
      for (const funda of casesRes.fundas) {
        const variant =
          funda.variantes.find((v) => v.disponible && /rosa/i.test(v.colorNombre)) ??
          funda.variantes.find((v) => v.disponible) ??
          funda.variantes[0]!;
        list.push({
          path: `cases/${funda.slug}.webp`,
          width: 1200,
          height: 1200,
          device,
          material: funda.material,
          colorHex: variant.colorHex,
          items: [],
          catalog: new Map(),
          camera: 'frontal',
        });
      }

      // Preestablecidos (tres cuartos 1200x1200)
      const presetsRes = (await (await fetch('/api/presets')).json()) as {
        presets: { slug: string }[];
      };
      let hero: RenderJob | null = null;
      for (const { slug } of presetsRes.presets) {
        const p = (await (await fetch(`/api/presets/${slug}`)).json()) as {
          slug: string;
          caseVariantId: string | null;
          caseBase: {
            material: string;
            variantes: { id: string; colorHex: string }[];
          } | null;
          elementos: PlacedItem[];
          compatibles: DeviceSpec[];
          elementosCatalogo: CatalogElement[];
        };
        const pDevice =
          p.compatibles.find((d) => d.slug === 'iphone-15-pro') ?? p.compatibles[0] ?? device;
        const colorHex =
          p.caseBase?.variantes.find((v) => v.id === p.caseVariantId)?.colorHex ?? '#F8C8DC';
        const job: RenderJob = {
          path: `presets/${p.slug}.webp`,
          width: 1200,
          height: 1200,
          device: pDevice,
          material: p.caseBase?.material ?? 'silicona',
          colorHex,
          items: p.elementos,
          catalog: new Map(p.elementosCatalogo.map((e) => [e.id, e])),
          camera: 'tres-cuartos',
        };
        list.push(job);
        if (p.slug === 'coquette' || !hero) hero = job;
      }

      // Hero (SS6.1): Silicona Soft rosa con "Coquette", tres cuartos, 1200x630
      if (hero) {
        list.push({ ...hero, path: 'hero.webp', width: 1200, height: 630 });
        // Poster vertical del hero 3D (rediseno realista): object-contain
        list.push({ ...hero, path: 'hero-poster.webp', width: 900, height: 1100 });
      }

      // Miniaturas de los disenos demo de la galeria (via /api/d/[token])
      const galleryRes = (await (await fetch('/api/gallery?sort=recientes')).json()) as {
        disenos: { nombre: string; shareToken: string }[];
      };
      for (const item of galleryRes.disenos) {
        const d = (await (await fetch(`/api/d/${item.shareToken}`)).json()) as {
          device: DeviceSpec;
          caseVariant: { material: string; colorHex: string };
          elementos: PlacedItem[];
          elementosCatalogo: CatalogElement[];
        };
        if (!d.device) continue;
        const slug = item.nombre
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-');
        list.push({
          path: `demo/${slug}.webp`,
          width: 1200,
          height: 1500,
          device: d.device,
          material: d.caseVariant.material,
          colorHex: d.caseVariant.colorHex,
          items: d.elementos,
          catalog: new Map(d.elementosCatalogo.map((e) => [e.id, e])),
          camera: 'tres-cuartos',
        });
      }

      // Pasos de "Como funciona" (SS6.1.4), 1200x900
      const transparente = casesRes.fundas.find((f) => f.material === 'transparente');
      const silicona = casesRes.fundas.find((f) => f.material === 'silicona');
      if (transparente) {
        list.push({
          path: 'pasos/modelo.webp',
          width: 1200,
          height: 900,
          device,
          material: 'transparente',
          colorHex: transparente.variantes[0]?.colorHex ?? '#FFFFFF',
          items: [],
          catalog: new Map(),
          camera: 'tres-cuartos',
        });
      }
      if (silicona) {
        const v = silicona.variantes.find((x) => x.disponible) ?? silicona.variantes[0]!;
        list.push({
          path: 'pasos/funda.webp',
          width: 1200,
          height: 900,
          device,
          material: 'silicona',
          colorHex: v.colorHex,
          items: [],
          catalog: new Map(),
          camera: 'tres-cuartos',
        });
      }
      if (hero) {
        list.push({ ...hero, path: 'pasos/piezas.webp', width: 1200, height: 900 });
      }

      // ?only=<subcadena> regenera solo los trabajos cuya ruta la contenga
      const only = new URLSearchParams(window.location.search).get('only');
      setJobs(only ? list.filter((j) => j.path.includes(only)) : list);

      // Miniaturas de temporada para la banda de la home (SS6.1.3)
      const elementsRes = (await (await fetch('/api/elements')).json()) as {
        porCategoria: Record<string, (CatalogElement & { id: string })[]>;
      };
      if (only && !'elementos/'.includes(only) && !only.startsWith('elementos')) {
        return;
      }
      for (const el of elementsRes.porCategoria['temporada'] ?? []) {
        const url = await getElementThumbnail(el.id, el.recipe ?? 'fallback', {
          anchoMm: el.anchoMm,
          altoMm: el.altoMm,
          profundidadMm: el.profundidadMm,
          acabado: el.acabado,
          colores: el.colores,
          letraChar: el.letraChar,
          recipeParams: el.recipeParams,
        });
        if (url) {
          await uploadWebp(`elementos/${el.slug}.webp`, dataUrlToBlob(url));
          setLog((l) => [...l, `elementos/${el.slug}.webp`]);
        }
      }
    };
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const job = jobs?.[current] ?? null;

  // 2) Capturar el trabajo actual y avanzar
  useEffect(() => {
    if (!job) {
      if (jobs && current >= jobs.length && jobs.length > 0) setDone(true);
      return;
    }
    let cancelled = false;
    const run = async () => {
      // Camaras nombradas (SS10.5): "frontal" 0/82 y "tres-cuartos" 26/74,
      // con radio calculado para que la funda entre completa en el encuadre.
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      const controls = controlsRef.current;
      if (controls) {
        const fovRad = (32 * Math.PI) / 180;
        const fitHeight = job.device.altoMm * 0.64;
        const fitWidth =
          (job.device.anchoMm * 0.7) / (job.width / job.height);
        const radius = Math.max(fitHeight, fitWidth) / Math.tan(fovRad / 2);
        const polarDeg = job.camera === 'tres-cuartos' ? 74 : 82;
        const thetaDeg = job.camera === 'tres-cuartos' ? 26 : 0;
        controls.minDistance = 0;
        controls.maxDistance = radius * 2;
        controls.object.position.setFromSpherical(
          new THREE.Spherical(
            radius,
            THREE.MathUtils.degToRad(polarDeg),
            THREE.MathUtils.degToRad(thetaDeg),
          ),
        );
        controls.object.position.add(controls.target);
        controls.update();
      }
      // Esperar a que la escena asiente (frames + fuentes)
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      if (cancelled) return;
      const canvas = document.querySelector<HTMLCanvasElement>('#render-stage canvas');
      if (canvas) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/webp', 0.9),
        );
        if (blob) {
          await uploadWebp(job.path, blob);
          setLog((l) => [...l, job.path]);
        }
      }
      if (!cancelled) setCurrent((c) => c + 1);
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);

  return (
    <main className="min-h-dvh bg-bg p-4">
      <h1 className="font-display text-lg font-semibold" data-status={done ? 'done' : 'working'}>
        Renders de catalogo {done ? '- COMPLETADO' : jobs ? `(${current}/${jobs.length})` : '(preparando)'}
      </h1>
      <ul className="my-2 text-xs text-text-soft">
        {log.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {job && (
        <div
          id="render-stage"
          style={{ width: job.width, height: job.height }}
          className="overflow-hidden bg-bg"
        >
          <Viewer3D
            key={`${job.path}`}
            device={job.device}
            material={job.material}
            colorHex={job.colorHex}
            items={job.items}
            catalog={job.catalog}
            controlsEnabled={false}
            controlsRef={(c) => {
              controlsRef.current = c;
            }}
          />
        </div>
      )}
    </main>
  );
}
