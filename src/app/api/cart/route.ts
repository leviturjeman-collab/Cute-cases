import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { cartAddSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { getDesignAvailability, recomputeDesignPrice } from '@/server/designService';
import { compatibleDeviceIdsForPreset } from '@/server/presetService';

export const dynamic = 'force-dynamic';

const GUEST_COOKIE = 'cc.cart.session';

async function getOwnerKey(): Promise<{ ownerKey: string; setCookie?: string }> {
  const user = await getSessionUser();
  if (user) return { ownerKey: user.id };
  const existing = cookies().get(GUEST_COOKIE)?.value;
  if (existing) return { ownerKey: `guest:${existing}` };
  const id = randomBytes(16).toString('base64url');
  return { ownerKey: `guest:${id}`, setCookie: id };
}

function withGuestCookie(res: NextResponse, setCookie?: string): NextResponse {
  if (setCookie) {
    res.cookies.set(GUEST_COOKIE, setCookie, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 90,
      path: '/',
    });
  }
  return res;
}

/**
 * GET /api/cart (SS13.4, SS6.9): items con valido + motivo; el precio se
 * recalcula en cada lectura y los cambios se senalan (T-20).
 */
export async function GET() {
  try {
    const { ownerKey, setCookie } = await getOwnerKey();
    const items = await prisma.cartItem.findMany({
      where: { ownerKey },
      orderBy: { createdAt: 'asc' },
    });

    let priceChanged = false;
    const detailed = await Promise.all(
      items.map(async (item) => {
        if (item.designId) {
          const design = await prisma.design.findUnique({
            where: { id: item.designId },
            include: {
              device: { select: { nombre: true } },
              caseVariant: { include: { caseBase: true } },
            },
          });
          if (!design) return null;
          const availability = await getDesignAvailability(design);
          const fresh = await recomputeDesignPrice(design);
          const precio = fresh ?? design.precioTotalCache;
          if (fresh !== null && fresh !== design.precioTotalCache) priceChanged = true;
          const numPiezas = Array.isArray(design.elementos) ? design.elementos.length : 0;
          return {
            id: item.id,
            tipo: 'diseno' as const,
            cantidad: item.cantidad,
            nombre: design.nombre,
            deviceNombre: design.device.nombre,
            thumbnailUrl: design.thumbnailUrl,
            fundaNombre: `${design.caseVariant.caseBase.nombre} ${design.caseVariant.colorNombre}`,
            colorHex: design.caseVariant.colorHex,
            numPiezas,
            precioCentimos: precio,
            valido: availability.disponible,
            motivo: availability.disponible ? null : 'no-disponible',
            designId: design.id,
          };
        }
        if (item.presetId) {
          const preset = await prisma.presetDesign.findUnique({ where: { id: item.presetId } });
          if (!preset) return null;
          const compatibles = await compatibleDeviceIdsForPreset(preset.id);
          const deviceOk = !item.deviceId || compatibles.includes(item.deviceId);
          const device = item.deviceId
            ? await prisma.deviceModel.findUnique({ where: { id: item.deviceId } })
            : null;
          return {
            id: item.id,
            tipo: 'preset' as const,
            cantidad: item.cantidad,
            nombre: preset.nombre,
            deviceNombre: device?.nombre ?? null,
            thumbnailUrl: Array.isArray(preset.fotos) ? ((preset.fotos as string[])[0] ?? null) : null,
            fundaNombre: null,
            colorHex: null,
            numPiezas: null,
            precioCentimos: preset.precioCentimos,
            valido: preset.publicado && deviceOk,
            motivo: preset.publicado && deviceOk ? null : 'no-disponible',
            presetId: preset.id,
          };
        }
        return null;
      }),
    );

    const list = detailed.filter(Boolean);
    const total = list.reduce((acc, i) => acc + i!.precioCentimos * i!.cantidad, 0);
    return withGuestCookie(
      NextResponse.json({ items: list, totalCentimos: total, priceChanged }),
      setCookie,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

/** POST /api/cart (SS13.4): anade diseno o preset (con deviceId). */
export async function POST(req: NextRequest) {
  try {
    const parsed = cartAddSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('VALIDATION', 'Payload de cesta invalido');
    const { ownerKey, setCookie } = await getOwnerKey();

    if (parsed.data.designId) {
      const design = await prisma.design.findUnique({ where: { id: parsed.data.designId } });
      if (!design) return apiError('NOT_FOUND', 'Diseno no encontrado');
      const availability = await getDesignAvailability(design);
      if (!availability.disponible) {
        return apiError('DESIGN_INVALID_ENTITY', 'El diseno contiene elementos no disponibles');
      }
    }
    if (parsed.data.presetId) {
      const preset = await prisma.presetDesign.findUnique({ where: { id: parsed.data.presetId } });
      if (!preset || !preset.publicado) return apiError('NOT_FOUND', 'Preset no encontrado');
    }

    const existing = await prisma.cartItem.findFirst({
      where: {
        ownerKey,
        designId: parsed.data.designId ?? null,
        presetId: parsed.data.presetId ?? null,
        deviceId: parsed.data.deviceId ?? null,
      },
    });
    const item = existing
      ? await prisma.cartItem.update({
          where: { id: existing.id },
          data: { cantidad: existing.cantidad + parsed.data.cantidad },
        })
      : await prisma.cartItem.create({
          data: {
            ownerKey,
            designId: parsed.data.designId ?? null,
            presetId: parsed.data.presetId ?? null,
            deviceId: parsed.data.deviceId ?? null,
            cantidad: parsed.data.cantidad,
          },
        });
    return withGuestCookie(NextResponse.json(item, { status: 201 }), setCookie);
  } catch (e) {
    return handleApiError(e);
  }
}
