'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui';

const KEY = 'cc.consent';

/**
 * Consentimiento de cookies (SS5.4, SS19): rechazar es tan facil como
 * aceptar; la analitica solo se activa tras aceptar (SS22).
 */
export function CookieBanner() {
  const t = useTranslations();
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
  };

  if (!visible) return null;
  return (
    <div
      role="dialog"
      aria-label={t('legal.cookies')}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-card border border-border bg-surface p-4 shadow-2"
    >
      <p className="mb-3 text-sm text-text">
        {t('cookies.texto')}{' '}
        <Link href="/legal/cookies" className="text-pink-700 underline">
          {t('legal.cookies')}
        </Link>
      </p>
      <div className="flex gap-2">
        <Button onClick={() => decide(true)}>{t('cookies.aceptar')}</Button>
        <Button variant="secondary" onClick={() => decide(false)}>
          {t('cookies.rechazar')}
        </Button>
      </div>
    </div>
  );
}
