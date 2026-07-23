'use client';

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Input píldora con label real y error asociado por aria-describedby (§15). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className = '', id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="pl-4 text-sm font-bold text-text">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`min-h-[48px] rounded-pill border-2 bg-surface px-5 text-base text-text placeholder:text-text-soft focus:border-pink-500 ${
          error ? 'border-error' : 'border-pink-200'
        }`}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="pl-4 text-xs text-text-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="pl-4 text-xs font-bold text-error">
          {error}
        </p>
      )}
    </div>
  );
});
