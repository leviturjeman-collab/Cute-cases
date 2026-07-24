import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { galleryToggleSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { requireDesignOwner } from '@/server/designService';

export const dynamic = 'force-dynamic';

/** PATCH /api/designs/[id]/gallery (SS13.2): { publicado, autorVisible }. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireDesignOwner(params.id, user.id);
    const parsed = galleryToggleSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', 'Payload invalido');
    const updated = await prisma.design.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.publicado !== undefined ? { publicadoGaleria: parsed.data.publicado } : {}),
        ...(parsed.data.autorVisible !== undefined ? { autorVisible: parsed.data.autorVisible } : {}),
      },
    });
    return NextResponse.json({
      publicado: updated.publicadoGaleria,
      autorVisible: updated.autorVisible,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
