import type { ReactNode } from 'react';

export interface EmptyStateProps {
  emoji: string;
  title: string;
  action?: ReactNode;
}

/** EmptyState ilustrado con CTA (§5.1). */
export function EmptyState({ emoji, title, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card bg-surface/60 px-6 py-12 text-center">
      <span aria-hidden className="text-6xl">
        {emoji}
      </span>
      <p className="max-w-xs font-display text-lg font-semibold text-text">{title}</p>
      {action}
    </div>
  );
}
