import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { settingsSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

/** GET/PATCH ajustes (SS17): fila singleton Settings (SS12). */
export async function GET() {
  try {
    await requireAdmin();
    const settings =
      (await prisma.settings.findUnique({ where: { id: 1 } })) ??
      (await prisma.settings.create({ data: { id: 1 } }));
    return NextResponse.json({ settings });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = settingsSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', parsed.error.message);
    const before = await prisma.settings.findUnique({ where: { id: 1 } });
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, ...parsed.data },
      update: parsed.data,
    });
    await audit(admin.id, 'update', 'Settings', '1', { before, after: settings });
    return NextResponse.json({ settings });
  } catch (e) {
    return handleApiError(e);
  }
}
