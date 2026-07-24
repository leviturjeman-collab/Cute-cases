'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { ChevronDown } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { CameraModuleIcon } from '@/components/CameraModuleIcon';
import { getRememberedDevice, rememberDevice } from '@/lib/deviceStorage';
import { readDraft, clearDraft } from '@/editor/autosave';
import { api } from '@/lib/api-client';
import { track } from '@/lib/analytics';

export interface DeviceRow {
  id: string;
  slug: string;
  nombre: string;
  generacion: string;
  anchoMm: number;
  altoMm: number;
  radioEsquinaMm: number;
  cameraZone: { x: number; y: number }[];
  moduloForma: string;
}

export function ModeloClient({ devices }: { devices: DeviceRow[] }) {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useSession();
  const volver = params.get('volver') ?? '/fundas';

  const [query, setQuery] = useState('');
  const [remembered, setRemembered] = useState(() => getRememberedDevice());
  const [pendingDevice, setPendingDevice] = useState<DeviceRow | null>(null);

  const generations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? devices.filter((d) => d.nombre.toLowerCase().includes(q)) : devices;
    const byGen = new Map<string, DeviceRow[]>();
    for (const d of filtered) {
      const list = byGen.get(d.generacion) ?? [];
      list.push(d);
      byGen.set(d.generacion, list);
    }
    return [...byGen.entries()].sort((a, b) =>
      b[0].localeCompare(a[0], 'es', { numeric: true }),
    );
  }, [devices, query]);

  const [openGen, setOpenGen] = useState<string | null>(null);
  const effectiveOpen = query.trim() ? null : (openGen ?? generations[0]?.[0] ?? null);

  const confirmSelect = (device: DeviceRow) => {
    rememberDevice({ id: device.id, nombre: device.nombre });
    setRemembered({ id: device.id, nombre: device.nombre });
    track('modelo_seleccionado', { modelo: device.slug });
    if (status === 'authenticated') {
      void api('/api/me', { method: 'PATCH', body: JSON.stringify({ deviceId: device.id }) }).catch(
        () => undefined,
      );
    }
    router.push(volver);
  };

  const onSelect = (device: DeviceRow) => {
    // SS6.2: con diseno en curso y modelo distinto -> modal T-16
    const draft = readDraft();
    if (draft && draft.deviceId && draft.deviceId !== device.id && draft.items.length > 0) {
      setPendingDevice(device);
      return;
    }
    confirmSelect(device);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-[28px] font-semibold text-text">{t('modelo.titulo')}</h1>
      <p className="mt-1 text-[14px] text-text-soft">{t('modelo.subtitulo')}</p>

      {remembered && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface-2 px-4 py-3">
          <p className="text-sm font-medium text-text">
            {t('modelo.banner', { modelo: remembered.nombre })}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => router.push(volver)}>{t('common.acciones.continuar')}</Button>
            <Button variant="secondary" onClick={() => setRemembered(null)}>
              {t('common.acciones.cambiar')}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5">
        <Input
          label={t('modelo.buscar')}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('modelo.buscar')}
        />
      </div>

      {generations.length === 0 && (
        <p className="mt-8 text-center text-sm text-text-soft">{t('modelo.sinResultados')}</p>
      )}

      <div className="mt-5 space-y-3">
        {generations.map(([gen, models]) => {
          const open = query.trim() ? true : effectiveOpen === gen;
          return (
            <section key={gen} className="overflow-hidden rounded-card border border-border bg-surface">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenGen(open ? '' : gen)}
                className="flex h-12 w-full items-center justify-between px-4 font-display text-[15px] font-semibold text-text"
              >
                {t('modelo.generacion', { gen })}
                <ChevronDown
                  size={18}
                  aria-hidden
                  className={`text-text-soft transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
              </button>
              {open && (
                <ul className="border-t border-border">
                  {models.map((d) => (
                    <li key={d.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => onSelect(d)}
                        className={`flex h-16 w-full items-center justify-between px-4 text-left transition-colors duration-120 hover:bg-surface-2 ${
                          remembered?.id === d.id ? 'bg-pink-100/60' : ''
                        }`}
                      >
                        <span className="text-[15px] font-medium text-text">{d.nombre}</span>
                        <CameraModuleIcon
                          anchoMm={d.anchoMm}
                          altoMm={d.altoMm}
                          radioEsquinaMm={d.radioEsquinaMm}
                          cameraZone={d.cameraZone}
                          moduloForma={d.moduloForma}
                          height={48}
                          title={t('modelo.moduloAlt', { modelo: d.nombre })}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <Modal
        open={pendingDevice !== null}
        onClose={() => setPendingDevice(null)}
        title={t('toasts.T16')}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setPendingDevice(null)}>
            {t('common.acciones.cancelar')}
          </Button>
          <Button
            onClick={() => {
              clearDraft();
              if (pendingDevice) confirmSelect(pendingDevice);
              setPendingDevice(null);
            }}
          >
            {t('common.acciones.continuar')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
