'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { getRememberedDevice } from '@/lib/deviceStorage';
import { track } from '@/lib/analytics';

/**
 * CTA del hero (SS6.1): destino /modelo, o /fundas directamente si existe
 * cc.device (mostrando el chip del modelo con opcion de cambio).
 */
export function HeroCta() {
  const t = useTranslations();
  const router = useRouter();
  const [deviceName, setDeviceName] = useState<string | null>(null);

  useEffect(() => {
    setDeviceName(getRememberedDevice()?.nombre ?? null);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        size="lg"
        className="min-w-[240px]"
        onClick={() => {
          track('home_cta_click');
          router.push(deviceName ? '/fundas' : '/modelo');
        }}
      >
        {t('home.cta')}
      </Button>
      {deviceName && (
        <button
          type="button"
          onClick={() => router.push('/modelo?volver=%2Ffundas')}
          className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-sm text-text-soft transition-colors duration-120 hover:bg-surface-2"
        >
          {t('home.tuDispositivo', { modelo: deviceName })}
          <span className="font-medium text-pink-700">{t('common.acciones.cambiar')}</span>
        </button>
      )}
    </div>
  );
}
