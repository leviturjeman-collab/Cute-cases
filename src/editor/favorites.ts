'use client';

import { api } from '@/lib/api-client';

/**
 * Recientes y favoritos (N8): recientes en localStorage; favoritos en la
 * cuenta si hay sesion (merge por union al iniciar sesion), localStorage
 * como respaldo.
 */

const RECENT_KEY = 'cc.recent';
const FAV_KEY = 'cc.favs';
export const RECENT_MAX = 8;

export function readRecents(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(elementId: string): string[] {
  const list = [elementId, ...readRecents().filter((id) => id !== elementId)].slice(0, RECENT_MAX);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // best-effort
  }
  return list;
}

export function readLocalFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeLocalFavorites(list: string[]): void {
  try {
    window.localStorage.setItem(FAV_KEY, JSON.stringify(list));
  } catch {
    // best-effort
  }
}

/** Merge por union con la cuenta al iniciar sesion (N8). */
export async function syncFavorites(authenticated: boolean): Promise<string[]> {
  const local = readLocalFavorites();
  if (!authenticated) return local;
  try {
    const me = await api<{ favoritos?: string[] }>('/api/me');
    const remote = Array.isArray(me.favoritos) ? me.favoritos : [];
    const merged = [...new Set([...remote, ...local])];
    if (merged.length !== remote.length) {
      await api('/api/me', { method: 'PATCH', body: JSON.stringify({ favoritos: merged }) });
    }
    writeLocalFavorites(merged);
    return merged;
  } catch {
    return local;
  }
}

export function persistFavorites(list: string[], authenticated: boolean): void {
  writeLocalFavorites(list);
  if (authenticated) {
    void api('/api/me', { method: 'PATCH', body: JSON.stringify({ favoritos: list }) }).catch(
      () => undefined,
    );
  }
}
