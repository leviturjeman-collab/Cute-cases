'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api-client';
import { AdminButton, AdminTable, Field, inputCls } from '@/components/admin/adminUi';
import { formatCentimos } from '@/lib/pricing';

interface Preset {
  id: string;
  slug: string;
  nombre: string;
  precioCentimos: number;
  publicado: boolean;
  orden: number;
  designData: unknown;
}

/**
 * Admin · Preestablecidos (§11): validaciones idénticas al editor de usuario
 * (el POST reejecuta colisiones en server), precio cerrado, orden del carrusel.
 */
export default function AdminPreestablecidosPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{
    slug: string;
    nombre: string;
    precioEuros: number;
    designDataJson: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['admin-presets'],
    queryFn: () => api<{ presets: Preset[] }>('/api/admin/presets'),
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-presets'] });

  const create = useMutation({
    mutationFn: async () => {
      if (!form) return;
      let designData: unknown;
      designData = JSON.parse(form.designDataJson);
      await api('/api/admin/presets', {
        method: 'POST',
        body: JSON.stringify({
          slug: form.slug,
          nombre: form.nombre,
          precioCentimos: Math.round(form.precioEuros * 100),
          designData,
          fotos: [],
          publicado: false,
          orden: (data?.presets.length ?? 0),
        }),
      });
    },
    onSuccess: () => {
      invalidate();
      setForm(null);
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiClientError ? `${e.code}: ${e.message}` : 'Error'),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      api(`/api/admin/presets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/presets/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      api('/api/admin/presets', { method: 'PATCH', body: JSON.stringify({ ids }) }),
    onSuccess: invalidate,
  });

  const move = (idx: number, dir: -1 | 1) => {
    const list = [...(data?.presets ?? [])];
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[idx]!;
    list[idx] = list[target]!;
    list[target] = a;
    reorder.mutate(list.map((p) => p.id));
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Preestablecidos</h1>
        <AdminButton
          onClick={() =>
            setForm({
              slug: '',
              nombre: '',
              precioEuros: 29.9,
              designDataJson: JSON.stringify(
                { caseSlug: 'silicona-soft', caseVariantId: '', elementos: [] },
                null,
                2,
              ),
            })
          }
        >
          + Nuevo
        </AdminButton>
      </div>
      <p className="mb-4 text-xs text-text-soft">
        El designData usa la misma estructura que un diseño de usuario y pasa las MISMAS
        validaciones de colisión en el servidor. El precio es cerrado (§4.6).
      </p>

      {form && (
        <form
          className="mb-6 grid gap-3 rounded-thumb border border-border bg-surface p-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Slug">
              <input className={inputCls} value={form.slug} onChange={(ev) => setForm({ ...form, slug: ev.target.value })} />
            </Field>
            <Field label="Nombre">
              <input className={inputCls} value={form.nombre} onChange={(ev) => setForm({ ...form, nombre: ev.target.value })} />
            </Field>
            <Field label="Precio cerrado €">
              <input type="number" step="0.01" className={inputCls} value={form.precioEuros} onChange={(ev) => setForm({ ...form, precioEuros: Number(ev.target.value) })} />
            </Field>
          </div>
          <Field label="designData (JSON: caseSlug, caseVariantId, elementos[])">
            <textarea
              className={`${inputCls} font-mono`}
              rows={8}
              value={form.designDataJson}
              onChange={(ev) => setForm({ ...form, designDataJson: ev.target.value })}
            />
          </Field>
          {error && <p className="text-sm font-semibold text-error">{error}</p>}
          <div className="flex gap-2">
            <AdminButton type="submit" disabled={create.isPending}>Crear (valida colisiones)</AdminButton>
            <AdminButton variant="secondary" onClick={() => setForm(null)}>Cancelar</AdminButton>
          </div>
        </form>
      )}

      <AdminTable headers={['Orden', 'Nombre', 'Precio', 'Publicado', '']}>
        {data?.presets.map((p, idx) => (
          <tr key={p.id} className="border-b border-border">
            <td className="px-3 py-2">
              <span className="flex items-center gap-1">
                {p.orden}
                <button type="button" aria-label="Subir" className="px-1" onClick={() => move(idx, -1)}>↑</button>
                <button type="button" aria-label="Bajar" className="px-1" onClick={() => move(idx, 1)}>↓</button>
              </span>
            </td>
            <td className="px-3 py-2 font-semibold">
              {p.nombre} <span className="text-xs text-text-soft">/{p.slug}</span>
            </td>
            <td className="px-3 py-2">{formatCentimos(p.precioCentimos)}</td>
            <td className="px-3 py-2">
              <input
                type="checkbox"
                checked={p.publicado}
                onChange={(ev) => patch.mutate({ id: p.id, body: { publicado: ev.target.checked } })}
              />
            </td>
            <td className="px-3 py-2 text-right">
              <AdminButton variant="danger" onClick={() => remove.mutate(p.id)}>Eliminar</AdminButton>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
