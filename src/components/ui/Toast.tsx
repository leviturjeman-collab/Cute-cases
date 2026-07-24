'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastKind = 'info' | 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind, action?: { label: string; onAction: () => void }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

const icons: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 size={20} className="text-success" aria-hidden />,
  error: <AlertTriangle size={20} className="text-error" aria-hidden />,
  warning: <AlertTriangle size={20} className="text-warning" aria-hidden />,
  info: <Info size={20} className="text-pink-500" aria-hidden />,
};

/**
 * SS4.7: max 400 px, inferior centrado en movil / inferior derecha desktop,
 * 3 s informativos, 4 s errores; errores con accion persisten. Cola max 2.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'info', action?: { label: string; onAction: () => void }) => {
      const id = nextId.current++;
      setToasts((prev) => [
        ...prev.slice(-1),
        { id, kind, message, actionLabel: action?.label, onAction: action?.onAction },
      ]);
      if (!(kind === 'error' && action)) {
        const duration = kind === 'error' || kind === 'warning' ? 4000 : 3000;
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
      }
    },
    [],
  );

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 md:items-end md:pr-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
            className="pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-toast border border-border bg-surface px-4 py-3 shadow-2"
          >
            {icons[t.kind]}
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-text">{t.message}</p>
            {t.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
                className="shrink-0 text-[13px] font-medium text-pink-500"
              >
                {t.actionLabel}
              </button>
            )}
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-text-soft transition-colors hover:text-text"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
