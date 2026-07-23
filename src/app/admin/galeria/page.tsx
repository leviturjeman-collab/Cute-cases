'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AdminButton, AdminTable } from '@/components/admin/adminUi';

interface Report {
  id: string;
  motivo: string | null;
  createdAt: string;
  design: { id: string; nombre: string; thumbnailUrl: string | null; publicadoGaleria: boolean };
}

interface Published {
  id: string;
  nombre: string;
  thumbnailUrl: string | null;
  likesCount: number;
  user: { email: string } | null;
}

/** Admin · Galería (§11): cola de reportes + ocultar/restaurar publicados. */
export default function AdminGaleriaPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin-gallery'],
    queryFn: () => api<{ reports: Report[]; published: Published[] }>('/api/admin/gallery'),
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-gallery'] });

  const moderate = useMutation({
    mutationFn: (body: { designId: string; accion: 'ocultar' | 'restaurar'; reportId?: string }) =>
      api('/api/admin/gallery', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Galería · Moderación</h1>

      <h2 className="mb-2 font-bold">Reportes pendientes ({data?.reports.length ?? 0})</h2>
      <AdminTable headers={['Diseño', 'Motivo', 'Fecha', '']}>
        {data?.reports.map((r) => (
          <tr key={r.id} className="border-b border-pink-50">
            <td className="px-3 py-2 font-bold">{r.design.nombre}</td>
            <td className="px-3 py-2">{r.motivo ?? '—'}</td>
            <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString('es-ES')}</td>
            <td className="px-3 py-2 text-right">
              <span className="flex justify-end gap-2">
                <AdminButton
                  variant="danger"
                  onClick={() => moderate.mutate({ designId: r.design.id, accion: 'ocultar', reportId: r.id })}
                >
                  Ocultar
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  onClick={() => moderate.mutate({ designId: r.design.id, accion: 'restaurar', reportId: r.id })}
                >
                  Todo bien
                </AdminButton>
              </span>
            </td>
          </tr>
        ))}
      </AdminTable>

      <h2 className="mb-2 mt-8 font-bold">Publicados</h2>
      <AdminTable headers={['Diseño', 'Autor', '❤️', '']}>
        {data?.published.map((d) => (
          <tr key={d.id} className="border-b border-pink-50">
            <td className="px-3 py-2 font-bold">{d.nombre}</td>
            <td className="px-3 py-2">{d.user?.email ?? '—'}</td>
            <td className="px-3 py-2">{d.likesCount}</td>
            <td className="px-3 py-2 text-right">
              <AdminButton variant="danger" onClick={() => moderate.mutate({ designId: d.id, accion: 'ocultar' })}>
                Ocultar
              </AdminButton>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
