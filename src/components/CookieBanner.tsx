'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';

const KEY = 'cc_cookies';

/**
 * Banner de cookies (§13): rechazar tan fácil como aceptar; la analítica
 * solo se activa tras consentimiento.
 */
export function CookieBanner() {
  const t = useTranslations('cookies');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(KEY) === null);
    } catch {
      setVisible(false);
    }
  }, []);

  const decide = (accepted: boolean) => {
    try {
      window.localStorage.setItem(KEY, accepted ? 'accepted' : 'rejected');
    } catch {
      // sin almacenamiento: no insistimos
    }
    setVisible(false);
    if (accepted) {
      window.dispatchEvent(new CustomEvent('cc:analytics-consent'));
    }
  };

  if (!visible) return null;
  return (
    <div
      role="dialog"
      aria-label={t('texto')}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-card bg-surface p-4 shadow-lg"
    >
      <p className="mb-3 text-sm">{t('texto')}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => decide(true)}>
          {t('aceptar')}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => decide(false)}>
          {t('rechazar')}
        </Button>
      </div>
    </div>
  );
}
