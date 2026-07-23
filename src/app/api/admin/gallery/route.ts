import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET — cola de reportes + diseños publicados (§11 Galería). */
export async function GET() {
  try {
    await requireAdmin();
    const reports = await prisma.report.findMany({
      where: { estado: 'pendiente' },
      orderBy: { createdAt: 'desc' },
      include: {
        design: {
          select: { id: true, nombre: true, thumbnailUrl: true, publicadoGaleria: true },
        },
      },
    });
    const published = await prisma.design.findMany({
      where: { publicadoGaleria: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        nombre: true,
        thumbnailUrl: true,
        likesCount: true,
        user: { select: { email: true } },
      },
    });
    return NextResponse.json({ reports, published });
  } catch (e) {
    return handleApiError(e);
  }
}

const moderateSchema = z.object({
  designId: z.string(),
  accion: z.enum(['ocultar', 'restaurar']),
  reportId: z.string().optional(),
});

/** POST — ocultar/restaurar un diseño publicado y cerrar el reporte (§9, §11). */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = moderateSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', 'Payload inválido');
    const { designId, accion, reportId } = parsed.data;

    await prisma.design.update({
      where: { id: designId },
      data: { publicadoGaleria: accion === 'restaurar' },
    });
    if (reportId) {
      await prisma.report.update({
        where: { id: reportId },
        data: { estado: accion === 'ocultar' ? 'oculto' : 'revisado' },
      });
    }
    await audit(admin.id, 'actualizar', 'Design(galeria)', designId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
