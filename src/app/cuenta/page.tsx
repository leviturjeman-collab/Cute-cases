'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { signOut, useSession } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button, Card, Modal, Skeleton, useToast } from '@/components/ui';
import { api } from '@/lib/api-client';
import { forgetDevice } from '@/lib/deviceStorage';

interface AccountData {
  email: string;
  nombre: string | null;
  provider: string;
  device: { id: string; nombre: string } | null;
  emailVerificado: boolean;
}

/** Ajustes de cuenta (§7.4): datos, mi iPhone, logout, eliminar cuenta. */
export default function CuentaPage() {
  const t = useTranslations();
  const router = useRouter();
  const { status } = useSession();
  const { showToast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data } = useQuery({
    queryKey: ['account'],
    queryFn: () => api<AccountData>('/api/account'),
    enabled: status === 'authenticated',
  });

  if (status === 'unauthenticated') {
    router.replace('/login?next=/cuenta');
    return null;
  }

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api('/api/account', { method: 'DELETE' });
      forgetDevice();
      await signOut({ callbackUrl: '/' });
    } catch {
      showToast(t('toasts.E15'), 'error');
      setDeleting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 pt-6">
        <h1 className="mb-4">{t('cuenta.titulo')}</h1>
        {!data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="flex flex-col gap-4">
            {!data.emailVerificado && (
              <p className="rounded-thumb bg-pink-200 px-4 py-3 text-sm font-bold">
                {t('cuenta.verificaEmail')}
              </p>
            )}
            <Card>
              <p className="font-bold">{data.nombre ?? '—'}</p>
              <p className="text-sm text-text-soft">{data.email}</p>
              <p className="mt-1 text-xs text-text-soft">
                {t('cuenta.metodoLogin')}: {data.provider}
              </p>
            </Card>
            <Card className="flex items-center justify-between">
              <div>
                <p className="font-bold">{t('cuenta.miIphone')}</p>
                <p className="text-sm text-text-soft">{data.device?.nombre ?? '—'}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => router.push('/modelo')}>
                {t('common.acciones.cambiar')}
              </Button>
            </Card>
            <Button variant="secondary" onClick={() => void signOut({ callbackUrl: '/' })}>
              {t('cuenta.cerrarSesion')}
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              {t('cuenta.eliminarCuenta')}
            </Button>
          </div>
        )}
      </main>

      {/* Eliminación self-service — derecho de supresión (§13) */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title={t('cuenta.eliminarCuenta')}>
        <p className="mb-4 text-sm text-text-soft">{t('cuenta.eliminarAviso')}</p>
        <div className="flex gap-2">
          <Button variant="danger" loading={deleting} onClick={() => void deleteAccount()}>
            {t('cuenta.eliminarConfirma')}
          </Button>
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            {t('common.acciones.cancelar')}
          </Button>
        </div>
      </Modal>
      <Footer />
    </>
  );
}
