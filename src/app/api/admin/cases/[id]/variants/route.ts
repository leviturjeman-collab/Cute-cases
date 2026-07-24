import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { variantSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

/** POST — alta de variante de color con precio propio (§4.2, §11). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin();
    const parsed = variantSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', parsed.error.message);
    const variant = await prisma.caseVariant.create({
      data: { ...parsed.data, caseBaseId: params.id },
    });
    await audit(admin.id, 'create', 'CaseVariant', variant.id);
    return NextResponse.json(variant, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
