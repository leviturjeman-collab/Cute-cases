/** SS4.10: bloques surface-2 con shimmer de 1,2 s que replican la geometria real. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton-shimmer rounded-thumb ${className}`} />;
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
