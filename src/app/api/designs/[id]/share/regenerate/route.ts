import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { handleApiError } from '@/server/errors';
import { requireDesignOwner } from '@/server/designService';
import { generateShareToken } from '@/lib/share';
import { shareNameSchema } from '@/server/schemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/designs/[id]/share/regenerate — regenera el shareToken
 * (desactiva el enlace anterior, §8.2). Acepta shareNombre opcional.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireDesignOwner(params.id, user.id);
    let shareNombre: string | null | undefined;
    try {
      const body = shareNameSchema.safeParse(await req.json());
      if (body.success) shareNombre = body.data.shareNombre;
    } catch {
      // body vacío permitido
    }
    const updated = await prisma.design.update({
      where: { id: params.id },
      data: {
        shareToken: generateShareToken(),
        ...(shareNombre !== undefined ? { shareNombre } : {}),
      },
    });
    return NextResponse.json({ shareToken: updated.shareToken });
  } catch (e) {
    return handleApiError(e);
  }
}
