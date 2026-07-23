'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type ToastKind = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}

/**
 * Toasts de marca (§17): duran 3 s (errores 4 s), descartables,
 * aria-live polite (errores assertive).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    const duration = kind === 'error' ? 4000 : 3000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              role={t.kind === 'error' ? 'alert' : 'status'}
              aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
              className={`pointer-events-auto max-w-sm rounded-toast px-5 py-3 text-sm font-bold shadow-md ${
                t.kind === 'error' ? 'bg-error-bg text-error' : 'bg-surface text-text'
              }`}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {t.message}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
