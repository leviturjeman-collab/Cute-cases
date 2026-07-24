import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { handleApiError } from '@/server/errors';
import { requireDesignOwner } from '@/server/designService';
import { shareNameSchema } from '@/server/schemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/designs/[id]/share/regenerate (SS13.2, T-21): nuevo shareToken;
 * el anterior deja de resolver. Acepta shareNombre opcional (<= 30).
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
      // body vacio permitido
    }
    const updated = await prisma.design.update({
      where: { id: params.id },
      data: {
        shareToken: randomBytes(20).toString('base64url'),
        ...(shareNombre !== undefined ? { shareNombre } : {}),
      },
    });
    return NextResponse.json({ shareToken: updated.shareToken });
  } catch (e) {
    return handleApiError(e);
  }
}
