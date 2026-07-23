import { NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET — log de auditoría de escrituras de admin (§11). */
export async function GET() {
  try {
    await requireAdmin();
    const entries = await prisma.adminAudit.findMany({
      orderBy: { ts: 'desc' },
      take: 200,
    });
    return NextResponse.json({ entries });
  } catch (e) {
    return handleApiError(e);
  }
}
