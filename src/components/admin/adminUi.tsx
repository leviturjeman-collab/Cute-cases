'use client';

import type { ReactNode } from 'react';

/** Primitivas sobrias del panel admin (§11). */

export function AdminTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-thumb border border-pink-200 bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-pink-100 bg-pink-50 text-left">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-bold">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'rounded-thumb border border-pink-200 bg-white px-3 py-2 text-sm focus:border-pink-500';

export function AdminButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const cls =
    variant === 'primary'
      ? 'bg-pink-600 text-white'
      : variant === 'danger'
        ? 'bg-error text-white'
        : 'border border-pink-300 bg-white text-pink-700';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-pill px-4 py-1.5 text-sm font-bold disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}
