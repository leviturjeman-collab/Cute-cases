'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatCentimos } from '@/lib/pricing';

export interface PriceTagProps {
  centimos: number;
  onClick?: () => void;
}

/**
 * SS4.9: "Total" en Small, importe Price 20/600 tabular con transicion
 * odometer de 250 ms; sin cambios de color intermitentes (SS3.5).
 */
export function PriceTag({ centimos, onClick }: PriceTagProps) {
  const t = useTranslations('common.precio');
  const [display, setDisplay] = useState(centimos);
  const prev = useRef(centimos);
  const raf = useRef<number>();

  useEffect(() => {
    if (prev.current === centimos) return;
    const from = prev.current;
    prev.current = centimos;
    const start = performance.now();
    const duration = 250;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (centimos - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [centimos]);

  const inner = (
    <span className="flex items-baseline gap-2">
      <span className="text-[13px] text-text-soft">{t('total')}</span>
      <span className="tabular text-xl font-semibold text-text" aria-live="polite">
        {formatCentimos(display)}
      </span>
    </span>
  );

  if (!onClick) return inner;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver desglose del precio, total ${formatCentimos(centimos)}`}
      className="rounded-control px-2 py-1 transition-colors hover:bg-surface-2"
    >
      {inner}
    </button>
  );
}
