'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, Input } from '@/components/ui';

function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(t('errorCredenciales'));
    } else {
      router.push(next);
      router.refresh();
    }
  };

  return (
    <Card className="mx-auto max-w-sm">
      <h1 className="mb-4 text-center">{t('loginTitulo')}</h1>
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" loading={loading}>
          {t('entrar')}
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
        <Link href={`/registro?next=${encodeURIComponent(next)}`} className="font-bold text-pink-600">
          {t('noTienesCuenta')}
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="px-4 pt-8">
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
