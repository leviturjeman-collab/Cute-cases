import { NextResponse } from 'next/server';

/**
 * Errores de API con formato uniforme { code, message } (§12.3).
 * Los mensajes de cara al usuario se resuelven en cliente desde el
 * diccionario (§17); message aquí es técnico para logs/debug.
 */
export type ApiErrorCode =
  | 'S-01' // elementos/funda inválidos o caducados
  | 'S-02' // colisión detectada en server
  | 'S-03' // error de validación/genérico
  | 'S-04' // ownership
  | 'AUTH' // no autenticado
  | 'ADMIN' // requiere rol admin
  | 'NOT_FOUND'
  | 'RATE_LIMIT';

const statusByCode: Record<ApiErrorCode, number> = {
  'S-01': 422,
  'S-02': 422,
  'S-03': 400,
  'S-04': 403,
  AUTH: 401,
  ADMIN: 403,
  NOT_FOUND: 404,
  RATE_LIMIT: 429,
};

export function apiError(code: ApiErrorCode, message: string): NextResponse {
  return NextResponse.json({ code, message }, { status: statusByCode[code] });
}

export class ApiException extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiException) return apiError(e.code, e.message);
  console.error('[api] error no controlado:', e);
  return apiError('S-03', 'Error interno');
}
