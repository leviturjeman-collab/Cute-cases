'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AdminButton, AdminTable, Field, inputCls } from '@/components/admin/adminUi';

interface Season {
  id: string;
  nombre: string;
  emoji: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  elementos: { id: string; nombre: string; activo: boolean }[];
}

interface SeasonForm {
  id?: string;
  nombre: string;
  emoji: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

const emptySeason: SeasonForm = {
  nombre: '',
  emoji: '🎄',
  fechaInicio: '',
  fechaFin: '',
  activo: true,
};

/** Admin · Temporadas (§11): CRUD + vista de "qué caduca y cuándo". */
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
        <h1 className="text-xl font-bold">Temporadas</h1>
        <AdminButton onClick={() => setEditing({ ...emptySeason })}>+ Nueva colección</AdminButton>
      </div>
      <p className="mb-4 text-xs text-text-soft">
        La pestaña Temporada aparece en el editor automáticamente dentro de la ventana de fechas y
        desaparece fuera de ella (§4.5). Asigna elementos desde la sección Elementos.
      </p>

      {e && (
        <form
          className="mb-6 grid gap-3 rounded-thumb border border-pink-200 bg-white p-4 md:grid-cols-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            save.mutate(e);
          }}
        >
          <Field label="Nombre">
            <input className={inputCls} value={e.nombre} onChange={(ev) => setEditing({ ...e, nombre: ev.target.value })} />
          </Field>
          <Field label="Emoji">
            <input className={inputCls} maxLength={4} value={e.emoji} onChange={(ev) => setEditing({ ...e, emoji: ev.target.value })} />
          </Field>
          <Field label="Fecha inicio">
            <input type="date" className={inputCls} value={e.fechaInicio.slice(0, 10)} onChange={(ev) => setEditing({ ...e, fechaInicio: ev.target.value })} />
          </Field>
          <Field label="Fecha fin">
            <input type="date" className={inputCls} value={e.fechaFin.slice(0, 10)} onChange={(ev) => setEditing({ ...e, fechaFin: ev.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={e.activo} onChange={(ev) => setEditing({ ...e, activo: ev.target.checked })} />
            Activa
          </label>
          <div className="flex gap-2 md:col-span-2">
            <AdminButton type="submit" disabled={save.isPending}>Guardar</AdminButton>
            <AdminButton variant="secondary" onClick={() => setEditing(null)}>Cancelar</AdminButton>
          </div>
        </form>
      )}

      <AdminTable headers={['Colección', 'Ventana', 'Estado', 'Elementos', '']}>
        {data?.seasons.map((s) => {
          const start = new Date(s.fechaInicio).getTime();
          const end = new Date(s.fechaFin).getTime();
          const estado = !s.activo
            ? 'Desactivada'
            : now < start
              ? 'Programada'
              : now > end
                ? `Caducó el ${new Date(s.fechaFin).toLocaleDateString('es-ES')}`
                : `Activa · caduca el ${new Date(s.fechaFin).toLocaleDateString('es-ES')}`;
          return (
            <tr key={s.id} className="border-b border-pink-50">
              <td className="px-3 py-2 font-bold">
                {s.emoji} {s.nombre}
              </td>
              <td className="px-3 py-2">
                {new Date(s.fechaInicio).toLocaleDateString('es-ES')} →{' '}
                {new Date(s.fechaFin).toLocaleDateString('es-ES')}
              </td>
              <td className="px-3 py-2">{estado}</td>
              <td className="px-3 py-2">{s.elementos.length}</td>
              <td className="px-3 py-2 text-right">
                <span className="flex justify-end gap-2">
                  <AdminButton
                    variant="secondary"
                    onClick={() =>
                      setEditing({
                        id: s.id,
                        nombre: s.nombre,
                        emoji: s.emoji,
                        fechaInicio: s.fechaInicio,
                        fechaFin: s.fechaFin,
                        activo: s.activo,
                      })
                    }
                  >
                    Editar
                  </AdminButton>
                  <AdminButton variant="danger" onClick={() => remove.mutate(s.id)}>Eliminar</AdminButton>
                </span>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
