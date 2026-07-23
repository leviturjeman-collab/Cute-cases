import type { ReactNode } from 'react';

type BadgeVariant = 'tresD' | 'sticker' | 'temporada' | 'nuevo' | 'aviso';

const variantClasses: Record<BadgeVariant, string> = {
  tresD: 'bg-pink-600 text-white',
  sticker: 'bg-pink-200 text-pink-700',
  temporada: 'bg-pink-500 text-white',
  nuevo: 'bg-success text-white',
  aviso: 'bg-error-bg text-error',
};

/** Badge "3D" / "sticker" / "🎄 Temporada" / "Nuevo" (§2.6). */
export function Badge({
  variant,
  children,
  className = '',
}: {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-extrabold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
