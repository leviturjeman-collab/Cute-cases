import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { galleryToggleSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { requireDesignOwner } from '@/server/designService';

export const dynamic = 'force-dynamic';

/** PATCH /api/designs/[id]/gallery — opt-in/out de galería y autorVisible (§9). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireDesignOwner(params.id, user.id);
    const parsed = galleryToggleSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', 'Payload inválido');
    const updated = await prisma.design.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
