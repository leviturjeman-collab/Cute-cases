import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { reportSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { rateLimit } from '@/server/rateLimit';

export const dynamic = 'force-dynamic';

/** POST — reportar un diseño publicado; marca para revisión en admin (§9). */
export async function POST(req: NextRequest, { params }: { params: { designId: string } }) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'local';
    rateLimit(`report:${ip}`, 10, 15 * 60 * 1000);

    const design = await prisma.design.findUnique({ where: { id: params.designId } });
    if (!design || !design.publicadoGaleria) return apiError('NOT_FOUND', 'Diseño no publicado');

    let motivo: string | undefined;
    try {
      const parsed = reportSchema.safeParse(await req.json());
      if (parsed.success) motivo = parsed.data.motivo;
    } catch {
      // body vacío permitido
    }
    await prisma.report.create({
      data: { designId: params.designId, motivo: motivo ?? null },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
