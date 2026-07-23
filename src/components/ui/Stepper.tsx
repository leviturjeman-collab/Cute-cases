'use client';

import { Minus, Plus } from 'lucide-react';

export interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  label: string;
}

/** Stepper de cantidad para la cesta (§10). */
export function Stepper({ value, min = 1, max = 99, onChange, label }: StepperProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-pill border-2 border-pink-200 bg-surface"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        aria-label={`Menos ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-11 w-11 items-center justify-center rounded-pill text-pink-700 disabled:opacity-40"
      >
        <Minus size={18} strokeWidth={2} />
      </button>
      <span className="min-w-[2ch] text-center font-bold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Más ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-11 w-11 items-center justify-center rounded-pill text-pink-700 disabled:opacity-40"
      >
        <Plus size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
