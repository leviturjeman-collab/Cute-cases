'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { Check, Link2, MoreHorizontal, Pencil, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatCentimos } from '@/lib/pricing';
import { relativeTime } from '@/lib/relativeTime';
import { track } from '@/lib/analytics';
import { PageShell } from '@/components/layout/PageShell';
import { ShareSheet } from '@/components/ShareSheet';
import { Badge, Button, EmptyState, Input, Modal, SkeletonGrid, useToast } from '@/components/ui';

interface Diseno {
  id: string;
  nombre: string;
  deviceNombre: string;
  precioTotalCache: number;
  thumbnailUrl: string | null;
  shareToken: string;
  shareNombre: string | null;
  publicadoGaleria: boolean;
  autorVisible: boolean;
  likesCount: number;
  updatedAt: string;
  expiredCount: number;
}

interface Page {
  disenos: Diseno[];
  nextCursor: string | null;
}

/** Mis disenos (SS6.6): grid con rename inline, menu contextual y scroll infinito. */
export default function MisDisenosPage() {
  const t = useTranslations();
  const router = useRouter();
  const { status } = useSession();
  const { showToast } = useToast();

  const [items, setItems] = useState<Diseno[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [deleting, setDeleting] = useState<Diseno | null>(null);
  const [sharing, setSharing] = useState<Diseno | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?next=%2Fmis-disenos');
  }, [status, router]);

  const load = useCallback(async (nextCursor: string | null, replace: boolean) => {
    setLoading(true);
    setError(false);
    try {
      const query = nextCursor ? `?cursor=${nextCursor}` : '';
      const page = await api<Page>(`/api/designs/mine${query}`);
      setItems((prev) => (replace ? page.disenos : [...prev, ...page.disenos]));
      setCursor(page.nextCursor);
    } catch (e) {
      if ((e as { status?: number }).status === 401) return;
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') void load(null, true);
  }, [status, load]);

  // Scroll infinito (paginas de 24, SS6.6)
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !loading) void load(cursor, false);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loading, load]);

  const patch = (id: string, data: Partial<Diseno>) =>
    setItems((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));

  const confirmRename = async () => {
    if (!renaming) return;
    const value = renaming.value.trim();
    if (!value) return setRenaming(null);
    try {
      await api(`/api/designs/${renaming.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre: value }),
      });
      patch(renaming.id, { nombre: value });
    } catch {
      showToast(t('toasts.T15'), 'error');
    } finally {
      setRenaming(null);
    }
  };

  const duplicate = async (d: Diseno) => {
    setMenuFor(null);
    try {
      await api(`/api/designs/${d.id}/duplicate`, { method: 'POST' });
      showToast(t('toasts.T24'), 'success');
      void load(null, true);
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  const togglePublish = async (d: Diseno) => {
    setMenuFor(null);
    try {
      await api(`/api/designs/${d.id}/gallery`, {
        method: 'PATCH',
        body: JSON.stringify({ publicado: !d.publicadoGaleria }),
      });
      patch(d.id, { publicadoGaleria: !d.publicadoGaleria });
      if (!d.publicadoGaleria) track('galeria_publicado');
      showToast(d.publicadoGaleria ? t('toasts.T22') : t('toasts.T04'), 'success');
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  const regenerateLink = async (d: Diseno) => {
    setMenuFor(null);
    try {
      const updated = await api<{ shareToken: string }>(
        `/api/designs/${d.id}/share/regenerate`,
        { method: 'POST', body: JSON.stringify({}) },
      );
      patch(d.id, { shareToken: updated.shareToken });
      showToast(t('toasts.T21'), 'success');
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/api/designs/${deleting.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((d) => d.id !== deleting.id));
    } catch {
      showToast(t('toasts.T15'), 'error');
    } finally {
      setDeleting(null);
    }
  };

  if (status !== 'authenticated') {
    return (
      <PageShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <SkeletonGrid count={8} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-[28px] font-semibold text-text">
          {t('misDisenos.titulo')}
        </h1>

        {error ? (
          <div className="mt-6">
            <EmptyState
              title={t('common.estados.error')}
              action={<Button onClick={() => void load(null, true)}>{t('common.estados.reintentar')}</Button>}
            />
          </div>
        ) : items.length === 0 && !loading ? (
          <div className="mt-6">
            <EmptyState
              title={t('misDisenos.vacioTitulo')}
              action={
                <Link href="/modelo">
                  <Button>{t('misDisenos.vacioCta')}</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {items.map((d) => (
                <div
                  key={d.id}
                  className="group relative overflow-hidden rounded-card border border-border bg-surface shadow-1 transition-shadow duration-200 hover:shadow-2"
                >
                  <Link href={`/editor/${d.id}`} className="block">
                    <div className="relative aspect-[4/5] bg-surface-2">
                      {d.thumbnailUrl ? (
                        <Image
                          src={d.thumbnailUrl}
                          alt={d.nombre}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-contain p-1"
                        />
                      ) : (
                        <div aria-hidden className="flex h-full items-center justify-center">
                          <svg
                            width="44"
                            height="44"
                            viewBox="0 0 48 48"
                            fill="none"
                            stroke="var(--pink-300)"
                            strokeWidth="2"
                            strokeLinecap="round"
                          >
                            <rect x="14" y="4" width="20" height="40" rx="6" />
                            <circle cx="20" cy="11" r="2.5" />
                          </svg>
                        </div>
                      )}
                      {d.expiredCount > 0 && (
                        <div className="absolute left-2 top-2">
                          <Badge variant="noDisponible">{t('common.badges.noDisponible')}</Badge>
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-3">
                    {renaming?.id === d.id ? (
                      <div className="flex items-end gap-1.5">
                        <Input
                          label={t('editor.renombrar')}
                          value={renaming.value}
                          maxLength={40}
                          showCount
                          autoFocus
                          onChange={(e) => setRenaming({ id: d.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void confirmRename();
                            if (e.key === 'Escape') setRenaming(null);
                          }}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          aria-label={t('common.acciones.guardar')}
                          onClick={() => void confirmRename()}
                          className="flex h-9 w-9 items-center justify-center rounded-control text-success hover:bg-surface-2"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={t('common.acciones.cancelar')}
                          onClick={() => setRenaming(null)}
                          className="flex h-9 w-9 items-center justify-center rounded-control text-text-soft hover:bg-surface-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <p className="truncate text-[15px] font-semibold text-text">{d.nombre}</p>
                        <button
                          type="button"
                          aria-label={t('common.acciones.renombrar')}
                          onClick={() => setRenaming({ id: d.id, value: d.nombre })}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-text-soft opacity-0 transition-opacity hover:bg-surface-2 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-text-soft">{d.deviceNombre}</p>
                    <div className="mt-1 flex items-baseline justify-between">
                      <p className="tabular text-sm font-medium text-text">
                        {formatCentimos(d.precioTotalCache)}
                      </p>
                      <p className="text-xs text-text-soft">
                        {t('misDisenos.editadoRelativo', { fecha: relativeTime(d.updatedAt) })}
                      </p>
                    </div>
                  </div>

                  {/* Menu contextual (SS6.6) */}
                  <div className="absolute right-2 top-2">
                    <button
                      type="button"
                      aria-label={t('misDisenos.opciones')}
                      aria-expanded={menuFor === d.id}
                      onClick={() => setMenuFor(menuFor === d.id ? null : d.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-control bg-surface/90 text-text shadow-1 hover:bg-surface"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menuFor === d.id && (
                      <div
                        role="menu"
                        className="absolute right-0 top-9 z-10 w-52 overflow-hidden rounded-card border border-border bg-surface py-1 shadow-2"
                      >
                        <MenuItem onClick={() => router.push(`/editor/${d.id}`)}>
                          {t('common.acciones.abrir')}
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            setMenuFor(null);
                            setRenaming({ id: d.id, value: d.nombre });
                          }}
                        >
                          {t('common.acciones.renombrar')}
                        </MenuItem>
                        <MenuItem onClick={() => void duplicate(d)}>
                          {t('common.acciones.duplicar')}
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            setMenuFor(null);
                            setSharing(d);
                          }}
                        >
                          {t('common.acciones.compartir')}
                        </MenuItem>
                        <MenuItem onClick={() => void togglePublish(d)}>
                          <span className="flex items-center justify-between gap-2">
                            {d.publicadoGaleria
                              ? t('common.acciones.despublicar')
                              : t('misDisenos.publicarGaleria')}
                            {d.publicadoGaleria && <Check size={14} className="text-success" aria-hidden />}
                          </span>
                        </MenuItem>
                        <MenuItem onClick={() => void regenerateLink(d)}>
                          <span className="flex items-center gap-2">
                            <Link2 size={14} aria-hidden />
                            {t('misDisenos.regenerarEnlace')}
                          </span>
                        </MenuItem>
                        <MenuItem
                          destructive
                          onClick={() => {
                            setMenuFor(null);
                            setDeleting(d);
                          }}
                        >
                          {t('common.acciones.eliminar')}
                        </MenuItem>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {loading && (
              <div className="mt-4">
                <SkeletonGrid count={4} />
              </div>
            )}
            <div ref={sentinel} aria-hidden className="h-px" />
          </>
        )}
      </div>

      {/* Eliminar (T-17) */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('toasts.T17', { nombre: deleting?.nombre ?? '' })}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            {t('common.acciones.cancelar')}
          </Button>
          <Button variant="danger" onClick={() => void confirmDelete()}>
            {t('common.acciones.eliminar')}
          </Button>
        </div>
      </Modal>

      {sharing && (
        <ShareSheet
          open
          onClose={() => setSharing(null)}
          designId={sharing.id}
          shareToken={sharing.shareToken}
          nombre={sharing.nombre}
          shareNombre={sharing.shareNombre}
          thumbnailUrl={sharing.thumbnailUrl}
        />
      )}
    </PageShell>
  );
}

function MenuItem({
  children,
  onClick,
  destructive = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full px-3.5 py-2 text-left text-sm transition-colors duration-120 hover:bg-surface-2 ${
        destructive ? 'text-error' : 'text-text'
      }`}
    >
      {children}
    </button>
  );
}
