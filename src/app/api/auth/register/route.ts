import { NextResponse, type NextRequest } from 'next/server';
import { hash } from '@node-rs/argon2';
import { prisma } from '@/server/db';
import { registerSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { rateLimit } from '@/server/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Registro por email (SS15.2): registro 5 por IP/hora (SS15.3).
 * Respuestas genericas: no se revela si la cuenta existe.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'local';
    rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);

    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', 'Datos de registro invalidos');
    const { email, password, nombre } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Generica (SS15.3): mismo codigo que validacion
      return apiError('VALIDATION', 'No se pudo completar el registro');
    }

    const passwordHash = await hash(password); // argon2id (SS19)
    const user = await prisma.user.create({
      data: { email, nombre: nombre ?? null, provider: 'credentials', passwordHash },
    });
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
