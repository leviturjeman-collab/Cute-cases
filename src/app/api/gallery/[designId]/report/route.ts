import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { reportSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { rateLimit } from '@/server/rateLimit';

export const dynamic = 'force-dynamic';

/** POST report (SS13.3): publico, rate-limited; motivo opcional <= 200. */
export async function POST(req: NextRequest, { params }: { params: { designId: string } }) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'local';
    rateLimit(`report:${ip}`, 10, 15 * 60 * 1000);

    const design = await prisma.design.findUnique({ where: { id: params.designId } });
    if (!design || !design.publicadoGaleria) return apiError('NOT_FOUND', 'Diseno no publicado');

    let motivo: string | undefined;
    try {
      const parsed = reportSchema.safeParse(await req.json());
      if (parsed.success) motivo = parsed.data.motivo;
    } catch {
      // body vacio permitido
    }
    await prisma.report.create({ data: { designId: params.designId, motivo: motivo ?? null } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
