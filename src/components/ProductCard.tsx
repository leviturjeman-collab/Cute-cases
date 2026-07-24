import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

export interface ProductCardProps {
  href: string;
  nombre: string;
  imageUrl: string | null;
  imageAlt: string;
  /** Linea secundaria (material, modelo...). */
  subtitle?: string;
  /** Precio ya formateado ("Desde 19,95 EUR" o cerrado). */
  priceLabel: string;
  badge?: ReactNode;
  /** Fila inferior (swatches de variantes, etc.). */
  footer?: ReactNode;
  priority?: boolean;
}

/**
 * Card de producto (SS4.8): imagen 4:5 sobre --surface-2, nombre Body
 * strong, precio; elevacion 1 en reposo y 2 en hover.
 */
export function ProductCard({
  href,
  nombre,
  imageUrl,
  imageAlt,
  subtitle,
  priceLabel,
  badge,
  footer,
  priority = false,
}: ProductCardProps) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-card border border-border bg-surface shadow-1 transition-shadow duration-200 hover:shadow-2"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-2">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div aria-hidden className="flex h-full w-full items-center justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              stroke="var(--pink-300)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <rect x="14" y="4" width="20" height="40" rx="6" />
              <circle cx="20" cy="11" r="2.5" />
            </svg>
          </div>
        )}
        {badge && <div className="absolute left-2 top-2">{badge}</div>}
      </div>
      <div className="space-y-0.5 p-3">
        <p className="text-[15px] font-semibold text-text">{nombre}</p>
        {subtitle && <p className="text-sm text-text-soft">{subtitle}</p>}
        <p className="tabular pt-0.5 text-sm font-medium text-text">{priceLabel}</p>
        {footer && <div className="pt-1.5">{footer}</div>}
      </div>
    </Link>
  );
}
