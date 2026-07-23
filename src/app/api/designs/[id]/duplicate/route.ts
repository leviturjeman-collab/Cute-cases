import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { handleApiError } from '@/server/errors';
import { requireDesignOwner } from '@/server/designService';
import { generateShareToken } from '@/lib/share';

export const dynamic = 'force-dynamic';

/** POST /api/designs/[id]/duplicate — "Copia de …" (§7.3). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const original = await requireDesignOwner(params.id, user.id);
    const copy = await prisma.design.create({
      data: {
        userId: user.id,
        nombre: `Copia de ${original.nombre}`,
        deviceId: original.deviceId,
        caseVariantId: original.caseVariantId,
        elementos: original.elementos as unknown as object[],
        precioTotalCache: original.precioTotalCache,
        thumbnailUrl: original.thumbnailUrl,
        shareToken: generateShareToken(),
      },
    });
    return NextResponse.json(copy, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
