'use client';

import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, Input } from '@/components/ui';
import { api, ApiClientError } from '@/lib/api-client';

function strength(password: string): 'debil' | 'media' | 'fuerte' {
  if (password.length < 10) return 'debil';
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((r) => r.test(password)).length;
  return kinds >= 3 ? 'fuerte' : 'media';
}

function RegistroForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const level = useMemo(() => (password.length >= 8 ? strength(password) : null), [password]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, nombre: nombre || undefined }),
      });
      const res = await signIn('credentials', { email, password, redirect: false });
      if (!res?.error) {
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t('errorCredenciales'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-sm">
      <h1 className="mb-4 text-center">{t('registroTitulo')}</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input
          label={t('email')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t('password')}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={level ? t(`fortaleza.${level}`) : t('passwordMin')}
          error={error ?? undefined}
        />
        <Input label={t('nombre')} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Button type="submit" loading={loading}>
          {t('registrarse')}
        </Button>
      </form>
      <div className="mt-4 flex flex-col gap-2">
        <Button variant="secondary" onClick={() => void signIn('google', { callbackUrl: next })}>
          {t('conGoogle')}
        </Button>
        <Button variant="secondary" onClick={() => void signIn('apple', { callbackUrl: next })}>
          {t('conApple')}
        </Button>
      </div>
      <p className="mt-4 text-center text-sm">
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-pink-600">
          {t('yaTienesCuenta')}
        </Link>
      </p>
    </Card>
  );
}

export default function RegistroPage() {
  return (
    <>
      <Header />
      <main className="px-4 pt-8">
        <Suspense>
          <RegistroForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
