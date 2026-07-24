import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  text?: string;
  action?: ReactNode;
}

/**
 * SS4.10: ilustracion lineal monocolor (SVG propio, trazo pink-300),
 * titulo H3, texto Small y CTA. Nunca un estado vacio sin disenar (D7).
 */
export function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-border bg-surface px-6 py-12 text-center">
      <svg
        aria-hidden
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        stroke="var(--pink-300)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="20" y="8" width="32" height="56" rx="8" />
        <circle cx="30" cy="18" r="4" />
        <path d="M30 40c0-3 2.5-5 5-5s5 2 5 5c0 4-10 8-10 8" opacity="0.9" />
        <path d="M44 48l3-3m0 3l-3-3" opacity="0.7" />
      </svg>
      <div className="flex flex-col gap-1">
        <h3>{title}</h3>
        {text && <p className="max-w-xs text-[13px] text-text-soft">{text}</p>}
      </div>
      {action}
    </div>
  );
}
