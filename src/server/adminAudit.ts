import { prisma } from './db';

/** Toda mutacion de admin queda auditada con diff (SS12, SS17). */
export async function audit(
  adminId: string,
  accion: 'create' | 'update' | 'delete' | 'toggle',
  entidad: string,
  entidadId: string,
  diff?: unknown,
): Promise<void> {
  await prisma.adminAudit.create({
    data: {
      adminId,
      accion,
      entidad,
      entidadId,
      diff: diff === undefined ? undefined : (diff as object),
    },
  });
}
