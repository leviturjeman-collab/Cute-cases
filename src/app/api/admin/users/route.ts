import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/** GET — listado y búsqueda de usuarios (soporte, §11). */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = req.nextUrl.searchParams.get('q')?.trim();
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { nombre: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        nombre: true,
        provider: true,
        rol: true,
        activo: true,
        createdAt: true,
        _count: { select: { designs: true } },
      },
    });
    return NextResponse.json({ users });
  } catch (e) {
    return handleApiError(e);
  }
}
