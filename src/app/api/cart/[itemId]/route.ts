import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/server/db';
import { getSessionUser } from '@/server/auth';
import { cartUpdateSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

async function currentOwnerKey(): Promise<string | null> {
  const user = await getSessionUser();
  if (user) return user.id;
  const guest = cookies().get('cc_cart')?.value;
  return guest ? `guest:${guest}` : null;
}

/** PATCH /api/cart/[itemId] — cambiar cantidad (stepper §10). */
export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const ownerKey = await currentOwnerKey();
    const item = await prisma.cartItem.findUnique({ where: { id: params.itemId } });
    if (!item || item.ownerKey !== ownerKey) return apiError('NOT_FOUND', 'Ítem no encontrado');
    const parsed = cartUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', 'Cantidad inválida');
    const updated = await prisma.cartItem.update({
      where: { id: item.id },
      data: { cantidad: parsed.data.cantidad },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

/** DELETE /api/cart/[itemId] — eliminar ítem (§10). */
export async function DELETE(_req: Request, { params }: { params: { itemId: string } }) {
  try {
    const ownerKey = await currentOwnerKey();
    const item = await prisma.cartItem.findUnique({ where: { id: params.itemId } });
    if (!item || item.ownerKey !== ownerKey) return apiError('NOT_FOUND', 'Ítem no encontrado');
    await prisma.cartItem.delete({ where: { id: item.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
