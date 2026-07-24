import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { seasonSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const parsed = seasonSchema.partial().safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', parsed.error.message);
    const season = await prisma.seasonCollection.update({
      where: { id: params.id },
      data: parsed.data,
    });
    await audit(admin.id, 'update', 'SeasonCollection', season.id);
    return NextResponse.json(season);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    await prisma.seasonCollection.delete({ where: { id: params.id } });
    await audit(admin.id, 'delete', 'SeasonCollection', params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
