import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { settingsSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

/** GET — ajustes globales (§11): margen de colisión, textos hero, cuadrícula. */
export async function GET() {
  try {
    await requireAdmin();
    const settings = await prisma.appSetting.findMany();
    const map: Record<string, unknown> = {};
    for (const s of settings) map[s.key] = s.value;
    return NextResponse.json({ settings: map });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = settingsSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', parsed.error.message);
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === undefined) continue;
      const jsonValue = value as string | number | boolean;
      await prisma.appSetting.upsert({
        where: { key },
        create: { key, value: jsonValue },
        update: { value: jsonValue },
      });
      await audit(admin.id, 'actualizar', 'AppSetting', key);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
