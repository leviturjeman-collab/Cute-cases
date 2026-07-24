'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AdminButton, AdminDrawer, AdminTable, Field, inputCls } from '@/components/admin/adminUi';

interface Season {
  id: string;
  slug: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  elementos: { id: string; nombre: string; activo: boolean }[];
}

interface SeasonForm {
  id?: string;
  slug: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

const emptySeason: SeasonForm = {
  slug: '',
  nombre: '',
  fechaInicio: '',
  fechaFin: '',
  activo: true,
};

function diasRestantes(fechaFin: string): number {
  return Math.ceil((new Date(fechaFin).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/** Admin - Temporadas (SS17): CRUD con fechas y panel "que caduca y cuando". */
export default function AdminTemporadasPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SeasonForm | null>(null);

  const { data } = useQuery({
    queryKey: ['admin-seasons'],
    queryFn: () => api<{ seasons: Season[] }>('/api/admin/seasons'),
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-seasons'] });

  const save = useMutation({
    mutationFn: async (s: SeasonForm) => {
      const { id, ...body } = s;
      if (id) await api(`/api/admin/seasons/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/api/admin/seasons', { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/admin/seasons/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const e = editing;
  const now = Date.now();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Temporadas</h1>
        <AdminButton onClick={() => setEditing({ ...emptySeason })}>Nueva coleccion</AdminButton>
      </div>
      <p className="mb-4 text-xs text-text-soft">
        La pestana Temporada aparece en el editor dentro de la ventana de fechas y desaparece fuera
        de ella. Asigna elementos desde la seccion Elementos.
      </p>

      <AdminDrawer
        open={e !== null}
        title={e?.id ? 'Editar coleccion' : 'Nueva coleccion'}
        onClose={() => setEditing(null)}
      >
        {e && (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              save.mutate(e);
            }}
          >
            <Field label="Slug">
              <input className={inputCls} value={e.slug} onChange={(ev) => setEditing({ ...e, slug: ev.target.value })} />
            </Field>
            <Field label="Nombre">
              <input className={inputCls} value={e.nombre} onChange={(ev) => setEditing({ ...e, nombre: ev.target.value })} />
            </Field>
            <Field label="Inicio">
              <input
                type="date"
                className={inputCls}
                value={e.fechaInicio.slice(0, 10)}
                onChange={(ev) => setEditing({ ...e, fechaInicio: ev.target.value })}
              />
            </Field>
            <Field label="Fin">
              <input
                type="date"
                className={inputCls}
                value={e.fechaFin.slice(0, 10)}
                onChange={(ev) => setEditing({ ...e, fechaFin: ev.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={e.activo} onChange={(ev) => setEditing({ ...e, activo: ev.target.checked })} />
              Activa
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

      <AdminTable headers={['Coleccion', 'Ventana', 'Estado', 'Elementos (que caduca)', '']}>
        {data?.seasons.map((s) => {
          const inicio = new Date(s.fechaInicio).getTime();
          const fin = new Date(s.fechaFin).getTime();
          const enVentana = s.activo && inicio <= now && now <= fin;
          const dias = diasRestantes(s.fechaFin);
          return (
            <tr key={s.id} className="border-b border-border">
              <td className="px-3 py-2 font-semibold">
                {s.nombre}
                <span className="ml-1 text-xs font-normal text-text-soft">/{s.slug}</span>
              </td>
              <td className="tabular px-3 py-2 text-xs">
                {new Date(s.fechaInicio).toLocaleDateString('es-ES')} -{' '}
                {new Date(s.fechaFin).toLocaleDateString('es-ES')}
              </td>
              <td className="px-3 py-2">
                {enVentana
                  ? dias >= 0
                    ? `Activa (caduca en ${dias} dias)`
                    : 'Activa'
                  : now < inicio
                    ? 'Programada'
                    : 'Caducada'}
              </td>
              <td className="px-3 py-2 text-xs">
                {s.elementos.length === 0
                  ? '-'
                  : s.elementos.map((el) => el.nombre).join(', ')}
              </td>
              <td className="px-3 py-2 text-right">
                <span className="flex justify-end gap-2">
                  <AdminButton
                    variant="secondary"
                    onClick={() =>
                      setEditing({
                        id: s.id,
                        slug: s.slug,
                        nombre: s.nombre,
                        fechaInicio: s.fechaInicio,
                        fechaFin: s.fechaFin,
                        activo: s.activo,
                      })
                    }
                  >
                    Editar
                  </AdminButton>
                  <AdminButton variant="danger" onClick={() => remove.mutate(s.id)}>
                    Eliminar
                  </AdminButton>
                </span>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
