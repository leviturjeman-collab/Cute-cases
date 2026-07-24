'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

// SS4.1: primary pink-700/blanco, secondary borde, ghost pink-500, danger error.
const variantClasses: Record<Variant, string> = {
  primary: 'bg-pink-700 text-white hover:bg-pink-800 active:bg-pink-800 disabled:bg-text-disabled',
  secondary:
    'border border-border bg-surface text-text hover:bg-surface-2 disabled:text-text-disabled',
  ghost: 'bg-transparent text-pink-500 hover:bg-pink-100 disabled:text-text-disabled',
  danger: 'bg-error text-white hover:opacity-90 disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[52px] px-6 text-[15px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-body font-medium transition-all duration-120 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon && <span className="shrink-0 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      )}
      {children}
    </button>
  );
});
