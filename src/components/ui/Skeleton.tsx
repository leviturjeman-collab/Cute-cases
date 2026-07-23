/** Skeleton de carga de marca (§2.6): pulso rosa suave. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`animate-pulse rounded-thumb bg-pink-200/70 ${className}`} />
  );
}

/** Grid de skeletons para catálogos. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
