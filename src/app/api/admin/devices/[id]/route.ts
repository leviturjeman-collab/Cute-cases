import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { deviceSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const parsed = deviceSchema.partial().safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', parsed.error.message);
    const device = await prisma.deviceModel.update({ where: { id: params.id }, data: parsed.data });
    await audit(admin.id, 'update', 'DeviceModel', device.id);
    return NextResponse.json(device);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    await prisma.deviceModel.delete({ where: { id: params.id } });
    await audit(admin.id, 'delete', 'DeviceModel', params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
