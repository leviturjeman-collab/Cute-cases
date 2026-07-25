'use client';

import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { DeviceSpec } from '@/editor/types';

const Viewer3D = dynamic(() => import('@/editor/Viewer3D').then((m) => m.Viewer3D), {
  ssr: false,
});

/**
 * Pagina interna de verificacion: una funda por cada forma de modulo de
 * camara, en frontal, para comparar proporciones con los iPhone reales.
 */
export default function DevCamarasPage() {
  const [devices, setDevices] = useState<(DeviceSpec & { grosorMm: number })[]>([]);

  if (process.env.NODE_ENV === 'production') notFound();

  useEffect(() => {
    const boot = async () => {
      const res = (await (await fetch('/api/devices')).json()) as {
        generaciones: { nombre: string; modelos: (DeviceSpec & { grosorMm: number })[] }[];
      };
      const all = res.generaciones.flatMap((g) => g.modelos);
      const seen = new Set<string>();
      const picks: (DeviceSpec & { grosorMm: number })[] = [];
      for (const d of all) {
        const forma = d.moduloForma ?? 'ninguna';
        // El 17 Air y el 17 Pro comparten forma pero no disposicion real
        const clave = forma === 'barra-horizontal' ? `${forma}-${d.slug.includes('air')}` : forma;
        if (!seen.has(clave)) {
          seen.add(clave);
          picks.push(d);
        }
      }
      setDevices(picks);
    };
    void boot();
  }, []);

  return (
    <main className="min-h-dvh bg-bg p-4">
      <h1
        className="font-display text-lg font-semibold"
        data-status={devices.length > 0 ? 'done' : 'working'}
      >
        Modulos de camara por forma
      </h1>
      <div className="grid grid-cols-4 gap-2">
        {devices.map((d) => (
          <div key={d.slug}>
            <p className="text-xs text-text-soft">
              {d.nombre} - {d.moduloForma}
            </p>
            <div style={{ width: 330, height: 430 }} className="overflow-hidden bg-bg">
              <Viewer3D
                device={d}
                material="silicona"
                colorHex="#F1C6D2"
                items={[]}
                catalog={new Map()}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
