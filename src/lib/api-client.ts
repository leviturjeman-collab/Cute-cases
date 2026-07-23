/**
 * Cliente de API mínimo: errores uniformes { code, message } (§12.3)
 * que la UI traduce con el diccionario (§17).
 */

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let code = 'S-03';
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { code?: string; message?: string };
      if (body.code) code = body.code;
      if (body.message) message = body.message;
    } catch {
      // sin body JSON
    }
    throw new ApiClientError(code, message, res.status);
  }
  return (await res.json()) as T;
}
