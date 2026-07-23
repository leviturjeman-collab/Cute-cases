'use client';

import type { ElementInstance } from '@/lib/collision';

/**
 * Autosave local (§6.9): todo cambio se persiste en localStorage con
 * debounce de 500 ms, para invitados y logueados. Permite recuperar el
 * borrador tras cierre accidental (E-13) y sobrevivir al flujo OAuth (§5.7).
 */

const KEY = 'cc_draft';

export interface LocalDraft {
  designId: string | null;
  nombre: string;
  deviceId: string;
  caseVariantId: string;
  caseSlug?: string;
  instances: ElementInstance[];
  /** true si hay un guardado pendiente tras el flujo de auth (§5.7). */
  pendingSave?: boolean;
  updatedAt: number;
}

export function readDraft(): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as LocalDraft;
    return draft.deviceId && draft.caseVariantId ? draft : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: LocalDraft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // almacenamiento lleno: el autosave local es best-effort
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignorable
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Escribe el borrador con debounce de 500 ms (§5.7, §6.9). */
export function writeDraftDebounced(draft: LocalDraft): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => writeDraft(draft), 500);
}
