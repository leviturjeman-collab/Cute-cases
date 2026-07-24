'use client';

import { create } from 'zustand';
import type { PlacedItem } from '@/lib/collision';
import type { CaseVariantSpec, EditorStatus } from './types';

/**
 * Store del editor (contrato SS7.2). Toda mutacion de items pasa por acciones
 * que registran la entrada inversa en history (>= 20 pasos; guardamos 50).
 * pricing se deriva con selector memoizado fuera del store (usePricing).
 */

interface Snapshot {
  items: PlacedItem[];
  variantId: string;
}

const HISTORY_LIMIT = 50;

interface EditorStore {
  designId: string | null;
  serverUpdatedAt: string | null;
  nombre: string;
  deviceId: string | null;
  variantId: string;
  items: PlacedItem[];
  selectedId: string | null;
  status: EditorStatus;
  history: { past: Snapshot[]; future: Snapshot[] };
  gestureStart: Snapshot | null;
  dirty: boolean;

  init(state: {
    designId: string | null;
    serverUpdatedAt?: string | null;
    nombre: string;
    deviceId: string;
    variantId: string;
    items: PlacedItem[];
  }): void;
  setStatus(status: EditorStatus): void;
  setNombre(nombre: string): void;
  setSaved(designId: string, serverUpdatedAt: string): void;
  select(id: string | null): void;

  addItem(item: PlacedItem): void;
  addBatch(items: PlacedItem[]): void;
  removeItem(id: string): void;
  replaceItem(id: string, next: PlacedItem): void;
  setVariant(variant: CaseVariantSpec): void;

  beginGesture(): void;
  updateItemLive(id: string, patch: Partial<Pick<PlacedItem, 'xMm' | 'yMm' | 'rotationDeg'>>): void;
  commitGesture(): void;
  cancelGesture(): void;

  undo(): void;
  redo(): void;
}

function snap(s: Pick<EditorStore, 'items' | 'variantId'>): Snapshot {
  return { items: s.items.map((i) => ({ ...i })), variantId: s.variantId };
}

function push(s: EditorStore, entry: Snapshot) {
  return {
    history: {
      past: [...s.history.past.slice(-(HISTORY_LIMIT - 1)), entry],
      future: [],
    },
    dirty: true,
  };
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  designId: null,
  serverUpdatedAt: null,
  nombre: 'Mi funda',
  deviceId: null,
  variantId: '',
  items: [],
  selectedId: null,
  status: 'loading-assets',
  history: { past: [], future: [] },
  gestureStart: null,
  dirty: false,

  init: (state) =>
    set({
      designId: state.designId,
      serverUpdatedAt: state.serverUpdatedAt ?? null,
      nombre: state.nombre,
      deviceId: state.deviceId,
      variantId: state.variantId,
      items: state.items,
      selectedId: null,
      history: { past: [], future: [] },
      gestureStart: null,
      dirty: false,
    }),

  setStatus: (status) => set({ status }),
  setNombre: (nombre) => set({ nombre: nombre.slice(0, 40), dirty: true }),
  setSaved: (designId, serverUpdatedAt) => set({ designId, serverUpdatedAt, dirty: false }),
  select: (selectedId) => set({ selectedId }),

  addItem: (item) =>
    set((s) => ({
      ...push(s as EditorStore, snap(s)),
      items: [...s.items, item],
      selectedId: item.instanceId,
    })),

  addBatch: (items) =>
    set((s) => ({
      ...push(s as EditorStore, snap(s)),
      items: [...s.items, ...items],
    })),

  removeItem: (id) =>
    set((s) => ({
      ...push(s as EditorStore, snap(s)),
      items: s.items.filter((i) => i.instanceId !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  replaceItem: (id, next) =>
    set((s) => ({
      ...push(s as EditorStore, snap(s)),
      items: s.items.map((i) => (i.instanceId === id ? next : i)),
      selectedId: next.instanceId,
    })),

  setVariant: (variant) =>
    set((s) => ({
      ...push(s as EditorStore, snap(s)),
      variantId: variant.id,
    })),

  beginGesture: () => {
    const s = get();
    if (!s.gestureStart) set({ gestureStart: snap(s) });
  },

  updateItemLive: (id, patch) =>
    set((s) => ({
      items: s.items.map((i) => (i.instanceId === id ? { ...i, ...patch } : i)),
    })),

  commitGesture: () => {
    const s = get();
    if (!s.gestureStart) return;
    const changed =
      JSON.stringify(s.gestureStart.items) !== JSON.stringify(s.items) ||
      s.gestureStart.variantId !== s.variantId;
    set({
      gestureStart: null,
      ...(changed ? push(s, s.gestureStart) : {}),
    });
  },

  cancelGesture: () => {
    const s = get();
    if (!s.gestureStart) return;
    set({ items: s.gestureStart.items, variantId: s.gestureStart.variantId, gestureStart: null });
  },

  undo: () => {
    const s = get();
    const prev = s.history.past[s.history.past.length - 1];
    if (!prev) return;
    set({
      history: { past: s.history.past.slice(0, -1), future: [...s.history.future, snap(s)] },
      items: prev.items,
      variantId: prev.variantId,
      selectedId: null,
      dirty: true,
    });
  },

  redo: () => {
    const s = get();
    const next = s.history.future[s.history.future.length - 1];
    if (!next) return;
    set({
      history: { past: [...s.history.past, snap(s)], future: s.history.future.slice(0, -1) },
      items: next.items,
      variantId: next.variantId,
      selectedId: null,
      dirty: true,
    });
  },
}));

let counter = 0;

export function newInstanceId(): string {
  counter += 1;
  return `i${Date.now().toString(36)}${counter}`;
}
