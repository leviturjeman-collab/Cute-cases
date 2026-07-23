import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { elementSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const parsed = elementSchema.partial().safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', parsed.error.message);
    const element = await prisma.element.update({ where: { id: params.id }, data: parsed.data });
    await audit(admin.id, 'actualizar', 'Element', element.id);
    return NextResponse.json(element);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    await prisma.element.delete({ where: { id: params.id } });
    await audit(admin.id, 'eliminar', 'Element', params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
