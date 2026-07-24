'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';

export interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  onRemove?: () => void;
  label: string;
}

/** SS4.12: botones de 36 px, valor tabular; el menos en 1 se vuelve papelera. */
export function Stepper({ value, min = 1, max = 99, onChange, onRemove, label }: StepperProps) {
  const atMin = value <= min;
  return (
    <div
      className="inline-flex items-center gap-1 rounded-control border border-border bg-surface"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        aria-label={atMin && onRemove ? 'Eliminar' : `Menos ${label}`}
        onClick={() => {
          if (atMin) onRemove?.();
          else onChange(value - 1);
        }}
        disabled={atMin && !onRemove}
        className="flex h-9 w-9 items-center justify-center rounded-control text-text-soft transition-colors hover:text-text disabled:opacity-40"
      >
        {atMin && onRemove ? <Trash2 size={16} aria-hidden /> : <Minus size={16} aria-hidden />}
      </button>
      <span className="tabular min-w-[2ch] text-center text-[15px] font-medium" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Mas ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-9 w-9 items-center justify-center rounded-control text-text-soft transition-colors hover:text-text disabled:opacity-40"
      >
        <Plus size={16} aria-hidden />
      </button>
    </div>
  );
}
