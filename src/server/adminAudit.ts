import { prisma } from './db';

/** Toda escritura de admin queda auditada: quién, qué, cuándo (§11). */
export async function audit(
  adminId: string,
  accion: 'crear' | 'actualizar' | 'eliminar',
  entidad: string,
  entidadId: string,
): Promise<void> {
  await prisma.adminAudit.create({ data: { adminId, accion, entidad, entidadId } });
}
