'use client';

/**
 * Modelo de iPhone recordado (§5.3): siempre en localStorage; además en la
 * cuenta si hay sesión (PATCH /api/account desde la página de selección).
 */

const KEY = 'cc_device';

export interface RememberedDevice {
  id: string;
  nombre: string;
}

export function getRememberedDevice(): RememberedDevice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedDevice;
    return parsed.id && parsed.nombre ? parsed : null;
  } catch {
    return null;
  }
}

export function rememberDevice(device: RememberedDevice): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(device));
  } catch {
    // almacenamiento lleno o bloqueado: no es crítico
  }
}

export function forgetDevice(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignorable
  }
}
