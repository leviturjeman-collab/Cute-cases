'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

/**
 * Editor 3D (§6): lazy-load con code-splitting del bundle three.js — solo se
 * descarga al entrar (§14). Sin SSR: requiere WebGL2.
 */
const Editor = dynamic(() => import('@/editor/Editor').then((m) => m.Editor), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="animate-pulse font-display text-lg text-pink-600">Cargando el editor ✨</p>
    </div>
  ),
});

export default function EditorPage({ params }: { params: { designId?: string[] } }) {
  const designId = params.designId?.[0];
  return (
    <Suspense>
      <Editor designId={designId} />
    </Suspense>
  );
}
