'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api-client';
import { track } from '@/lib/analytics';
import { PageShell } from '@/components/layout/PageShell';
import { Button, Input } from '@/components/ui';

function strength(password: string): 0 | 1 | 2 {
  if (password.length < 10) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  return classes >= 3 ? 2 : 1;
}

function RegistroContent() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const next = params.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nivel = useMemo(() => strength(password), [password]);
  const nivelLabel =
    password.length >= 8
      ? [t('auth.fortaleza.debil'), t('auth.fortaleza.media'), t('auth.fortaleza.fuerte')][nivel]
      : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, nombre: nombre.trim() || undefined }),
      });
      track('registro_completado', { metodo: 'credentials' });
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.ok) {
        await api('/api/cart/merge', { method: 'POST' }).catch(() => undefined);
        await queryClient.invalidateQueries({ queryKey: ['cart'] });
        router.push(next);
        router.refresh();
        return;
      }
      router.push('/login');
    } catch (err) {
      setError(
        err instanceof ApiClientError && err.code === 'VALIDATION'
          ? t('auth.emailInvalido')
          : t('auth.emailEnUso'),
      );
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="font-display text-[28px] font-semibold text-text">
        {t('auth.registroTitulo')}
      </h1>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label={t('auth.email')}
          type="email"
          value={email}
          autoComplete="email"
          required
          error={error ?? undefined}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t('auth.password')}
          type="password"
          value={password}
          autoComplete="new-password"
          required
          minLength={8}
          hint={nivelLabel ?? t('auth.passwordMin')}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label={t('auth.nombre')}
          value={nombre}
          maxLength={60}
          autoComplete="name"
          onChange={(e) => setNombre(e.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {t('auth.registrarse')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link
          href={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-pink-700 hover:underline"
        >
          {t('auth.yaTienesCuenta')}
        </Link>
      </p>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <PageShell>
      <Suspense>
        <RegistroContent />
      </Suspense>
    </PageShell>
  );
}
