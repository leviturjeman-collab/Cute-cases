import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { designPayloadSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { validateAndPriceDesign } from '@/server/designService';
import { rateLimit, WRITE_LIMIT } from '@/server/rateLimit';

export const dynamic = 'force-dynamic';

/** POST /api/designs (SS13.2): crea con el pipeline SS14.1 completo. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`design:${user.id}`, WRITE_LIMIT.max, WRITE_LIMIT.windowMs);

    const parsed = designPayloadSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', 'Payload de diseno invalido');

    const validated = await validateAndPriceDesign(parsed.data);

    // Nombre por defecto numerado si colisiona (SS7.10)
    let nombre = parsed.data.nombre ?? 'Mi funda';
    if (!parsed.data.nombre) {
      const existing = await prisma.design.findMany({
        where: { userId: user.id, nombre: { startsWith: 'Mi funda' } },
        select: { nombre: true },
      });
      const taken = new Set(existing.map((d) => d.nombre));
      if (taken.has(nombre)) {
        let n = 2;
        while (taken.has(`Mi funda ${n}`)) n++;
        nombre = `Mi funda ${n}`;
      }
    }

    const design = await prisma.design.create({
      data: {
        userId: user.id,
        nombre,
        deviceId: validated.deviceId,
        caseVariantId: validated.caseVariantId,
        elementos: validated.elementos as unknown as object[],
        precioTotalCache: validated.precioTotalCentimos,
        shareToken: randomBytes(20).toString('base64url'),
      },
    });
    return NextResponse.json(design, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
