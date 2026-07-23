import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/server/db';
import { requireAdmin } from '@/server/auth';
import { audit } from '@/server/adminAudit';
import { apiError, handleApiError } from '@/server/errors';
import { deviceSchema } from '@/server/adminSchemas';

export const dynamic = 'force-dynamic';

/** GET — todos los modelos (incluidos inactivos) para el admin (§11). */
export async function GET() {
  try {
    await requireAdmin();
    const devices = await prisma.deviceModel.findMany({
      orderBy: [{ generacion: 'desc' }, { orden: 'asc' }],
    });
    return NextResponse.json({ devices });
  } catch (e) {
    return handleApiError(e);
  }
}

/** POST — alta de modelo. Un modelo sin datos completos no puede activarse (§11). */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const parsed = deviceSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', parsed.error.message);
    const device = await prisma.deviceModel.create({ data: parsed.data });
    await audit(admin.id, 'crear', 'DeviceModel', device.id);
    return NextResponse.json(device, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
