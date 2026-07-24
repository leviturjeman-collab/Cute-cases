'use client';

/** Modelo recordado (SS5.4): clave cc.device en localStorage. */

const KEY = 'cc.device';

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
    // best-effort
  }
}

export function forgetDevice(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignorable
  }
}
