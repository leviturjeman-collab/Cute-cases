import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { thumbnailConfirmSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { requireDesignOwner } from '@/server/designService';
import { verifyThumbnail } from '@/server/storage';

export const dynamic = 'force-dynamic';

/**
 * POST /api/designs/[id]/thumbnail-confirm (SS13.2): verificacion de magic
 * bytes (SS19) y fijado de thumbnailUrl.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireDesignOwner(params.id, user.id);
    const parsedBody: unknown = await req.json();
    const parsed = thumbnailConfirmSchema.safeParse(parsedBody);
    // En dev el publicUrl es relativo; aceptamos tambien ese caso
    const publicUrl = parsed.success
      ? parsed.data.publicUrl
      : typeof (parsedBody as { publicUrl?: string })?.publicUrl === 'string' &&
          (parsedBody as { publicUrl: string }).publicUrl.startsWith('/uploads/')
        ? (parsedBody as { publicUrl: string }).publicUrl
        : null;
    if (!publicUrl) return apiError('VALIDATION', 'publicUrl invalido');
    if (!publicUrl.includes(`${params.id}.webp`)) {
      return apiError('VALIDATION', 'publicUrl no corresponde al diseno');
    }
    const ok = await verifyThumbnail(publicUrl);
    if (!ok) return apiError('VALIDATION', 'La miniatura no es un WebP valido');
    await prisma.design.update({ where: { id: params.id }, data: { thumbnailUrl: publicUrl } });
    return NextResponse.json({ thumbnailUrl: publicUrl });
  } catch (e) {
    return handleApiError(e);
  }
}
