'use client';

/**
 * Haptica sutil (N15): refuerza el feedback visual donde exista
 * navigator.vibrate; silenciosa e ignorada en navegadores sin soporte.
 * Desactivable desde el menu del editor ("Vibracion").
 */

const KEY = 'cc.vibration';

export function hapticsEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // sin almacenamiento
  }
}

function vibrate(ms: number): void {
  if (!hapticsEnabled()) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    // no soportado
  }
}

/** 10 ms al capturar un iman de guia. */
export const hapticGuide = (): void => vibrate(10);
/** 20 ms al entrar en colision (una vez por transicion valido->invalido). */
export const hapticCollision = (): void => vibrate(20);
/** 15 ms al soltar en la papelera. */
export const hapticTrash = (): void => vibrate(15);
/** 10 ms al levantar una copia con pulsacion larga (N2). */
export const hapticLift = (): void => vibrate(10);
