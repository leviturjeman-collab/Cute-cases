'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageShell } from '@/components/layout/PageShell';
import { Button, Input } from '@/components/ui';

/**
 * Recuperar contrasena (SS15.2): respuesta neutra — no revela si la cuenta
 * existe. El envio real de email se conecta en fase 2.
 */
export default function RecuperarPage() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <PageShell>
      <div className="mx-auto max-w-sm px-4 py-10">
        <h1 className="font-display text-[28px] font-semibold text-text">
          {t('auth.recuperarTitulo')}
        </h1>

        {sent ? (
          <p className="mt-6 rounded-card border border-border bg-surface p-4 text-sm text-text">
            {t('auth.recuperarEnviado')}
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="mt-6 space-y-4"
          >
            <p className="text-sm text-text-soft">{t('auth.recuperarTexto')}</p>
            <Input
              label={t('auth.email')}
              type="email"
              value={email}
              autoComplete="email"
              required
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" size="lg" className="w-full">
              {t('common.acciones.enviar')}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-pink-700 hover:underline">
            {t('auth.yaTienesCuenta')}
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
