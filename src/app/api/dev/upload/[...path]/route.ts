import { NextResponse, type NextRequest } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { apiError, handleApiError } from '@/server/errors';
import { storageMode } from '@/server/storage';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/dev/upload/* — receptor local de subidas SOLO para desarrollo sin
 * credenciales de Supabase Storage (fallback de SS7.10). En produccion con
 * storage configurado responde 404.
 */
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    if (storageMode() !== 'local' || process.env.NODE_ENV === 'production') {
      return apiError('NOT_FOUND', 'Solo disponible en desarrollo');
    }
    const filename = params.path.join('/');
    if (!/^[a-zA-Z0-9_-]+\.webp$/.test(filename)) {
      return apiError('VALIDATION', 'Nombre de fichero invalido');
    }
    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer.byteLength > 300_000) return apiError('VALIDATION', 'Maximo 300 KB');
    const isWebp =
      buffer.length > 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
    if (!isWebp) return apiError('VALIDATION', 'Solo WebP');
    const dir = path.join(process.cwd(), 'public', 'uploads', 'thumbnails');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
