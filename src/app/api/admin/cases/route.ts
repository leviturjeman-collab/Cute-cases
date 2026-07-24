import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { caseSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const cases = await prisma.caseBase.findMany({
      include: { variantes: true, compat: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json({ cases });
  } catch (e) {
    return handleApiError(e);
  }
}

/** POST — alta de funda con modelos compatibles (multi-select §11). */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = caseSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', parsed.error.message);
    const { deviceIds, ...data } = parsed.data;
    const caseBase = await prisma.caseBase.create({
      data: {
        ...data,
        compat: { create: deviceIds.map((deviceId) => ({ deviceId })) },
      },
    });
    await audit(admin.id, 'create', 'CaseBase', caseBase.id);
    return NextResponse.json(caseBase, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
