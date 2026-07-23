'use client';

import { Suspense } from 'react';
import { ElementosAdmin } from '@/components/admin/ElementosAdmin';

export default function AdminElementosPage() {
  return (
    <Suspense>
      <ElementosAdmin />
    </Suspense>
  );
}
