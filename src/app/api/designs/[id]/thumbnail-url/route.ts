import { NextResponse } from 'next/server';
import { requireUser } from '@/server/auth';
import { handleApiError } from '@/server/errors';
import { requireDesignOwner } from '@/server/designService';
import { createSignedThumbnailUpload } from '@/server/storage';

export const dynamic = 'force-dynamic';

/**
 * POST /api/designs/[id]/thumbnail-url (SS13.2): URL prefirmada de subida
 * (content-type image/webp, max 300 KB); el cliente sube y confirma despues.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireDesignOwner(params.id, user.id);
    const { uploadUrl, publicUrl } = await createSignedThumbnailUpload(params.id);
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (e) {
    return handleApiError(e);
  }
}
