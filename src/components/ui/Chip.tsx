'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  children: ReactNode;
}

/** Chip/Tag seleccionable en forma de píldora (§2.6). */
export function Chip({ selected = false, className = '', children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-pill border-2 px-4 text-sm font-bold transition-all duration-150 active:scale-[0.97] ${
        selected
          ? 'border-pink-600 bg-pink-600 text-white shadow-sm'
          : 'border-pink-300 bg-surface text-text hover:border-pink-500'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
