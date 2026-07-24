import { ApiException } from './errors';

/**
 * Storage de miniaturas (SS7.10, SS19): URLs prefirmadas de Supabase Storage
 * (bucket publico de lectura, subida firmada con content-type forzado).
 * En desarrollo sin credenciales, fallback al sistema de ficheros local
 * (/public/uploads), documentado como solo-dev.
 */

const BUCKET = 'thumbnails';

function supabaseConfig(): { url: string; serviceKey: string } | null {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

export function storageMode(): 'supabase' | 'local' {
  return supabaseConfig() ? 'supabase' : 'local';
}

/** Crea una URL prefirmada de subida y la URL publica final. */
export async function createSignedThumbnailUpload(
  designId: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const cfg = supabaseConfig();
  const objectPath = `${designId}.webp`;
  if (!cfg) {
    // Fallback dev: endpoint local que acepta el PUT (solo desarrollo)
    return {
      uploadUrl: `/api/dev/upload/${objectPath}`,
      publicUrl: `/uploads/thumbnails/${objectPath}`,
    };
  }
  const res = await fetch(`${cfg.url}/storage/v1/object/upload/sign/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new ApiException('INTERNAL', `Firma de subida fallida: ${res.status}`);
  }
  const body = (await res.json()) as { url: string };
  return {
    uploadUrl: `${cfg.url}/storage/v1${body.url}`,
    publicUrl: `${cfg.url}/storage/v1/object/public/${BUCKET}/${objectPath}`,
  };
}

/** Verificacion de magic bytes WebP en la confirmacion (SS19). */
export async function verifyThumbnail(publicUrl: string): Promise<boolean> {
  try {
    const absolute = publicUrl.startsWith('http');
    if (!absolute) return true; // dev local: verificado al escribir
    const res = await fetch(publicUrl, { headers: { Range: 'bytes=0-11' } });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  } catch {
    return false;
  }
}
