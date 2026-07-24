import { NextResponse } from 'next/server';

/**
 * Errores de API v4 (SS13): envolvente uniforme { error: { code, message } }.
 * `code` es estable y se mapea a microcopy en cliente (SS23); `message` es
 * tecnico (logs) y nunca se muestra tal cual.
 */
export type ApiErrorCode =
  | 'DESIGN_INVALID_ENTITY'
  | 'DESIGN_COLLISION'
  | 'DESIGN_OUT_OF_BOUNDS'
  | 'DESIGN_ON_CAMERA'
  | 'DESIGN_CONFLICT'
  | 'NAME_TOO_LONG'
  | 'LETTERS_EMPTY'
  | 'LETTERS_TOO_LONG'
  | 'VALIDATION'
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const statusByCode: Record<ApiErrorCode, number> = {
  DESIGN_INVALID_ENTITY: 422,
  DESIGN_COLLISION: 422,
  DESIGN_OUT_OF_BOUNDS: 422,
  DESIGN_ON_CAMERA: 422,
  DESIGN_CONFLICT: 409,
  NAME_TOO_LONG: 422,
  LETTERS_EMPTY: 422,
  LETTERS_TOO_LONG: 422,
  VALIDATION: 400,
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function apiError(code: ApiErrorCode, message: string, detail?: unknown): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(detail !== undefined ? { detail } : {}) } },
    { status: statusByCode[code] },
  );
}

export class ApiException extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiException) return apiError(e.code, e.message, e.detail);
  console.error('[api] error no controlado:', e);
  return apiError('INTERNAL', 'Error interno');
}
