import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { caseSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const parsed = caseSchema.partial().safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', parsed.error.message);
    const { deviceIds, ...data } = parsed.data;
    const caseBase = await prisma.caseBase.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(deviceIds
          ? {
              compat: {
                deleteMany: {},
                create: deviceIds.map((deviceId) => ({ deviceId })),
              },
            }
          : {}),
      },
    });
    await audit(admin.id, 'update', 'CaseBase', caseBase.id);
    return NextResponse.json(caseBase);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    await prisma.caseBase.delete({ where: { id: params.id } });
    await audit(admin.id, 'delete', 'CaseBase', params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
