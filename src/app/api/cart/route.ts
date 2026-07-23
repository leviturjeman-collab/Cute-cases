import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { cartAddSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { getDesignAvailability } from '@/server/designService';

export const dynamic = 'force-dynamic';

const GUEST_COOKIE = 'cc_cart';

/** ownerKey de la cesta: userId con sesión, cookie de invitado sin ella (§10). */
async function getOwnerKey(): Promise<{ ownerKey: string; setCookie?: string }> {
  const user = await getSessionUser();
  if (user) return { ownerKey: user.id };
  const existing = cookies().get(GUEST_COOKIE)?.value;
  if (existing) return { ownerKey: `guest:${existing}` };
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  const id = Buffer.from(bytes).toString('base64url');
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
 * Merge de cestas al iniciar sesión (§10, caso §18.22): unión de ítems sin
 * duplicados ni pérdidas. Se invoca de forma perezosa en cada GET con sesión.
 */
async function mergeGuestCart(userId: string): Promise<void> {
  const guestId = cookies().get(GUEST_COOKIE)?.value;
  if (!guestId) return;
  const guestKey = `guest:${guestId}`;
  const guestItems = await prisma.cartItem.findMany({ where: { ownerKey: guestKey } });
  if (guestItems.length === 0) return;
  const userItems = await prisma.cartItem.findMany({ where: { ownerKey: userId } });
  for (const item of guestItems) {
    const dup = userItems.find(
      (u) => u.designId === item.designId && u.presetId === item.presetId,
    );
    if (dup) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({ where: { id: item.id }, data: { ownerKey: userId } });
    }
  }
}

/** GET /api/cart — ítems con estado de disponibilidad (§10). */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (user) await mergeGuestCart(user.id);
    const { ownerKey, setCookie } = await getOwnerKey();

    const items = await prisma.cartItem.findMany({
      where: { ownerKey },
      orderBy: { createdAt: 'asc' },
    });

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
          const numElementos = Array.isArray(design.elementos) ? design.elementos.length : 0;
          return {
            id: item.id,
            tipo: 'diseno' as const,
            cantidad: item.cantidad,
            nombre: design.nombre,
            deviceNombre: design.device.nombre,
            thumbnailUrl: design.thumbnailUrl,
            fundaNombre: `${design.caseVariant.caseBase.nombre} · ${design.caseVariant.colorNombre}`,
            numElementos,
            precioCentimos: design.precioTotalCache,
            disponible: availability.disponible,
            designId: design.id,
          };
        }
        if (item.presetId) {
          const preset = await prisma.presetDesign.findUnique({ where: { id: item.presetId } });
          if (!preset) return null;
          return {
            id: item.id,
            tipo: 'preset' as const,
            cantidad: item.cantidad,
            nombre: preset.nombre,
            deviceNombre: null,
            thumbnailUrl: Array.isArray(preset.fotos) ? ((preset.fotos as string[])[0] ?? null) : null,
            fundaNombre: null,
            numElementos: null,
            precioCentimos: preset.precioCentimos,
            disponible: preset.publicado,
            presetId: preset.id,
          };
        }
        return null;
      }),
    );

    const list = detailed.filter(Boolean);
    const total = list.reduce((acc, i) => acc + i!.precioCentimos * i!.cantidad, 0);
    return withGuestCookie(NextResponse.json({ items: list, totalCentimos: total }), setCookie);
  } catch (e) {
    return handleApiError(e);
  }
}

/** POST /api/cart — añadir diseño propio, regalo o preset (§10). */
export async function POST(req: NextRequest) {
  try {
    const parsed = cartAddSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', 'Payload de cesta inválido');
    const { ownerKey, setCookie } = await getOwnerKey();

    // Un ítem no disponible no puede añadirse (E-10)
    if (parsed.data.designId) {
      const design = await prisma.design.findUnique({ where: { id: parsed.data.designId } });
      if (!design) return apiError('NOT_FOUND', 'Diseño no encontrado');
      const availability = await getDesignAvailability(design);
      if (!availability.disponible) {
        return apiError('S-01', 'El diseño contiene elementos no disponibles');
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
            cantidad: parsed.data.cantidad,
          },
        });
    return withGuestCookie(NextResponse.json(item, { status: 201 }), setCookie);
  } catch (e) {
    return handleApiError(e);
  }
}
