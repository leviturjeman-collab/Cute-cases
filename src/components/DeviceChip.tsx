'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Smartphone } from 'lucide-react';

/**
 * Chip de dispositivo activo (SS5.2): persistente en catalogo y editor,
 * con accion de cambio que abre /modelo conservando la ruta de retorno.
 */
export function DeviceChip({ nombre, returnTo }: { nombre: string; returnTo: string }) {
  const router = useRouter();
  const t = useTranslations('common');
  return (
    <button
      type="button"
      onClick={() => router.push(`/modelo?volver=${encodeURIComponent(returnTo)}`)}
      className="inline-flex h-8 items-center gap-1.5 rounded-control border border-border bg-surface px-3 text-sm font-medium text-text transition-colors duration-120 hover:bg-surface-2"
    >
      <Smartphone size={14} strokeWidth={1.8} aria-hidden />
      {nombre}
      <span className="text-pink-700">{t('acciones.cambiar')}</span>
    </button>
  );
}
