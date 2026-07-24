/**
 * Rate limiting (§13): ventana deslizante simple en memoria.
 * En producción con múltiples instancias, sustituir por Upstash/Redis
 * manteniendo esta interfaz.
 */
import { ApiException } from './errors';

const buckets = new Map<string, number[]>();

export function rateLimit(key: string, maxAttempts: number, windowMs: number): void {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= maxAttempts) {
    throw new ApiException('RATE_LIMITED', 'Demasiados intentos');
  }
  hits.push(now);
  buckets.set(key, hits);
  // Poda ocasional para no crecer sin límite
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t > windowMs)) buckets.delete(k);
    }
  }
}

/** 5 intentos / 15 min para login/registro/reset (§13). */
export const AUTH_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };
/** Escrituras de diseños/likes: 60 / 15 min. */
export const WRITE_LIMIT = { max: 60, windowMs: 15 * 60 * 1000 };
