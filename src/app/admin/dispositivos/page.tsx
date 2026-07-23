'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Polygon } from '@/lib/collision';
import { PolygonEditor } from '@/components/admin/PolygonEditor';
import { AdminButton, AdminTable, Field, inputCls } from '@/components/admin/adminUi';

interface Device {
  id: string;
  nombre: string;
  generacion: string;
  anchoMm: number;
  altoMm: number;
  radioEsquinaMm: number;
  cameraZone: Polygon;
  asset3dUrl: string;
  activo: boolean;
  orden: number;
}

const empty: Omit<Device, 'id'> = {
  nombre: '',
  generacion: '',
  anchoMm: 0,
  altoMm: 0,
  radioEsquinaMm: 9,
  cameraZone: [
    { x: 5, y: 5 },
    { x: 35, y: 5 },
    { x: 35, y: 35 },
    { x: 5, y: 35 },
  ],
  asset3dUrl: 'procedural://case',
  activo: false,
  orden: 0,
};

/** Admin · Dispositivos (§11): CRUD + editor visual de la zona de cámara. */
export default function AdminDispositivosPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Device | (Omit<Device, 'id'> & { id?: string }) | null>(null);

  const { data } = useQuery({
    queryKey: ['admin-devices'],
    queryFn: () => api<{ devices: Device[] }>('/api/admin/devices'),
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-devices'] });

  const save = useMutation({
    mutationFn: async (d: typeof editing) => {
      if (!d) return;
      const { id, ...body } = d as Device;
      if (id) await api(`/api/admin/devices/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/api/admin/devices', { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/devices/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const e = editing;
  const incomplete = e ? !e.nombre || !e.generacion || e.anchoMm <= 0 || e.altoMm <= 0 : true;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Dispositivos</h1>
        <AdminButton onClick={() => setEditing({ ...empty })}>+ Nuevo modelo</AdminButton>
      </div>
      <p className="mb-4 text-xs text-text-soft">
        ⚠️ Las dimensiones y la zona de cámara deben ser medidas reales verificadas. Un modelo sin
        datos completos no puede activarse (§4.1).
      </p>

      {e && (
        <form
          className="mb-6 grid gap-3 rounded-thumb border border-pink-200 bg-white p-4 md:grid-cols-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            save.mutate(e);
          }}
        >
          <Field label="Nombre comercial">
            <input className={inputCls} value={e.nombre} onChange={(ev) => setEditing({ ...e, nombre: ev.target.value })} />
          </Field>
          <Field label="Generación">
            <input className={inputCls} value={e.generacion} onChange={(ev) => setEditing({ ...e, generacion: ev.target.value })} />
          </Field>
          <Field label="Ancho (mm)">
            <input type="number" step="0.1" className={inputCls} value={e.anchoMm} onChange={(ev) => setEditing({ ...e, anchoMm: Number(ev.target.value) })} />
          </Field>
          <Field label="Alto (mm)">
            <input type="number" step="0.1" className={inputCls} value={e.altoMm} onChange={(ev) => setEditing({ ...e, altoMm: Number(ev.target.value) })} />
          </Field>
          <Field label="Radio de esquinas (mm)">
            <input type="number" step="0.1" className={inputCls} value={e.radioEsquinaMm} onChange={(ev) => setEditing({ ...e, radioEsquinaMm: Number(ev.target.value) })} />
          </Field>
          <Field label="Asset 3D del molde">
            <input className={inputCls} value={e.asset3dUrl} onChange={(ev) => setEditing({ ...e, asset3dUrl: ev.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <p className="mb-1 text-sm font-bold">Zona de cámara (mm, sobre el plano trasero)</p>
            <p className="mb-2 text-xs text-text-soft">
              Arrastra los vértices · doble clic añade · clic derecho elimina
            </p>
            {e.anchoMm > 0 && e.altoMm > 0 && (
              <PolygonEditor
                value={e.cameraZone}
                onChange={(cameraZone) => setEditing({ ...e, cameraZone })}
                widthMm={e.anchoMm}
                heightMm={e.altoMm}
              />
            )}
          </div>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={e.activo}
              disabled={incomplete}
              onChange={(ev) => setEditing({ ...e, activo: ev.target.checked })}
            />
            Activo {incomplete && '(completa los datos primero)'}
          </label>
          <div className="flex gap-2 md:col-span-2">
            <AdminButton type="submit" disabled={save.isPending}>Guardar</AdminButton>
            <AdminButton variant="secondary" onClick={() => setEditing(null)}>Cancelar</AdminButton>
          </div>
        </form>
      )}

      <AdminTable headers={['Modelo', 'Gen', 'mm', 'Activo', '']}>
        {data?.devices.map((d) => (
          <tr key={d.id} className="border-b border-pink-50">
            <td className="px-3 py-2 font-bold">{d.nombre}</td>
            <td className="px-3 py-2">{d.generacion}</td>
            <td className="px-3 py-2">
              {d.anchoMm}×{d.altoMm}
            </td>
            <td className="px-3 py-2">{d.activo ? '✅' : '—'}</td>
            <td className="px-3 py-2 text-right">
              <span className="flex justify-end gap-2">
                <AdminButton variant="secondary" onClick={() => setEditing(d)}>Editar</AdminButton>
                <AdminButton variant="danger" onClick={() => remove.mutate(d.id)}>Eliminar</AdminButton>
              </span>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
