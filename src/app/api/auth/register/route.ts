import { NextResponse, type NextRequest } from 'next/server';
import { hash } from '@node-rs/argon2';
import { prisma } from '@/server/db';
import { registerSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { AUTH_LIMIT, rateLimit } from '@/server/rateLimit';

/** Registro por email (§7.1): email, contraseña ≥8, nombre opcional. */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'local';
    rateLimit(`register:${ip}`, AUTH_LIMIT.max, AUTH_LIMIT.windowMs);

    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', 'Datos de registro inválidos');
    const { email, password, nombre } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return apiError('S-03', 'Ese email ya tiene cuenta');

    const passwordHash = await hash(password); // argon2id (§13)
    const user = await prisma.user.create({
      data: { email, nombre: nombre ?? null, provider: 'credentials', passwordHash },
    });
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
