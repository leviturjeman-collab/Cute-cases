'use client';

import { useEffect, useState } from 'react';

/**
 * Confeti rosa de celebración (§2.5): al guardar por primera vez y al añadir a
 * la cesta. Duración ≤ 1,5 s. Respeta prefers-reduced-motion (no se renderiza).
 */
export function Confetti({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<
    { id: number; x: number; delay: number; color: string; size: number }[]
  >([]);

  useEffect(() => {
    if (trigger === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#FF69B4', '#F5259C', '#FFC9E3', '#FFA1CF', '#C71585'];
    const items = Array.from({ length: 36 }, (_, i) => ({
      id: trigger * 100 + i,
      x: Math.random() * 100,
      delay: Math.random() * 0.4,
      color: colors[i % colors.length]!,
      size: 6 + Math.random() * 6,
    }));
    setParticles(items);
    const t = setTimeout(() => setParticles([]), 1500);
    return () => clearTimeout(t);
  }, [trigger]);

  if (particles.length === 0) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-20px] block animate-[confetti-fall_1.4s_ease-in_forwards]"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.id % 2 === 0 ? '9999px' : '2px',
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(105vh) rotate(540deg);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
