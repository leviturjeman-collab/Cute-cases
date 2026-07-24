import { NextResponse, type NextRequest } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { apiError, handleApiError } from '@/server/errors';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/dev/render-save?path=cases/silicona-soft.webp — receptor de la
 * utilidad interna de renders (SS10.5, /dev/renders). SOLO desarrollo: las
 * imagenes se versionan en /public/renders/.
 */
export async function PUT(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return apiError('NOT_FOUND', 'Solo disponible en desarrollo');
    }
    const rel = req.nextUrl.searchParams.get('path') ?? '';
    if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*\.webp$/.test(rel)) {
      return apiError('VALIDATION', 'Ruta invalida');
    }
    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer.byteLength > 3_000_000) return apiError('VALIDATION', 'Maximo 3 MB');
    const isWebp =
      buffer.length > 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
    if (!isWebp) return apiError('VALIDATION', 'Solo WebP');
    const target = path.join(process.cwd(), 'public', 'renders', rel);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);
    return NextResponse.json({ ok: true, path: `/renders/${rel}` });
  } catch (e) {
    return handleApiError(e);
  }
}
