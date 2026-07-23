import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

/** Tarjeta con radio 24px y sombra blanda (§2.4). */
export function Card({ children, interactive = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-card bg-surface p-4 shadow-sm ${
        interactive ? 'transition-shadow duration-200 hover:shadow-md' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
