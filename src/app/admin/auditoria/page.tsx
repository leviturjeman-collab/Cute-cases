'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AdminTable } from '@/components/admin/adminUi';

interface AuditEntry {
  id: string;
  adminId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  ts: string;
}

/** Admin · Auditoría (§11): quién, qué, cuándo de toda escritura de admin. */
export default function AdminAuditoriaPage() {
  const { data } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => api<{ entries: AuditEntry[] }>('/api/admin/audit'),
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Auditoría</h1>
      <AdminTable headers={['Cuándo', 'Admin', 'Acción', 'Entidad', 'ID']}>
        {data?.entries.map((e) => (
          <tr key={e.id} className="border-b border-border">
            <td className="px-3 py-1.5">{new Date(e.ts).toLocaleString('es-ES')}</td>
            <td className="px-3 py-1.5">{e.adminId}</td>
            <td className="px-3 py-1.5">{e.accion}</td>
            <td className="px-3 py-1.5">{e.entidad}</td>
            <td className="px-3 py-1.5 font-mono text-xs">{e.entidadId}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
