'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AdminButton, Field, inputCls } from '@/components/admin/adminUi';

interface Settings {
  collisionMarginMm?: number;
  heroClaim?: string;
  gridDefault?: boolean;
}

/** Admin · Ajustes (§11): margen de colisión, textos del hero, cuadrícula. */
export default function AdminAjustesPage() {
  const [form, setForm] = useState<Settings>({});
  const [saved, setSaved] = useState(false);

  const { data } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api<{ settings: Settings }>('/api/admin/settings'),
  });

  useEffect(() => {
    if (data) setForm(data.settings);
  }, [data]);

  const save = useMutation({
    mutationFn: () => api('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(form) }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-semibold">Ajustes</h1>
      <form
        className="flex flex-col gap-4 rounded-thumb border border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Margen de seguridad de colisión (mm)">
          <input
            type="number"
            step="0.1"
            min="0"
            max="5"
            className={inputCls}
            value={form.collisionMarginMm ?? 0.5}
            onChange={(e) => setForm({ ...form, collisionMarginMm: Number(e.target.value) })}
          />
        </Field>
        <Field label="Claim del hero">
          <input
            className={inputCls}
            value={form.heroClaim ?? ''}
            onChange={(e) => setForm({ ...form, heroClaim: e.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.gridDefault ?? false}
            onChange={(e) => setForm({ ...form, gridDefault: e.target.checked })}
          />
          Cuadrícula activada por defecto en el editor
        </label>
        <div className="flex items-center gap-3">
          <AdminButton type="submit" disabled={save.isPending}>Guardar</AdminButton>
          {saved && <span className="text-sm font-semibold text-success">Guardado</span>}
        </div>
      </form>
    </div>
  );
}
