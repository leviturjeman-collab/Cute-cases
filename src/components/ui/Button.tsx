'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-pink-600 text-white shadow-md hover:bg-pink-700 active:scale-[0.96] disabled:bg-pink-300',
  secondary:
    'bg-surface text-pink-700 border-2 border-pink-300 shadow-sm hover:border-pink-500 active:scale-[0.96] disabled:opacity-50',
  ghost: 'bg-transparent text-pink-700 hover:bg-pink-200 active:scale-[0.96] disabled:opacity-50',
  danger: 'bg-error text-white shadow-sm hover:opacity-90 active:scale-[0.96] disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-[36px] px-4 text-sm',
  md: 'min-h-[44px] px-6 text-base',
  lg: 'min-h-[56px] px-8 text-lg',
};

/** Botón píldora con estados default/hover/pressed/focus/disabled/loading (§2.6). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-pill font-body font-bold transition-all duration-150 ease-bounce disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
});
