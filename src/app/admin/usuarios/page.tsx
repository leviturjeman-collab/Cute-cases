'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AdminButton, AdminTable, inputCls } from '@/components/admin/adminUi';

interface AdminUser {
  id: string;
  email: string;
  nombre: string | null;
  provider: string;
  rol: string;
  activo: boolean;
  createdAt: string;
  _count: { designs: number };
}

interface UserDetail {
  user: { id: string; email: string };
  designs: { id: string; nombre: string; precioTotalCache: number; publicadoGaleria: boolean; updatedAt: string }[];
}

/** Admin · Usuarios (§11): búsqueda, diseños de un usuario, desactivar cuenta. */
export default function AdminUsuariosPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['admin-users', q],
    queryFn: () => api<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`),
  });
  const { data: detail } = useQuery({
    queryKey: ['admin-user', detailId],
    queryFn: () => api<UserDetail>(`/api/admin/users/${detailId}`),
    enabled: Boolean(detailId),
  });

  const toggle = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ activo }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Usuarios</h1>
      <input
        className={`${inputCls} mb-4 w-full max-w-sm`}
        placeholder="Buscar por email o nombre…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <AdminTable headers={['Email', 'Nombre', 'Proveedor', 'Rol', 'Diseños', 'Activo', '']}>
        {data?.users.map((u) => (
          <tr key={u.id} className="border-b border-pink-50">
            <td className="px-3 py-2 font-bold">{u.email}</td>
            <td className="px-3 py-2">{u.nombre ?? '—'}</td>
            <td className="px-3 py-2">{u.provider}</td>
            <td className="px-3 py-2">{u.rol}</td>
            <td className="px-3 py-2">{u._count.designs}</td>
            <td className="px-3 py-2">
              <input
                type="checkbox"
                checked={u.activo}
                onChange={(e) => toggle.mutate({ id: u.id, activo: e.target.checked })}
              />
            </td>
            <td className="px-3 py-2 text-right">
              <AdminButton variant="secondary" onClick={() => setDetailId(detailId === u.id ? null : u.id)}>
                Diseños
              </AdminButton>
            </td>
          </tr>
        ))}
      </AdminTable>

      {detailId && detail && (
        <div className="mt-6">
          <h2 className="mb-2 font-bold">Diseños de {detail.user.email}</h2>
          <AdminTable headers={['Nombre', 'Precio', 'Galería', 'Actualizado']}>
            {detail.designs.map((d) => (
              <tr key={d.id} className="border-b border-pink-50">
                <td className="px-3 py-2">{d.nombre}</td>
                <td className="px-3 py-2">{(d.precioTotalCache / 100).toFixed(2)} €</td>
                <td className="px-3 py-2">{d.publicadoGaleria ? '✅' : '—'}</td>
                <td className="px-3 py-2">{new Date(d.updatedAt).toLocaleDateString('es-ES')}</td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}
    </div>
  );
}
