import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { designPayloadSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { validateAndPriceDesign } from '@/server/designService';
import { generateShareToken } from '@/lib/share';
import { WRITE_LIMIT, rateLimit } from '@/server/rateLimit';

export const dynamic = 'force-dynamic';

/** POST /api/designs — crear diseño con validación completa en server (§12.5). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`design:${user.id}`, WRITE_LIMIT.max, WRITE_LIMIT.windowMs);

    const parsed = designPayloadSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', 'Payload de diseño inválido');

    const validated = await validateAndPriceDesign(parsed.data);

    const count = await prisma.design.count({ where: { userId: user.id } });
    const design = await prisma.design.create({
      data: {
        userId: user.id,
        nombre: parsed.data.nombre ?? `Mi funda #${count + 1}`,
        deviceId: validated.deviceId,
        caseVariantId: validated.caseVariantId,
        elementos: validated.elementos as unknown as object[],
        precioTotalCache: validated.precioTotalCentimos,
        shareToken: generateShareToken(),
      },
    });
    return NextResponse.json(design, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
