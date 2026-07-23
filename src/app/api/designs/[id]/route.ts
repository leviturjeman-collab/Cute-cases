import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { designPayloadSchema, renameSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import {
  getDesignAvailability,
  requireDesignOwner,
  validateAndPriceDesign,
} from '@/server/designService';

export const dynamic = 'force-dynamic';

/** GET /api/designs/[id] — cargar un diseño propio para retomarlo en el editor. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const design = await requireDesignOwner(params.id, user.id);
    const availability = await getDesignAvailability(design);
    return NextResponse.json({ ...design, availability });
  } catch (e) {
    return handleApiError(e);
  }
}

/** PUT /api/designs/[id] — actualizar (owner). Last-write-wins (§6.9). */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireDesignOwner(params.id, user.id);

    const body: unknown = await req.json();
    // Renombrado inline (solo nombre)
    const renameOnly = renameSchema.safeParse(body);
    const full = designPayloadSchema.safeParse(body);

    if (!full.success && renameOnly.success) {
      const updated = await prisma.design.update({
        where: { id: params.id },
        data: { nombre: renameOnly.data.nombre },
      });
      return NextResponse.json(updated);
    }
    if (!full.success) return apiError('S-03', 'Payload de diseño inválido');

    const validated = await validateAndPriceDesign(full.data);
    const updated = await prisma.design.update({
      where: { id: params.id },
      data: {
        ...(full.data.nombre ? { nombre: full.data.nombre } : {}),
        deviceId: validated.deviceId,
        caseVariantId: validated.caseVariantId,
        elementos: validated.elementos as unknown as object[],
        precioTotalCache: validated.precioTotalCentimos,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

/** DELETE /api/designs/[id] — eliminar (owner). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireDesignOwner(params.id, user.id);
    await prisma.design.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
