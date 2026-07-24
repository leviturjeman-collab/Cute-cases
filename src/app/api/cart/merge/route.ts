import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cart/merge (SS13.4, SS26.22): al iniciar sesion, union sumando
 * cantidades de items identicos. Sin duplicados ni perdidas.
 */
export async function POST() {
  try {
    const user = await requireUser();
    const guestId = cookies().get('cc.cart.session')?.value;
    if (!guestId) return NextResponse.json({ merged: 0 });
    const guestKey = `guest:${guestId}`;
    const guestItems = await prisma.cartItem.findMany({ where: { ownerKey: guestKey } });
    let merged = 0;
    for (const item of guestItems) {
      const dup = await prisma.cartItem.findFirst({
        where: {
          ownerKey: user.id,
          designId: item.designId,
          presetId: item.presetId,
          deviceId: item.deviceId,
        },
      });
      if (dup) {
        await prisma.cartItem.update({
          where: { id: dup.id },
          data: { cantidad: dup.cantidad + item.cantidad },
        });
        await prisma.cartItem.delete({ where: { id: item.id } });
      } else {
        await prisma.cartItem.update({ where: { id: item.id }, data: { ownerKey: user.id } });
      }
      merged++;
    }
    return NextResponse.json({ merged });
  } catch (e) {
    return handleApiError(e);
  }
}
