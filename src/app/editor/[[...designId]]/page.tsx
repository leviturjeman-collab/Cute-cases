'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';

function EditorLoading() {
  const t = useTranslations('editor');
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <p className="animate-pulse font-display text-[15px] font-medium text-pink-700">
        {t('preparando')}
      </p>
    </div>
  );
}

/**
 * Editor 3D (SS5.1): CSR con bundle three.js diferido — solo se descarga al
 * entrar. Sin SSR: requiere WebGL2 (T-14 si no hay soporte).
 */
const Editor = dynamic(() => import('@/editor/Editor').then((m) => m.Editor), {
  ssr: false,
  loading: () => <EditorLoading />,
});

export default function EditorPage({ params }: { params: { designId?: string[] } }) {
  const designId = params.designId?.[0];
  return (
    <Suspense>
      <Editor designId={designId} />
    </Suspense>
  );
}
