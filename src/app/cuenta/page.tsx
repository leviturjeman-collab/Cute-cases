'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut, useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { forgetDevice, rememberDevice } from '@/lib/deviceStorage';
import { PageShell } from '@/components/layout/PageShell';
import { Button, Input, Modal, Skeleton, useToast } from '@/components/ui';

interface Me {
  email: string;
  nombre: string | null;
  provider: string;
  emailVerificado: boolean;
  device: { id: string; nombre: string } | null;
  autorVisible: boolean;
}

/** Cuenta (SS6.7): perfil, dispositivo, privacidad, sesion y zona de peligro. */
export default function CuentaPage() {
  const t = useTranslations();
  const router = useRouter();
  const { status } = useSession();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [nombre, setNombre] = useState('');
  const [autorVisible, setAutorVisible] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteWord, setDeleteWord] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?next=%2Fcuenta');
  }, [status, router]);

  const { data: me, isPending } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<Me>('/api/me'),
    enabled: status === 'authenticated',
  });

  useEffect(() => {
    if (me) {
      setNombre(me.nombre ?? '');
      setAutorVisible(me.autorVisible);
      if (me.device) rememberDevice(me.device);
    }
  }, [me]);

  const saveNombre = async () => {
    try {
      await api('/api/me', { method: 'PATCH', body: JSON.stringify({ nombre: nombre.trim() || null }) });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      showToast(t('toasts.T01'), 'success');
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  const toggleAutor = async () => {
    const next = !autorVisible;
    setAutorVisible(next);
    try {
      await api('/api/me', { method: 'PATCH', body: JSON.stringify({ autorVisible: next }) });
    } catch {
      setAutorVisible(!next);
      showToast(t('toasts.T15'), 'error');
    }
  };

  const deleteAccount = async () => {
    setDeleteBusy(true);
    try {
      await api('/api/me', { method: 'DELETE' });
      forgetDevice();
      showToast(t('toasts.T23'), 'success');
      await signOut({ callbackUrl: '/' });
    } catch {
      showToast(t('toasts.T15'), 'error');
      setDeleteBusy(false);
    }
  };

  if (status !== 'authenticated' || isPending || !me) {
    return (
      <PageShell>
        <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-[28px] font-semibold text-text">{t('cuenta.titulo')}</h1>

        {/* Perfil */}
        <section className="mt-6 rounded-card border border-border bg-surface p-4">
          <h2 className="font-display text-[15px] font-semibold text-text">{t('cuenta.perfil')}</h2>
          <div className="mt-3 space-y-3">
            <Input
              label={t('auth.nombre')}
              value={nombre}
              maxLength={60}
              placeholder={t('cuenta.nombrePlaceholder')}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => void saveNombre()}
            />
            <div>
              <p className="text-[13px] font-medium text-text">{t('auth.email')}</p>
              <p className="mt-1 text-[15px] text-text-soft">{me.email}</p>
            </div>
            <div>
              <p className="text-[13px] font-medium text-text">{t('cuenta.metodoAcceso')}</p>
              <p className="mt-1 text-[15px] text-text-soft">
                {me.provider === 'credentials' ? t('cuenta.accesoEmail') : me.provider}
              </p>
            </div>
          </div>
        </section>

        {/* Mi dispositivo */}
        <section className="mt-4 rounded-card border border-border bg-surface p-4">
          <h2 className="font-display text-[15px] font-semibold text-text">
            {t('cuenta.miDispositivo')}
          </h2>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[15px] text-text-soft">
              {me.device?.nombre ?? t('cuenta.sinDispositivo')}
            </p>
            <Button variant="secondary" onClick={() => router.push('/modelo?volver=%2Fcuenta')}>
              {t('common.acciones.cambiar')}
            </Button>
          </div>
        </section>

        {/* Privacidad */}
        <section className="mt-4 rounded-card border border-border bg-surface p-4">
          <h2 className="font-display text-[15px] font-semibold text-text">
            {t('cuenta.privacidad')}
          </h2>
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
            <span className="text-[15px] text-text">{t('cuenta.autorVisible')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={autorVisible}
              onClick={() => void toggleAutor()}
              className={`relative h-6 w-11 rounded-badge transition-colors duration-120 ${
                autorVisible ? 'bg-pink-700' : 'bg-border'
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-0.5 h-5 w-5 rounded-badge bg-white shadow-1 transition-all duration-120 ${
                  autorVisible ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>
          <p className="mt-2 text-sm text-text-soft">{t('galeria.anonimo')}</p>
        </section>

        {/* Sesion */}
        <section className="mt-4 rounded-card border border-border bg-surface p-4">
          <h2 className="font-display text-[15px] font-semibold text-text">{t('cuenta.sesion')}</h2>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => void signOut({ callbackUrl: '/' })}
          >
            {t('cuenta.cerrarSesion')}
          </Button>
        </section>

        {/* Zona de peligro */}
        <section className="mt-4 rounded-card border border-error/40 bg-surface p-4">
          <h2 className="font-display text-[15px] font-semibold text-error">
            {t('cuenta.zonaPeligro')}
          </h2>
          <p className="mt-2 text-sm text-text-soft">{t('cuenta.eliminarAviso')}</p>
          <Button variant="danger" className="mt-3" onClick={() => setDeleteOpen(true)}>
            {t('cuenta.eliminarCuenta')}
          </Button>
        </section>
      </div>

      {/* Confirmacion con escritura de ELIMINAR (SS6.7) */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title={t('cuenta.eliminarCuenta')}>
        <div className="space-y-4">
          <p className="text-sm text-text-soft">{t('cuenta.eliminarAviso')}</p>
          <Input
            label={t('cuenta.eliminarEscribe')}
            value={deleteWord}
            onChange={(e) => setDeleteWord(e.target.value)}
            autoComplete="off"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              {t('common.acciones.cancelar')}
            </Button>
            <Button
              variant="danger"
              disabled={deleteWord.trim().toUpperCase() !== 'ELIMINAR'}
              loading={deleteBusy}
              onClick={() => void deleteAccount()}
            >
              {t('common.acciones.eliminar')}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
