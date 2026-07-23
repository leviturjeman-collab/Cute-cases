'use client';

import type { ReactNode } from 'react';

export type SheetPosition = 'collapsed' | 'half' | 'expanded';

export interface BottomSheetProps {
  position: SheetPosition;
  onPositionChange: (p: SheetPosition) => void;
  /** Contenido siempre visible (pestañas). */
  header: ReactNode;
  children: ReactNode;
}

const heights: Record<SheetPosition, string> = {
  collapsed: 'h-[76px]',
  half: 'h-[240px]',
  expanded: 'h-[70dvh]',
};

const order: SheetPosition[] = ['collapsed', 'half', 'expanded'];

/**
 * Bottom sheet del editor con 3 posiciones y handle arrastrable (§6.1).
 * El handle también funciona por tap/teclado (accesibilidad §15).
 */
export function BottomSheet({ position, onPositionChange, header, children }: BottomSheetProps) {
  const cycle = () => {
    const idx = order.indexOf(position);
    onPositionChange(order[(idx + 1) % order.length]!);
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-sheet bg-surface shadow-lg transition-all duration-300 ${heights[position]}`}
    >
      <button
        type="button"
        aria-label="Cambiar tamaño del panel"
        onClick={cycle}
        onTouchStart={(e) => {
          const startY = e.touches[0]?.clientY ?? 0;
          const onEnd = (ev: TouchEvent) => {
            const endY = ev.changedTouches[0]?.clientY ?? startY;
            const delta = startY - endY;
            const idx = order.indexOf(position);
            if (delta > 40 && idx < order.length - 1) onPositionChange(order[idx + 1]!);
            else if (delta < -40 && idx > 0) onPositionChange(order[idx - 1]!);
            document.removeEventListener('touchend', onEnd);
          };
          document.addEventListener('touchend', onEnd);
        }}
        className="flex w-full items-center justify-center pb-1 pt-3"
      >
        <span aria-hidden className="h-1.5 w-12 rounded-pill bg-pink-200" />
      </button>
      <div className="shrink-0 px-2">{header}</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">{children}</div>
    </div>
  );
}
