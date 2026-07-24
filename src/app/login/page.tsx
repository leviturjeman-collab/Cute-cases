'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getProviders, signIn } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { PageShell } from '@/components/layout/PageShell';
import { Button, Input } from '@/components/ui';

function LoginContent() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const next = params.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauth, setOauth] = useState<{ google: boolean; apple: boolean }>({
    google: false,
    apple: false,
  });

  useEffect(() => {
    void getProviders().then((p) => {
      setOauth({ google: !!p?.google, apple: !!p?.apple });
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn('credentials', { email, password, redirect: false });
    if (res?.ok) {
      // Merge de cesta invitado -> usuario (SS13.4, SS6.9)
      await api('/api/cart/merge', { method: 'POST' }).catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      router.push(next);
      router.refresh();
    } else {
      setError(t('auth.errorCredenciales'));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="font-display text-[28px] font-semibold text-text">{t('auth.loginTitulo')}</h1>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label={t('auth.email')}
          type="email"
          value={email}
          autoComplete="email"
          required
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t('auth.password')}
          type="password"
          value={password}
          autoComplete="current-password"
          required
          error={error ?? undefined}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {t('auth.entrar')}
        </Button>
      </form>

      {(oauth.google || oauth.apple) && (
        <div className="mt-4 space-y-2">
          {oauth.google && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => void signIn('google', { callbackUrl: next })}
            >
              {t('auth.conGoogle')}
            </Button>
          )}
          {oauth.apple && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => void signIn('apple', { callbackUrl: next })}
            >
              {t('auth.conApple')}
            </Button>
          )}
        </div>
      )}

      <div className="mt-6 space-y-2 text-center text-sm">
        <p>
          <Link href="/recuperar" className="text-pink-700 hover:underline">
            {t('auth.olvidada')}
          </Link>
        </p>
        <p>
          <Link
            href={`/registro${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-pink-700 hover:underline"
          >
            {t('auth.noTienesCuenta')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PageShell>
      <Suspense>
        <LoginContent />
      </Suspense>
    </PageShell>
  );
}
