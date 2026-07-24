'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Polygon } from '@/lib/collision';
import { PolygonEditor } from '@/components/admin/PolygonEditor';
import { AdminButton, AdminDrawer, AdminTable, Field, inputCls } from '@/components/admin/adminUi';

interface Device {
  id: string;
  slug: string;
  nombre: string;
  generacion: string;
  anchoMm: number;
  altoMm: number;
  radioEsquinaMm: number;
  grosorMm: number;
  cameraZone: Polygon;
  moduloForma: string;
  asset3dUrl: string | null;
  activo: boolean;
}

type DeviceForm = Omit<Device, 'id'> & { id?: string };

const MODULOS = [
  'cuadrado-diagonal',
  'cuadrado-triple',
  'barra-horizontal',
  'vertical',
  'vertical-doble',
  'camara-unica-vertical',
];

const empty: DeviceForm = {
  slug: '',
  nombre: '',
  generacion: '',
  anchoMm: 0,
  altoMm: 0,
  radioEsquinaMm: 11,
  grosorMm: 2.5,
  cameraZone: [
    { x: 4, y: 4 },
    { x: 40, y: 4 },
    { x: 40, y: 40 },
    { x: 4, y: 40 },
  ],
  moduloForma: 'cuadrado-triple',
  asset3dUrl: null,
  activo: false,
};

/** Admin - Dispositivos (SS17): CRUD + editor visual de la zona de camara. */
export default function AdminDispositivosPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<DeviceForm | null>(null);

  const { data } = useQuery({
    queryKey: ['admin-devices'],
    queryFn: () => api<{ devices: Device[] }>('/api/admin/devices'),
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-devices'] });

  const save = useMutation({
    mutationFn: async (d: DeviceForm) => {
      const { id, ...body } = d;
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
  const incomplete = e
    ? !e.slug || !e.nombre || !e.generacion || e.anchoMm <= 0 || e.altoMm <= 0 || e.cameraZone.length < 3
    : true;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dispositivos</h1>
        <AdminButton onClick={() => setEditing({ ...empty })}>Nuevo modelo</AdminButton>
      </div>
      <p className="mb-4 text-xs text-text-soft">
        Las dimensiones y la zona de camara deben ser medidas reales verificadas. Un modelo sin
        datos completos no puede activarse (SS17).
      </p>

      <AdminDrawer open={e !== null} title={e?.id ? 'Editar modelo' : 'Nuevo modelo'} onClose={() => setEditing(null)}>
        {e && (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              save.mutate(e);
            }}
          >
            <Field label="Slug (URL)">
              <input className={inputCls} value={e.slug} onChange={(ev) => setEditing({ ...e, slug: ev.target.value })} />
            </Field>
            <Field label="Nombre comercial">
              <input className={inputCls} value={e.nombre} onChange={(ev) => setEditing({ ...e, nombre: ev.target.value })} />
            </Field>
            <Field label="Generacion">
              <input className={inputCls} value={e.generacion} onChange={(ev) => setEditing({ ...e, generacion: ev.target.value })} />
            </Field>
            <Field label="Forma del modulo de camara">
              <select
                className={inputCls}
                value={e.moduloForma}
                onChange={(ev) => setEditing({ ...e, moduloForma: ev.target.value })}
              >
                {MODULOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
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
            <Field label="Grosor del telefono (mm)">
              <input type="number" step="0.1" className={inputCls} value={e.grosorMm} onChange={(ev) => setEditing({ ...e, grosorMm: Number(ev.target.value) })} />
            </Field>
            <Field label="Asset 3D (GLB, vacio = parametrico)">
              <input
                className={inputCls}
                value={e.asset3dUrl ?? ''}
                onChange={(ev) => setEditing({ ...e, asset3dUrl: ev.target.value || null })}
              />
            </Field>
            <div className="md:col-span-2">
              <p className="mb-1 text-sm font-medium">Zona de camara (mm, esquina superior izquierda)</p>
              <p className="mb-2 text-xs text-text-soft">
                Arrastra los vertices - doble clic anade - clic derecho elimina
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
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={e.activo}
                disabled={incomplete}
                onChange={(ev) => setEditing({ ...e, activo: ev.target.checked })}
              />
              Activo {incomplete && '(completa los datos primero)'}
            </label>
            <div className="flex gap-2 md:col-span-2">
              <AdminButton type="submit" disabled={save.isPending}>
                Guardar
              </AdminButton>
              <AdminButton variant="secondary" onClick={() => setEditing(null)}>
                Cancelar
              </AdminButton>
            </div>
          </form>
        )}
      </AdminDrawer>

      <AdminTable headers={['Modelo', 'Gen', 'mm', 'Modulo', 'Activo', '']}>
        {data?.devices.map((d) => (
          <tr key={d.id} className="border-b border-border">
            <td className="px-3 py-2 font-semibold">{d.nombre}</td>
            <td className="px-3 py-2">{d.generacion}</td>
            <td className="tabular px-3 py-2">
              {d.anchoMm}x{d.altoMm}
            </td>
            <td className="px-3 py-2 text-xs">{d.moduloForma}</td>
            <td className="px-3 py-2">{d.activo ? 'Si' : '-'}</td>
            <td className="px-3 py-2 text-right">
              <span className="flex justify-end gap-2">
                <AdminButton variant="secondary" onClick={() => setEditing({ ...d })}>
                  Editar
                </AdminButton>
                <AdminButton variant="danger" onClick={() => remove.mutate(d.id)}>
                  Eliminar
                </AdminButton>
              </span>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
