'use client';

import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, className = '', id, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={selectId} className="pl-4 text-sm font-bold text-text">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        className="min-h-[48px] appearance-none rounded-pill border-2 border-pink-200 bg-surface px-5 text-base text-text focus:border-pink-500"
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
});
