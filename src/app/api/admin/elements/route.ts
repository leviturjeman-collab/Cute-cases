import { NextResponse, type NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { elementSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const elements = await prisma.element.findMany({
      orderBy: [{ categoria: 'asc' }, { orden: 'asc' }],
      include: { season: { select: { nombre: true } } },
    });
    return NextResponse.json({ elements });
  } catch (e) {
    return handleApiError(e);
  }
}

/** POST — alta de elemento con hitbox (autogenerada en cliente + ajuste manual, §11). */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = elementSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', parsed.error.message);
    const element = await prisma.element.create({
      data: parsed.data as Prisma.ElementUncheckedCreateInput,
    });
    await audit(admin.id, 'create', 'Element', element.id);
    return NextResponse.json(element, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
