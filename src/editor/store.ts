'use client';

import { create } from 'zustand';
import type { ElementInstance } from '@/lib/collision';

/**
 * Estado del editor con historial de deshacer/rehacer (§6.8): mínimo 20
 * acciones (guardamos 50). Cada acción (añadir, mover, rotar, eliminar,
 * sustituir, lote de letras, cambio de variante) es UNA entrada.
 */

interface Snapshot {
  instances: ElementInstance[];
  caseVariantId: string;
}

const HISTORY_LIMIT = 50;

interface EditorStore {
  designId: string | null;
  nombre: string;
  deviceId: string | null;
  caseVariantId: string;
  instances: ElementInstance[];
  selectedId: string | null;
  past: Snapshot[];
  future: Snapshot[];
  /** Snapshot al inicio de un gesto (drag/rotación) para commit/revert. */
  gestureStart: Snapshot | null;
  dirty: boolean;

  init(state: {
    designId: string | null;
    nombre: string;
    deviceId: string;
    caseVariantId: string;
    instances: ElementInstance[];
  }): void;
  setNombre(nombre: string): void;
  setDesignId(id: string): void;
  select(id: string | null): void;

  /** Acciones con historial */
  addInstance(inst: ElementInstance): void;
  addBatch(insts: ElementInstance[]): void;
  removeInstance(id: string): void;
  replaceInstance(id: string, next: ElementInstance): void;
  setVariant(caseVariantId: string): void;

  /** Gestos en vivo (sin historial hasta commit) */
  beginGesture(): void;
  updateInstanceLive(id: string, patch: Partial<Pick<ElementInstance, 'xMm' | 'yMm' | 'rotacionGrados'>>): void;
  commitGesture(): void;
  cancelGesture(): void;

  undo(): void;
  redo(): void;
  markSaved(): void;
}

function snapshot(s: Pick<EditorStore, 'instances' | 'caseVariantId'>): Snapshot {
  return { instances: s.instances.map((i) => ({ ...i })), caseVariantId: s.caseVariantId };
}

function pushPast(s: EditorStore, snap: Snapshot): Pick<EditorStore, 'past' | 'future' | 'dirty'> {
  return {
    past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snap],
    future: [],
    dirty: true,
  };
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  designId: null,
  nombre: 'Mi funda',
  deviceId: null,
  caseVariantId: '',
  instances: [],
  selectedId: null,
  past: [],
  future: [],
  gestureStart: null,
  dirty: false,

  init: (state) =>
    set({
      designId: state.designId,
      nombre: state.nombre,
      deviceId: state.deviceId,
      caseVariantId: state.caseVariantId,
      instances: state.instances,
      selectedId: null,
      past: [],
      future: [],
      gestureStart: null,
      dirty: false,
    }),

  setNombre: (nombre) => set({ nombre, dirty: true }),
  setDesignId: (id) => set({ designId: id }),
  select: (selectedId) => set({ selectedId }),

  addInstance: (inst) =>
    set((s) => ({
      ...pushPast(s as EditorStore, snapshot(s)),
      instances: [...s.instances, inst],
      selectedId: inst.instanceId,
    })),

  addBatch: (insts) =>
    set((s) => ({
      ...pushPast(s as EditorStore, snapshot(s)),
      instances: [...s.instances, ...insts],
    })),

  removeInstance: (id) =>
    set((s) => ({
      ...pushPast(s as EditorStore, snapshot(s)),
      instances: s.instances.filter((i) => i.instanceId !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  replaceInstance: (id, next) =>
    set((s) => ({
      ...pushPast(s as EditorStore, snapshot(s)),
      instances: s.instances.map((i) => (i.instanceId === id ? next : i)),
      selectedId: next.instanceId,
    })),

  setVariant: (caseVariantId) =>
    set((s) => ({
      ...pushPast(s as EditorStore, snapshot(s)),
      caseVariantId,
    })),

  beginGesture: () => {
    const s = get();
    if (!s.gestureStart) set({ gestureStart: snapshot(s) });
  },

  updateInstanceLive: (id, patch) =>
    set((s) => ({
      instances: s.instances.map((i) => (i.instanceId === id ? { ...i, ...patch } : i)),
    })),

  commitGesture: () => {
    const s = get();
    if (!s.gestureStart) return;
    const changed =
      JSON.stringify(s.gestureStart.instances) !== JSON.stringify(s.instances) ||
      s.gestureStart.caseVariantId !== s.caseVariantId;
    set({
      gestureStart: null,
      ...(changed ? pushPast(s, s.gestureStart) : {}),
    });
  },

  cancelGesture: () => {
    const s = get();
    if (!s.gestureStart) return;
    set({
      instances: s.gestureStart.instances,
      caseVariantId: s.gestureStart.caseVariantId,
      gestureStart: null,
    });
  },

  undo: () => {
    const s = get();
    const prev = s.past[s.past.length - 1];
    if (!prev) return;
    set({
      past: s.past.slice(0, -1),
      future: [...s.future, snapshot(s)],
      instances: prev.instances,
      caseVariantId: prev.caseVariantId,
      selectedId: null,
      dirty: true,
    });
  },

  redo: () => {
    const s = get();
    const next = s.future[s.future.length - 1];
    if (!next) return;
    set({
      future: s.future.slice(0, -1),
      past: [...s.past, snapshot(s)],
      instances: next.instances,
      caseVariantId: next.caseVariantId,
      selectedId: null,
      dirty: true,
    });
  },

  markSaved: () => set({ dirty: false }),
}));

let instanceCounter = 0;

/** id local de instancia único dentro de la sesión del editor. */
export function newInstanceId(): string {
  instanceCounter += 1;
  return `i-${Date.now().toString(36)}-${instanceCounter}`;
}
