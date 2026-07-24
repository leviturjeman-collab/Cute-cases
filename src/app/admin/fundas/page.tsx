'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AdminButton, AdminTable, Field, inputCls } from '@/components/admin/adminUi';
import { formatCentimos } from '@/lib/pricing';

interface Variant {
  id: string;
  colorNombre: string;
  colorHex: string;
  precioCentimos: number;
  disponible: boolean;
}

interface CaseRow {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  material: string;
  activo: boolean;
  destacada: boolean;
  variantes: Variant[];
  compat: { deviceId: string }[];
}

interface Device {
  id: string;
  nombre: string;
}

interface CaseForm {
  id?: string;
  slug: string;
  nombre: string;
  descripcion: string;
  material: string;
  asset3dUrl: string;
  activo: boolean;
  destacada: boolean;
  deviceIds: string[];
}

const emptyCase: CaseForm = {
  slug: '',
  nombre: '',
  descripcion: '',
  material: 'silicona',
  asset3dUrl: 'procedural://case',
  activo: false,
  destacada: false,
  deviceIds: [],
};

/** Admin · Fundas (§11): CRUD + variantes con precio propio por color. */
export default function AdminFundasPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CaseForm | null>(null);
  const [variantFor, setVariantFor] = useState<string | null>(null);
  const [variant, setVariant] = useState({ colorNombre: '', colorHex: '#FF69B4', precioEuros: 19.9, disponible: true });

  const { data } = useQuery({
    queryKey: ['admin-cases'],
    queryFn: () => api<{ cases: CaseRow[] }>('/api/admin/cases'),
  });
  const { data: devicesData } = useQuery({
    queryKey: ['admin-devices'],
    queryFn: () => api<{ devices: Device[] }>('/api/admin/devices'),
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-cases'] });

  const save = useMutation({
    mutationFn: async (c: CaseForm) => {
      const { id, ...body } = c;
      if (id) await api(`/api/admin/cases/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/api/admin/cases', { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/cases/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const addVariant = useMutation({
    mutationFn: async (caseId: string) =>
      api(`/api/admin/cases/${caseId}/variants`, {
        method: 'POST',
        body: JSON.stringify({
          colorNombre: variant.colorNombre,
          colorHex: variant.colorHex,
          precioCentimos: Math.round(variant.precioEuros * 100),
          disponible: variant.disponible,
        }),
      }),
    onSuccess: () => {
      invalidate();
      setVariantFor(null);
    },
  });
  const toggleVariant = useMutation({
    mutationFn: ({ id, disponible }: { id: string; disponible: boolean }) =>
      api(`/api/admin/variants/${id}`, { method: 'PATCH', body: JSON.stringify({ disponible }) }),
    onSuccess: invalidate,
  });
  const removeVariant = useMutation({
    mutationFn: (id: string) => api(`/api/admin/variants/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const e = editing;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fundas</h1>
        <AdminButton onClick={() => setEditing({ ...emptyCase })}>+ Nueva funda</AdminButton>
      </div>

      {e && (
        <form
          className="mb-6 grid gap-3 rounded-thumb border border-border bg-surface p-4 md:grid-cols-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            save.mutate(e);
          }}
        >
          <Field label="Slug (URL)">
            <input className={inputCls} value={e.slug} onChange={(ev) => setEditing({ ...e, slug: ev.target.value })} />
          </Field>
          <Field label="Nombre">
            <input className={inputCls} value={e.nombre} onChange={(ev) => setEditing({ ...e, nombre: ev.target.value })} />
          </Field>
          <Field label="Material">
            <select className={inputCls} value={e.material} onChange={(ev) => setEditing({ ...e, material: ev.target.value })}>
              <option value="silicona">silicona</option>
              <option value="transparente">transparente</option>
              <option value="rigida">rigida</option>
              <option value="rigida-perlada">rigida-perlada</option>
            </select>
          </Field>
          <Field label="Asset 3D (glTF)">
            <input className={inputCls} value={e.asset3dUrl} onChange={(ev) => setEditing({ ...e, asset3dUrl: ev.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descripción">
              <textarea className={inputCls} rows={2} value={e.descripcion} onChange={(ev) => setEditing({ ...e, descripcion: ev.target.value })} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <p className="mb-1 text-sm font-semibold">Modelos compatibles</p>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {devicesData?.devices.map((d) => (
                <label key={d.id} className="flex items-center gap-1 rounded-control border border-border px-2 py-1 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={e.deviceIds.includes(d.id)}
                    onChange={(ev) =>
                      setEditing({
                        ...e,
                        deviceIds: ev.target.checked
                          ? [...e.deviceIds, d.id]
                          : e.deviceIds.filter((x) => x !== d.id),
                      })
                    }
                  />
                  {d.nombre}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={e.activo} onChange={(ev) => setEditing({ ...e, activo: ev.target.checked })} />
            Activa
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={e.destacada} onChange={(ev) => setEditing({ ...e, destacada: ev.target.checked })} />
            Destacada
          </label>
          <div className="flex gap-2 md:col-span-2">
            <AdminButton type="submit" disabled={save.isPending}>Guardar</AdminButton>
            <AdminButton variant="secondary" onClick={() => setEditing(null)}>Cancelar</AdminButton>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {data?.cases.map((c) => (
          <div key={c.id} className="rounded-thumb border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {c.nombre} <span className="text-xs text-text-soft">/{c.slug}</span>{' '}
                  {c.activo ? 'Sí' : '—'} {c.destacada ? '(destacada)' : ''}
                </p>
                <p className="text-xs text-text-soft">
                  {c.material} · {c.compat.length} modelos compatibles
                </p>
              </div>
              <div className="flex gap-2">
                <AdminButton
                  variant="secondary"
                  onClick={() =>
                    setEditing({
                      id: c.id,
                      slug: c.slug,
                      nombre: c.nombre,
                      descripcion: c.descripcion,
                      material: c.material,
                      asset3dUrl: 'procedural://case',
                      activo: c.activo,
                      destacada: c.destacada,
                      deviceIds: c.compat.map((x) => x.deviceId),
                    })
                  }
                >
                  Editar
                </AdminButton>
                <AdminButton variant="danger" onClick={() => remove.mutate(c.id)}>Eliminar</AdminButton>
              </div>
            </div>
            <AdminTable headers={['Color', 'Hex', 'Precio', 'Disponible', '']}>
              {c.variantes.map((v) => (
                <tr key={v.id} className="border-b border-border">
                  <td className="px-3 py-1.5">{v.colorNombre}</td>
                  <td className="px-3 py-1.5">
                    <span className="inline-block h-4 w-4 rounded-full border align-middle" style={{ backgroundColor: v.colorHex }} />{' '}
                    {v.colorHex}
                  </td>
                  <td className="px-3 py-1.5">{formatCentimos(v.precioCentimos)}</td>
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={v.disponible}
                      onChange={(ev) => toggleVariant.mutate({ id: v.id, disponible: ev.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <AdminButton variant="danger" onClick={() => removeVariant.mutate(v.id)}>×</AdminButton>
                  </td>
                </tr>
              ))}
            </AdminTable>
            {variantFor === c.id ? (
              <form
                className="mt-2 flex flex-wrap items-end gap-2"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  addVariant.mutate(c.id);
                }}
              >
                <Field label="Color">
                  <input className={inputCls} value={variant.colorNombre} onChange={(ev) => setVariant({ ...variant, colorNombre: ev.target.value })} />
                </Field>
                <Field label="Hex">
                  <input type="color" className="h-9 w-14" value={variant.colorHex} onChange={(ev) => setVariant({ ...variant, colorHex: ev.target.value })} />
                </Field>
                <Field label="Precio €">
                  <input type="number" step="0.01" className={inputCls} value={variant.precioEuros} onChange={(ev) => setVariant({ ...variant, precioEuros: Number(ev.target.value) })} />
                </Field>
                <AdminButton type="submit">Añadir</AdminButton>
                <AdminButton variant="secondary" onClick={() => setVariantFor(null)}>Cancelar</AdminButton>
              </form>
            ) : (
              <div className="mt-2">
                <AdminButton variant="secondary" onClick={() => setVariantFor(c.id)}>+ Variante</AdminButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
