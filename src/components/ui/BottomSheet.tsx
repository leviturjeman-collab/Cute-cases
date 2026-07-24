'use client';

import type { ReactNode } from 'react';

export type SheetPosition = 'collapsed' | 'half' | 'full';

export interface BottomSheetProps {
  position: SheetPosition;
  onPositionChange: (p: SheetPosition) => void;
  header: ReactNode;
  children: ReactNode;
}

const heights: Record<SheetPosition, string> = {
  collapsed: 'h-[84px]',
  half: 'h-[264px]',
  full: 'h-[70dvh]',
};

// E1 (anexo v4.3): en viewports bajos (landscape) el sheet no puede tragarse
// el area util del visor — alturas acotadas a fracciones del viewport.
export const SHEET_HEIGHTS_PX: Record<SheetPosition, string> = {
  collapsed: 'min(84px, 22dvh)',
  half: 'min(264px, 42dvh)',
  full: '70dvh',
};

const order: SheetPosition[] = ['collapsed', 'half', 'full'];

/**
 * SS4.5: radio superior 20 px, handle 36x4, tres anclas con arrastre y snap;
 * scrim del 30% solo en posicion expandida.
 */
export function BottomSheet({ position, onPositionChange, header, children }: BottomSheetProps) {
  const cycle = () => {
    const idx = order.indexOf(position);
    onPositionChange(order[(idx + 1) % order.length]!);
  };

  return (
    <>
      {position === 'full' && (
        <div
          aria-hidden
          className="fixed inset-0 z-20 bg-text/30"
          onClick={() => onPositionChange('half')}
        />
      )}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-sheet border-t border-border bg-surface shadow-2 transition-[height] duration-300 ease-out ${heights[position]}`}
      >
        <button
          type="button"
          aria-label="Cambiar tamano del panel"
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
          className="flex w-full items-center justify-center pb-1 pt-2.5"
        >
          <span aria-hidden className="h-1 w-9 rounded bg-border" />
        </button>
        <div className="shrink-0 border-b border-border px-3">{header}</div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">{children}</div>
      </div>
    </>
  );
}
