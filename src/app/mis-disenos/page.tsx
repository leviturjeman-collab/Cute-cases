'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Copy, Pencil, Share2, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Badge, Button, Card, EmptyState, Modal, SkeletonGrid, useToast } from '@/components/ui';
import { api } from '@/lib/api-client';
import { formatCentimos } from '@/lib/pricing';

interface MyDesign {
  id: string;
  nombre: string;
  deviceNombre: string;
  precioTotalCache: number;
  thumbnailUrl: string | null;
  shareToken: string;
  publicadoGaleria: boolean;
  likesCount: number;
  updatedAt: string;
  necesitaCambio: boolean;
}

/** Mis diseños (§7.3): sin límite, renombrar/duplicar/eliminar/compartir/galería. */
export default function MisDisenosPage() {
  const t = useTranslations();
  const router = useRouter();
  const { status } = useSession();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<MyDesign | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-designs'],
    queryFn: () => api<{ disenos: MyDesign[] }>('/api/designs/mine'),
    enabled: status === 'authenticated',
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['my-designs'] });

  const duplicate = useMutation({
    mutationFn: (id: string) => api(`/api/designs/${id}/duplicate`, { method: 'POST' }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/designs/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const rename = useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      api(`/api/designs/${id}`, { method: 'PUT', body: JSON.stringify({ nombre }) }),
    onSuccess: invalidate,
  });
  const toggleGallery = useMutation({
    mutationFn: ({ id, publicadoGaleria }: { id: string; publicadoGaleria: boolean }) =>
      api(`/api/designs/${id}/gallery`, {
        method: 'PATCH',
        body: JSON.stringify({ publicadoGaleria }),
      }),
    onSuccess: (_, vars) => {
      if (vars.publicadoGaleria) showToast(t('toasts.E04'), 'success');
      invalidate();
    },
  });

  const share = async (d: MyDesign) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/d/${d.shareToken}`);
      showToast(t('toasts.E03'), 'success');
    } catch {
      showToast(t('toasts.E15'), 'error');
    }
  };

  if (status === 'unauthenticated') {
    router.replace('/login?next=/mis-disenos');
    return null;
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 pt-6">
        <h1 className="mb-4">{t('misDisenos.titulo')}</h1>
        {isLoading && <SkeletonGrid />}
        {data && data.disenos.length === 0 && (
          <EmptyState
            emoji="🎨"
            title={t('misDisenos.vacioTitulo')}
            action={
              <Button onClick={() => router.push('/modelo')}>{t('misDisenos.vacioCta')}</Button>
            }
          />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {data?.disenos.map((d) => (
            <Card key={d.id}>
              <Link href={`/editor/${d.id}`}>
                <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-thumb bg-pink-100">
                  {d.thumbnailUrl ? (
                    <img src={d.thumbnailUrl} alt={d.nombre} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-5xl">💖</span>
                  )}
                </div>
              </Link>
              {renamingId === d.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    rename.mutate({ id: d.id, nombre: renameValue });
                    setRenamingId(null);
                  }}
                >
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => setRenamingId(null)}
                    maxLength={60}
                    className="w-full rounded-pill border-2 border-pink-300 px-3 py-1 font-bold"
                  />
                </form>
              ) : (
                <p className="truncate font-bold">{d.nombre}</p>
              )}
              <p className="text-xs text-text-soft">{d.deviceNombre}</p>
              <p className="font-display text-sm font-semibold text-pink-600">
                {formatCentimos(d.precioTotalCache)}
              </p>
              {d.necesitaCambio && (
                <Badge variant="aviso" className="mt-1">
                  {t('misDisenos.necesitaCambio')}
                </Badge>
              )}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex">
                  <button
                    type="button"
                    aria-label={t('common.acciones.renombrar')}
                    onClick={() => {
                      setRenamingId(d.id);
                      setRenameValue(d.nombre);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-pill text-pink-700 hover:bg-pink-100"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={t('common.acciones.duplicar')}
                    onClick={() => duplicate.mutate(d.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-pill text-pink-700 hover:bg-pink-100"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={t('common.acciones.compartir')}
                    onClick={() => void share(d)}
                    className="flex h-10 w-10 items-center justify-center rounded-pill text-pink-700 hover:bg-pink-100"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={t('common.acciones.eliminar')}
                    onClick={() => setDeleting(d)}
                    className="ml-2 flex h-10 w-10 items-center justify-center rounded-pill text-error hover:bg-error-bg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <label className="mt-2 flex items-center justify-between rounded-thumb bg-pink-50 px-3 py-2 text-sm font-bold">
                {t('misDisenos.publicarGaleria')}
                <input
                  type="checkbox"
                  checked={d.publicadoGaleria}
                  onChange={(e) => toggleGallery.mutate({ id: d.id, publicadoGaleria: e.target.checked })}
                  className="h-5 w-5 accent-pink-600"
                />
              </label>
            </Card>
          ))}
        </div>
      </main>

      {/* Confirmación de eliminación (E-17) */}
      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={deleting ? t('toasts.E17', { nombre: deleting.nombre }) : ''}
      >
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={() => {
              if (deleting) remove.mutate(deleting.id);
              setDeleting(null);
            }}
          >
            {t('common.acciones.eliminar')}
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            {t('common.acciones.cancelar')}
          </Button>
        </div>
      </Modal>
      <Footer />
    </>
  );
}
