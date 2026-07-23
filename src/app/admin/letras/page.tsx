'use client';

import { Suspense } from 'react';
import { ElementosAdmin } from '@/components/admin/ElementosAdmin';

/** Admin · Letras (§11): gestión del juego de letras (elementos categoría "letras"). */
export default function AdminLetrasPage() {
  return (
    <Suspense>
      <ElementosAdmin soloLetras />
    </Suspense>
  );
}
