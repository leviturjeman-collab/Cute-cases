/**
 * Cliente de API (SS13): errores con envolvente uniforme
 * { error: { code, message, detail? } }. `code` es estable y se mapea a
 * microcopy en cliente (SS23); `message` es tecnico y nunca se muestra.
 */

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public detail?: unknown,
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
    let code = 'INTERNAL';
    let message = `HTTP ${res.status}`;
    let detail: unknown;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string; detail?: unknown } };
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
      detail = body.error?.detail;
    } catch {
      // sin body JSON
    }
    throw new ApiClientError(code, message, res.status, detail);
  }
  return (await res.json()) as T;
}
