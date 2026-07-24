'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Image as ImageIcon, Share2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button, Input, Modal, useToast } from '@/components/ui';
import { composeShareImage, shareOrDownload } from '@/editor/shareImage';
import { track } from '@/lib/analytics';

export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  designId: string;
  shareToken: string;
  nombre: string;
  shareNombre: string | null;
  thumbnailUrl: string | null;
}

/**
 * Sheet de compartir (SS16.2): "Imagen para redes" y "Enlace de regalo" con
 * campo opcional "Tu nombre" (<=30), botones Copiar y Compartir.
 */
export function ShareSheet({
  open,
  onClose,
  designId,
  shareToken,
  nombre,
  shareNombre,
  thumbnailUrl,
}: ShareSheetProps) {
  const t = useTranslations();
  const { showToast } = useToast();
  const [senderName, setSenderName] = useState(shareNombre ?? '');
  const [savedName, setSavedName] = useState(shareNombre ?? '');
  const [busyImage, setBusyImage] = useState(false);

  const giftUrl = () =>
    `${window.location.origin}/d/${shareToken}`;

  const persistName = async () => {
    const value = senderName.trim();
    if (value === savedName) return;
    try {
      await api(`/api/designs/${designId}`, {
        method: 'PUT',
        body: JSON.stringify({ shareNombre: value || null }),
      });
      setSavedName(value);
    } catch {
      // el enlace funciona igualmente sin nombre
    }
  };

  const copyLink = async () => {
    await persistName();
    try {
      await navigator.clipboard.writeText(giftUrl());
      showToast(t('toasts.T03'), 'success');
      track('compartido', { tipo: 'regalo' });
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  const shareLink = async () => {
    await persistName();
    try {
      if (navigator.share) {
        await navigator.share({ title: t('regalo.ogTitulo'), url: giftUrl() });
        track('compartido', { tipo: 'regalo' });
      } else {
        await copyLink();
      }
    } catch {
      // cancelado por el usuario
    }
  };

  const shareImage = async () => {
    if (!thumbnailUrl) return;
    setBusyImage(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('thumbnail'));
        img.src = thumbnailUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      const blob = await composeShareImage(canvas, nombre);
      await shareOrDownload(blob, `${nombre}.webp`);
      track('compartido', { tipo: 'imagen' });
    } catch {
      showToast(t('toasts.T15'), 'error');
    } finally {
      setBusyImage(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('common.acciones.compartir')}>
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[15px] font-semibold text-text">
            <ImageIcon size={16} aria-hidden className="text-pink-700" />
            {t('regalo.compartirImagen')}
          </h3>
          <Button
            variant="secondary"
            onClick={shareImage}
            loading={busyImage}
            disabled={!thumbnailUrl}
          >
            {t('common.acciones.compartir')}
          </Button>
        </section>

        <section className="border-t border-border pt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[15px] font-semibold text-text">
            <Share2 size={16} aria-hidden className="text-pink-700" />
            {t('regalo.compartirEnlace')}
          </h3>
          <Input
            label={t('regalo.tuNombre')}
            value={senderName}
            maxLength={30}
            showCount
            onChange={(e) => setSenderName(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" icon={<Copy aria-hidden />} onClick={copyLink}>
              {t('common.acciones.copiar')}
            </Button>
            <Button icon={<Share2 aria-hidden />} onClick={shareLink}>
              {t('common.acciones.compartir')}
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
