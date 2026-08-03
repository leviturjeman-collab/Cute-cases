'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCentimos } from '@/lib/pricing';
import { getRememberedDevice, rememberDevice } from '@/lib/deviceStorage';
import { track } from '@/lib/analytics';
import type { DeviceSpec } from '@/editor/types';

// Bundle 3D diferido (SS20): solo se descarga al entrar en la ficha.
const ProductViewer = dynamic(
  () => import('@/editor/ProductViewer').then((m) => m.ProductViewer),
  {
    ssr: false,
    loading: () => <div className="skeleton-shimmer h-full w-full rounded-card" aria-hidden />,
  },
);

export interface FundaDetalle {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  material: string;
  fotos: string[];
  variantes: {
    id: string;
    colorNombre: string;
    colorHex: string;
    precioCentimos: number;
    disponible: boolean;
  }[];
  compatibles: DeviceSpec[];
}

export function FundaFichaClient({ funda }: { funda: FundaDetalle }) {
  const t = useTranslations();
  const router = useRouter();
  const disponibles = funda.variantes.filter((v) => v.disponible);
  const [variantId, setVariantId] = useState(disponibles[0]?.id ?? '');
  const [openAcordeon, setOpenAcordeon] = useState<string | null>('descripcion');
  const [deviceNombre, setDeviceNombre] = useState<string | null>(null);

  useEffect(() => {
    track('funda_vista', { slug: funda.slug });
    setDeviceNombre(getRememberedDevice()?.nombre ?? null);
  }, [funda.slug]);

  const variant = funda.variantes.find((v) => v.id === variantId) ?? disponibles[0];

  // Dispositivo para el visor: el recordado si es compatible, si no el primero
  const viewerDevice = useMemo(() => {
    const remembered = getRememberedDevice();
    return (
      funda.compatibles.find((d) => d.id === remembered?.id) ?? funda.compatibles[0] ?? null
    );
  }, [funda.compatibles]);

  const personalizar = () => {
    if (!variant) return;
    const remembered = getRememberedDevice();
    const compatible = funda.compatibles.find((d) => d.id === remembered?.id);
    if (!compatible) {
      // Sin modelo valido: elegirlo primero conservando el destino (SS6.4)
      if (funda.compatibles.length === 1) {
        rememberDevice({
          id: funda.compatibles[0]!.id,
          nombre: funda.compatibles[0]!.nombre,
          slug: funda.compatibles[0]!.slug,
        });
      } else {
        router.push(`/modelo?volver=${encodeURIComponent(`/fundas/${funda.slug}`)}`);
        return;
      }
    }
    track('editor_abierto', { origen: 'funda' });
    router.push(`/editor?variant=${variant.id}`);
  };

  const acordeones = [
    { id: 'descripcion', titulo: t('fundas.descripcion'), texto: funda.descripcion },
    { id: 'material', titulo: t('fundas.materialCuidados'), texto: t('fundas.materialCuidadosTexto') },
    {
      id: 'compatibilidad',
      titulo: t('fundas.compatibilidad'),
      texto: funda.compatibles.map((d) => d.nombre).join(', '),
    },
    { id: 'como', titulo: t('fundas.comoFuncionaAcordeon'), texto: t('fundas.comoFuncionaTexto') },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav aria-label={t('fundas.migas')} className="mb-3 text-sm text-text-soft">
        {deviceNombre ? `${deviceNombre} / ` : ''}
        {t('fundas.migas')} / {funda.nombre}
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Visor 3D interactivo (SS6.4): primer viewport */}
        <div className="h-[62svh] min-h-[380px] overflow-hidden rounded-card border border-border bg-surface-2 lg:h-[560px]">
          {viewerDevice && variant && (
            <ProductViewer
              device={viewerDevice}
              material={funda.material}
              colorHex={variant.colorHex}
            />
          )}
        </div>

        <div>
          <h1 className="font-display text-[28px] font-semibold text-text">{funda.nombre}</h1>
          <p className="mt-0.5 text-sm text-text-soft">{t(`fundas.materiales.${funda.material}`)}</p>

          {/* Selector de variante (SS6.4) */}
          <div className="mt-5">
            <p className="text-[13px] font-medium text-text">{variant?.colorNombre}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {funda.variantes.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-label={
                    v.disponible ? v.colorNombre : `${v.colorNombre}: ${t('common.precio.agotado')}`
                  }
                  aria-pressed={variantId === v.id}
                  disabled={!v.disponible}
                  title={v.disponible ? v.colorNombre : t('common.precio.agotado')}
                  onClick={() => {
                    setVariantId(v.id);
                    track('variante_cambiada');
                  }}
                  className={`relative h-8 w-8 rounded-full border border-border transition-shadow duration-120 ${
                    variantId === v.id ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-bg' : ''
                  } ${v.disponible ? '' : 'cursor-not-allowed opacity-50'}`}
                  style={{ backgroundColor: v.colorHex }}
                >
                  {!v.disponible && (
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-text-soft"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <p className="tabular mt-5 text-[20px] font-semibold text-text">
            {variant ? formatCentimos(variant.precioCentimos) : ''}
          </p>

          <Button size="lg" className="mt-4 w-full sm:w-auto" onClick={personalizar} disabled={!variant}>
            {t('fundas.personalizar')}
          </Button>

          {/* Acordeones de informacion (SS6.4) */}
          <div className="mt-8 divide-y divide-border border-t border-border">
            {acordeones.map((a) => {
              const open = openAcordeon === a.id;
              return (
                <div key={a.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenAcordeon(open ? null : a.id)}
                    className="flex h-12 w-full items-center justify-between text-left text-[15px] font-medium text-text"
                  >
                    {a.titulo}
                    <ChevronDown
                      size={18}
                      aria-hidden
                      className={`text-text-soft transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {open && <p className="pb-4 text-sm leading-relaxed text-text-soft">{a.texto}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
