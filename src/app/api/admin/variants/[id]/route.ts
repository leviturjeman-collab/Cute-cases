import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { variantSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const parsed = variantSchema.partial().safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', parsed.error.message);
    const variant = await prisma.caseVariant.update({
      where: { id: params.id },
      data: parsed.data,
    });
    await audit(admin.id, 'actualizar', 'CaseVariant', variant.id);
    return NextResponse.json(variant);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    await prisma.caseVariant.delete({ where: { id: params.id } });
    await audit(admin.id, 'eliminar', 'CaseVariant', params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
