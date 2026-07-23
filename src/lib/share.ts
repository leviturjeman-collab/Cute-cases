/**
 * shareToken (§8.2, §13): aleatorio ≥128 bits CSPRNG, público pero no
 * listado, regenerable por el dueño.
 */
export function generateShareToken(): string {
  const bytes = new Uint8Array(20); // 160 bits
  globalThis.crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}
