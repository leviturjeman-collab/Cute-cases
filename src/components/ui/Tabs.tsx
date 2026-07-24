'use client';

import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  label: string;
}

/** SS4.4: subrayado 2 px pink-500, scrollables con desvanecido, teclado. */
export function Tabs({ tabs, active, onChange, label }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent) => {
    const idx = tabs.findIndex((t) => t.id === active);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(tabs[Math.min(tabs.length - 1, idx + 1)]!.id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(tabs[Math.max(0, idx - 1)]!.id);
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="tabs-fade flex gap-1 overflow-x-auto"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`relative shrink-0 whitespace-nowrap px-3 py-2.5 text-[13px] font-medium transition-colors duration-120 ${
              isActive ? 'text-text' : 'text-text-soft hover:text-text'
            }`}
          >
            {tab.label}
            {isActive && (
              <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-pink-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
