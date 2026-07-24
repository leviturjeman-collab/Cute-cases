import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { seasonSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

/** GET — colecciones con vista de "qué caduca y cuándo" (§11). */
export async function GET() {
  try {
    await requireAdmin();
    const seasons = await prisma.seasonCollection.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: { elementos: { select: { id: true, nombre: true, activo: true } } },
    });
    return NextResponse.json({ seasons });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = seasonSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', parsed.error.message);
    const season = await prisma.seasonCollection.create({ data: parsed.data });
    await audit(admin.id, 'create', 'SeasonCollection', season.id);
    return NextResponse.json(season, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
