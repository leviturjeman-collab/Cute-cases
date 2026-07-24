'use client';

import { Check } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  children: ReactNode;
}

/** SS4.3: alto 32, radio 10; activo con fondo pink-100 y check de 14 px. */
export function Chip({ selected = false, className = '', children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-control border px-3 text-[13px] font-medium transition-colors duration-120 active:scale-[0.97] ${
        selected
          ? 'border-pink-300 bg-pink-100 text-pink-700'
          : 'border-border bg-surface text-text hover:bg-surface-2'
      } ${className}`}
      {...rest}
    >
      {selected && <Check size={14} strokeWidth={2.5} aria-hidden />}
      {children}
    </button>
  );
}
