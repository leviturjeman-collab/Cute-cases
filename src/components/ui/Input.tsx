'use client';

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** SS4.2: variante con contador de caracteres. */
  showCount?: boolean;
}

/** SS4.2: alto 44, radio 10, label SIEMPRE visible encima, error debajo. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, showCount = false, className = '', id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const length = typeof rest.value === 'string' ? rest.value.length : 0;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-[13px] font-medium text-text">
          {label}
        </label>
        {showCount && rest.maxLength && (
          <span className="tabular text-xs text-text-soft">
            {length}/{rest.maxLength}
          </span>
        )}
      </div>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`h-11 rounded-control border bg-surface px-3.5 text-[15px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-pink-500 focus:ring-2 focus:ring-pink-500/25 ${
          error ? 'border-error' : 'border-border'
        }`}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-[13px] text-text-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
});
