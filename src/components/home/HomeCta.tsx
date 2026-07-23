'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { getRememberedDevice } from '@/lib/deviceStorage';

/**
 * CTA gigante de la home (§5.2): destino /modelo, o directamente /fundas si
 * ya hay modelo recordado (mostrando el chip del modelo).
 */
export function HomeCta({ label }: { label: string }) {
  const router = useRouter();
  const [deviceName, setDeviceName] = useState<string | null>(null);

  useEffect(() => {
    setDeviceName(getRememberedDevice()?.nombre ?? null);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        size="lg"
        className="text-xl shadow-lg"
        onClick={() => router.push(deviceName ? '/fundas' : '/modelo')}
      >
        {label}
      </Button>
      {deviceName && (
        <span className="rounded-pill bg-white/25 px-3 py-1 text-sm font-bold text-white">
          {deviceName} 💖
        </span>
      )}
    </div>
  );
}
