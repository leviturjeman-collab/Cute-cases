import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/server/errors';
import { getSharedDesignPayload } from '@/server/shareService';

export const dynamic = 'force-dynamic';

/** GET /api/d/[shareToken] (SS13.2): lectura publica minima para render. */
export async function GET(_req: Request, { params }: { params: { shareToken: string } }) {
  try {
    const payload = await getSharedDesignPayload(params.shareToken);
    if (!payload) return apiError('NOT_FOUND', 'Diseno no encontrado');
    return NextResponse.json(payload);
  } catch (e) {
    return handleApiError(e);
  }
}
