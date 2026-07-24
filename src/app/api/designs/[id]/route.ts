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

/** GET /api/designs/[id]: diseno propio con disponibilidad (editor). */
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

/**
 * PUT /api/designs/[id] (SS13.2): actualiza con la misma validacion.
 * Concurrencia: updatedAt recibido < servidor -> 409 DESIGN_CONFLICT (T-19).
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await requireDesignOwner(params.id, user.id);

    const body: unknown = await req.json();
    const renameOnly = renameSchema.safeParse(body);
    const full = designPayloadSchema.safeParse(body);

    if (
      !full.success &&
      renameOnly.success &&
      (renameOnly.data.nombre !== undefined || renameOnly.data.shareNombre !== undefined)
    ) {
      const updated = await prisma.design.update({
        where: { id: params.id },
        data: {
          ...(renameOnly.data.nombre !== undefined ? { nombre: renameOnly.data.nombre } : {}),
          ...(renameOnly.data.shareNombre !== undefined
            ? { shareNombre: renameOnly.data.shareNombre }
            : {}),
        },
      });
      return NextResponse.json(updated);
    }
    if (!full.success) return apiError('VALIDATION', 'Payload de diseno invalido');

    if (full.data.updatedAt) {
      const clientTime = new Date(full.data.updatedAt).getTime();
      if (clientTime < existing.updatedAt.getTime()) {
        return apiError('DESIGN_CONFLICT', 'Version del servidor mas reciente', {
          updatedAt: existing.updatedAt.toISOString(),
        });
      }
    }

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

/** DELETE /api/designs/[id]: dueno. */
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
