'use client';

import type { ReactNode } from 'react';

/** Primitivas sobrias del panel admin (SS17): sin rosa dominante. */

export function AdminTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-thumb border border-border bg-surface">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left">
            {headers.map((h, i) => (
              <th key={`${h}-${i}`} className="px-3 py-2 font-semibold text-text">
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

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-text">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'h-10 rounded-control border border-border bg-surface px-3 text-sm text-text outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/25';

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
      ? 'bg-pink-700 text-white hover:bg-pink-800'
      : variant === 'danger'
        ? 'bg-error text-white hover:opacity-90'
        : 'border border-border bg-surface text-text hover:bg-surface-2';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-control px-4 py-1.5 text-sm font-medium transition-colors duration-120 disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

/** Drawer lateral (SS17): formulario junto a la tabla. */
export function AdminDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-hidden type="button" className="flex-1 bg-black/25" onClick={onClose} tabIndex={-1} />
      <div
        role="dialog"
        aria-label={title}
        className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface p-5 shadow-2"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
          <AdminButton variant="secondary" onClick={onClose}>
            Cerrar
          </AdminButton>
        </div>
        {children}
      </div>
    </div>
  );
}
