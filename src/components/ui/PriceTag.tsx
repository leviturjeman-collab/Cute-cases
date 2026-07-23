'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCentimos } from '@/lib/pricing';

export interface PriceTagProps {
  centimos: number;
  onClick?: () => void;
  label?: string;
}

/**
 * PriceTag animado (§2.5, §6.7): contador rodante + pulso de color al cambiar.
 * Tap abre el desglose si se pasa onClick.
 */
export function PriceTag({ centimos, onClick, label }: PriceTagProps) {
  const [display, setDisplay] = useState(centimos);
  const [pulse, setPulse] = useState(false);
  const prev = useRef(centimos);
  const raf = useRef<number>();

  useEffect(() => {
    if (prev.current === centimos) return;
    const from = prev.current;
    prev.current = centimos;
    setPulse(true);
    const start = performance.now();
    const duration = 350;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (centimos - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setTimeout(() => setPulse(false), 200);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [centimos]);

  const content = (
    <span
      className={`font-display text-lg font-bold transition-colors duration-200 ${
        pulse ? 'text-pink-600' : 'text-text'
      }`}
      aria-live="polite"
    >
      {label ? `${label} ` : ''}
      {formatCentimos(display)}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-pill bg-surface px-4 py-1.5 shadow-sm"
        aria-label={`Ver desglose del precio, total ${formatCentimos(centimos)}`}
      >
        {content}
      </button>
    );
  }
  return <span className="rounded-pill bg-surface px-4 py-1.5 shadow-sm">{content}</span>;
}
