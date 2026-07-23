'use client';

import type { ReactNode } from 'react';

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

/** Pestañas horizontales scrollables (categorías del editor, galería…). */
export function Tabs({ tabs, active, onChange, label }: TabsProps) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto py-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 whitespace-nowrap rounded-pill px-4 py-2 text-sm font-bold transition-colors duration-150 ${
            active === tab.id
              ? 'bg-pink-600 text-white shadow-sm'
              : 'text-text-soft hover:bg-pink-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
