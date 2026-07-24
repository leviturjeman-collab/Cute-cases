'use client';

import type { PlacedItem } from '@/lib/collision';

/**
 * Persistencia local (SS5.4): cc.draft con el JSON integro del borrador +
 * updatedAt, autosave debounced 500 ms. Sobrevive a recargas y OAuth.
 */

const KEY = 'cc.draft';

export interface LocalDraft {
  designId: string | null;
  nombre: string;
  deviceId: string;
  variantId: string;
  items: PlacedItem[];
  pendingSave?: boolean;
  updatedAt: number;
}

export function readDraft(): LocalDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as LocalDraft;
    return draft.deviceId && draft.variantId ? draft : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: LocalDraft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // best-effort
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

export function writeDraftDebounced(draft: LocalDraft): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => writeDraft(draft), 500);
}
