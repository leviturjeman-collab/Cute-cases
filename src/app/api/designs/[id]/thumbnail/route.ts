import { NextResponse, type NextRequest } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/server/db';
import { requireUser } from '@/server/auth';
import { thumbnailSchema } from '@/server/schemas';
import { apiError, handleApiError } from '@/server/errors';
import { requireDesignOwner } from '@/server/designService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/designs/[id]/thumbnail — miniatura 800×800 WebP del canvas (§6.9).
 * En desarrollo se guarda en /public/uploads; en producción, storage
 * S3-compatible + CDN (misma interfaz, §12.1). Validación de magic bytes (§13).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await requireDesignOwner(params.id, user.id);

    const parsed = thumbnailSchema.safeParse(await req.json());
    if (!parsed.success) return apiError('S-03', 'Miniatura inválida');

    const buffer = Buffer.from(parsed.data.imageBase64, 'base64');
    if (buffer.byteLength > 1_000_000) return apiError('S-03', 'Miniatura demasiado grande');
    // Magic bytes WebP: "RIFF" .... "WEBP"
    const isWebp =
      buffer.length > 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
    if (!isWebp) return apiError('S-03', 'Formato no permitido (solo WebP)');

    const dir = path.join(process.cwd(), 'public', 'uploads', 'thumbnails');
    await mkdir(dir, { recursive: true });
    const filename = `${params.id}.webp`; // nombre reescrito, nunca del cliente (§13)
    await writeFile(path.join(dir, filename), buffer);

    const url = `/uploads/thumbnails/${filename}`;
    await prisma.design.update({ where: { id: params.id }, data: { thumbnailUrl: url } });
    return NextResponse.json({ thumbnailUrl: url });
  } catch (e) {
    return handleApiError(e);
  }
}
