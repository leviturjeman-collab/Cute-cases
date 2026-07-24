import type { ReactNode } from 'react';

type BadgeVariant = 'tresD' | 'sticker' | 'temporada' | 'nuevo' | 'noDisponible' | 'casa';

// SS4.11: Caption 12/500, radio 6; "No disponible" usa warning.
const variantClasses: Record<BadgeVariant, string> = {
  tresD: 'bg-pink-100 text-pink-700',
  sticker: 'bg-surface-2 text-text-soft',
  temporada: 'bg-pink-100 text-pink-700',
  nuevo: 'bg-pink-100 text-pink-700',
  noDisponible: 'bg-[#F7EED9] text-warning',
  casa: 'bg-surface-2 text-text-soft',
};

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
      className={`inline-flex items-center rounded-badge px-1.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
