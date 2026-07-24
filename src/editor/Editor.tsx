'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import type { ThreeEvent } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  ArrowDown, ArrowLeft, ArrowUp, ArrowRight as ArrowRightIcon, Check, Crosshair,
  MoreHorizontal, Pencil, Redo2, RotateCw, Share2, ShoppingBag, Trash2, Undo2,
} from 'lucide-react';
import {
  Badge, BottomSheet, Button, Input, Modal, PriceTag, SHEET_HEIGHTS_PX, Tabs, useToast,
  type SheetPosition,
} from '@/components/ui';
import { api, ApiClientError } from '@/lib/api-client';
import { getRememberedDevice } from '@/lib/deviceStorage';
import {
  buildSceneContext, esValida, findFreeSpot, placeLettersRow,
  type ElementShape, type PlacedItem,
} from '@/lib/collision';
import { computeBreakdown, computeTotalCentimos, formatCentimos, type PricedElement } from '@/lib/pricing';
import { loadLetterFont } from '@/assets-procedural';
import { Viewer3D, type ItemVisualState } from './Viewer3D';
import { newInstanceId, useEditorStore } from './store';
import { clearDraft, readDraft, writeDraftDebounced, type LocalDraft } from './autosave';
import { captureThumbnail } from './capture';
import { ElementThumb } from './ElementThumb';
import { hasWebGL2 } from './webgl';
import type { CatalogElement, CategoryId, DeviceSpec, SnapView } from './types';
import { CATEGORY_ORDER } from './types';

interface DevicesResponse {
  generaciones: { nombre: string; modelos: DeviceSpec[] }[];
}

interface CasesResponse {
  fundas: {
    id: string; slug: string; nombre: string; material: string;
    variantes: { id: string; colorNombre: string; colorHex: string; precioCentimos: number; disponible: boolean }[];
  }[];
}

interface ElementsResponse {
  porCategoria: Record<string, CatalogElement[]>;
  temporada: { id: string; slug: string; nombre: string } | null;
}

const DEG = Math.PI / 180;

/** Editor 3D v4 (SS7). D2: es el producto. */
export function Editor({ designId }: { designId?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const { status: authStatus } = useSession();
  const { showToast } = useToast();
  const store = useEditorStore();

  const [webgl] = useState(() => (typeof window === 'undefined' ? true : hasWebGL2()));
  const [fontReady, setFontReady] = useState(false);
  const [sheetPos, setSheetPos] = useState<SheetPosition>('half');
  const [activeTab, setActiveTab] = useState<string>(params.get('tab') === 'temporada' ? 'temporada' : 'corazones');
  const [showGrid, setShowGrid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapTarget, setSnapTarget] = useState<SnapView | null>('trasera');
  const [cameraState, setCameraState] = useState({ azimuthDeg: 0, polarDeg: 82 });
  const [guides, setGuides] = useState<{ v?: number | null; h?: number | null }>({});
  const [liveStates, setLiveStates] = useState<Map<string, ItemVisualState>>(new Map());
  const [ghost, setGhost] = useState<PlacedItem | null>(null);
  const [rotationTooltip, setRotationTooltip] = useState<number | null>(null);
  const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set());
  const [expiredModal, setExpiredModal] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [draftPrompt, setDraftPrompt] = useState<LocalDraft | null>(null);
  const [authPrompt, setAuthPrompt] = useState(false);
  const [conflict, setConflict] = useState<{ serverUpdatedAt: string } | null>(null);
  const [trashActive, setTrashActive] = useState(false);

  const viewerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    isTouch: boolean;
    lastValid: { xMm: number; yMm: number; rotationDeg: number };
    hadValid: boolean;
    isGhost: boolean;
  } | null>(null);
  const twistRef = useRef<{ id: string; startAngle: number; startRot: number } | null>(null);
  const handleRef = useRef<{ id: string; startRot: number } | null>(null);
  const lastTapRef = useRef(0);
  const pendingAddRef = useRef<CatalogElement | null>(null);

  // ---------- datos ----------
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<DevicesResponse>('/api/devices'),
  });
  const { data: casesData } = useQuery({
    queryKey: ['cases-all'],
    queryFn: async () => {
      const deviceId = useEditorStore.getState().deviceId ?? getRememberedDevice()?.id;
      return api<CasesResponse>(`/api/cases?deviceId=${deviceId}`);
    },
    enabled: Boolean(store.deviceId || getRememberedDevice()?.id),
  });
  const { data: elementsData, isError: elementsError, refetch: refetchElements } = useQuery({
    queryKey: ['elements'],
    queryFn: () => api<ElementsResponse>('/api/elements'),
  });

  useEffect(() => {
    void loadLetterFont().then(() => setFontReady(true)).catch(() => setFontReady(true));
  }, []);

  const allDevices = useMemo(
    () => devicesData?.generaciones.flatMap((g) => g.modelos) ?? [],
    [devicesData],
  );
  const device = useMemo(() => {
    const id = store.deviceId ?? getRememberedDevice()?.id;
    return allDevices.find((d) => d.id === id) ?? null;
  }, [allDevices, store.deviceId]);

  const catalog = useMemo(() => {
    const map = new Map<string, CatalogElement>();
    if (elementsData) {
      for (const list of Object.values(elementsData.porCategoria)) {
        for (const el of list) map.set(el.id, el);
      }
    }
    return map;
  }, [elementsData]);

  const shapes = useMemo(() => {
    const map = new Map<string, ElementShape>();
    catalog.forEach((el, id) => map.set(id, { hitbox: el.hitbox, anchoMm: el.anchoMm, altoMm: el.altoMm }));
    return map;
  }, [catalog]);

  const priced = useMemo(() => {
    const map = new Map<string, PricedElement>();
    catalog.forEach((el, id) => map.set(id, { precioCentimos: el.precioCentimos, nombre: el.nombre }));
    return map;
  }, [catalog]);

  const currentCase = useMemo(
    () => casesData?.fundas.find((f) => f.variantes.some((v) => v.id === store.variantId)) ?? null,
    [casesData, store.variantId],
  );
  const currentVariant = currentCase?.variantes.find((v) => v.id === store.variantId) ?? null;

  const sceneCtx = useMemo(
    () => (device ? buildSceneContext(device) : null),
    [device],
  );

  // ---------- inicializacion ----------
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || allDevices.length === 0) return;
    const boot = async () => {
      initialized.current = true;
      if (designId) {
        try {
          const design = await api<{
            id: string; nombre: string; deviceId: string; caseVariantId: string;
            elementos: PlacedItem[]; updatedAt: string;
            availability: { caducadosElementIds: string[] };
          }>(`/api/designs/${designId}`);
          store.init({
            designId: design.id,
            serverUpdatedAt: design.updatedAt,
            nombre: design.nombre,
            deviceId: design.deviceId,
            variantId: design.caseVariantId,
            items: design.elementos.map((e) => ({ ...e, instanceId: e.instanceId ?? newInstanceId() })),
          });
          if (design.availability.caducadosElementIds.length > 0) {
            setExpiredIds(new Set(design.availability.caducadosElementIds));
            setExpiredModal(true);
            store.setStatus('resolving-expired');
          }
          return;
        } catch {
          showToast(t('toasts.T15'), 'error');
        }
      }
      const draft = readDraft();
      const variantParam = params.get('variant');
      const deviceIdWanted = getRememberedDevice()?.id ?? draft?.deviceId;
      if (draft && !variantParam) {
        if (draft.pendingSave) {
          store.init({
            designId: draft.designId, nombre: draft.nombre, deviceId: draft.deviceId,
            variantId: draft.variantId, items: draft.items,
          });
          return;
        }
        setDraftPrompt(draft);
        return;
      }
      if (deviceIdWanted && variantParam) {
        store.init({
          designId: null, nombre: t('editor.nombrePorDefecto'), deviceId: deviceIdWanted,
          variantId: variantParam, items: [],
        });
        return;
      }
      router.replace(deviceIdWanted ? '/fundas' : '/modelo');
    };
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDevices, designId]);

  // Guardado pendiente tras OAuth (SS15.4)
  const pendingSaveDone = useRef(false);
  useEffect(() => {
    const draft = readDraft();
    if (authStatus === 'authenticated' && draft?.pendingSave && !pendingSaveDone.current && store.deviceId && catalog.size > 0) {
      pendingSaveDone.current = true;
      void doSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, store.deviceId, catalog.size]);

  // Autosave local (SS5.4)
  useEffect(() => {
    if (!store.deviceId || !store.variantId) return;
    writeDraftDebounced({
      designId: store.designId, nombre: store.nombre, deviceId: store.deviceId,
      variantId: store.variantId, items: store.items, updatedAt: Date.now(),
    });
  }, [store.designId, store.nombre, store.deviceId, store.variantId, store.items]);

  // Estado listo
  useEffect(() => {
    if (device && currentVariant && catalog.size > 0 && fontReady && store.status === 'loading-assets') {
      store.setStatus('ready');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device, currentVariant, catalog.size, fontReady]);

  // ---------- precio ----------
  const totalCentimos = useMemo(() => {
    if (!currentVariant) return 0;
    try {
      return computeTotalCentimos(currentVariant.precioCentimos, store.items, priced);
    } catch {
      return currentVariant.precioCentimos;
    }
  }, [currentVariant, store.items, priced]);

  const breakdown = useMemo(() => {
    if (!currentVariant || !currentCase) return null;
    return computeBreakdown(
      `${currentCase.nombre} ${currentVariant.colorNombre}`,
      currentVariant.precioCentimos,
      store.items.filter((i) => priced.has(i.elementId)),
      priced,
    );
  }, [currentCase, currentVariant, store.items, priced]);

  // ---------- estados visuales ----------
  const visualStates = useMemo(() => {
    const map = new Map<string, ItemVisualState>();
    for (const item of store.items) {
      const st: ItemVisualState = {};
      if (item.instanceId === store.selectedId) st.selected = true;
      if (expiredIds.has(item.elementId)) st.expired = true;
      const live = liveStates.get(item.instanceId);
      if (live) Object.assign(st, live);
      if (Object.keys(st).length > 0) map.set(item.instanceId, st);
    }
    if (ghost) {
      const st: ItemVisualState = { ghost: true };
      const live = liveStates.get(ghost.instanceId);
      if (live) Object.assign(st, live);
      map.set(ghost.instanceId, st);
    }
    return map;
  }, [store.items, store.selectedId, expiredIds, liveStates, ghost]);

  const hasExpired = expiredIds.size > 0 && store.items.some((i) => expiredIds.has(i.elementId));

  /** SS7.5: la trasera esta "suficientemente orientada" si el angulo camara-normal <= 65 grados. */
  const backFacing = useMemo(() => {
    const cosAngle = Math.sin(cameraState.polarDeg * DEG) * Math.cos(cameraState.azimuthDeg * DEG);
    return Math.acos(Math.min(1, Math.max(-1, cosAngle))) / DEG <= 65;
  }, [cameraState]);

  const activeSnap: SnapView | null = useMemo(() => {
    const near = (a: number, b: number) => Math.abs(a - b) < 5;
    if (near(cameraState.azimuthDeg, 0) && near(cameraState.polarDeg, 82)) return 'trasera';
    if (near(cameraState.azimuthDeg, -70) && near(cameraState.polarDeg, 90)) return 'lateral-izq';
    if (near(cameraState.azimuthDeg, 70) && near(cameraState.polarDeg, 90)) return 'lateral-der';
    return null;
  }, [cameraState]);

  // ---------- validacion en vivo ----------
  const validateLive = useCallback(
    (item: PlacedItem, includeGhost = false): boolean => {
      if (!sceneCtx) return false;
      const others = [...store.items.filter((i) => i.instanceId !== item.instanceId)];
      if (includeGhost === false && ghost && ghost.instanceId !== item.instanceId) others.push(ghost);
      const res = esValida(item, others, shapes, sceneCtx);
      const map = new Map<string, ItemVisualState>();
      if (!res.valida) {
        map.set(item.instanceId, { invalid: true });
        for (const ref of res.refs ?? []) map.set(ref, { collided: true });
      }
      setLiveStates(map);
      return res.valida;
    },
    [sceneCtx, store.items, shapes, ghost],
  );

  // ---------- anadir (SS7.5) ----------
  const addElement = useCallback(
    (el: CatalogElement) => {
      if (!device || !sceneCtx) return;
      if (replacingId) {
        // Sustitucion de caducado (SS7.8): misma pose y, si no cabe, busqueda
        const target = store.items.find((i) => i.instanceId === replacingId);
        if (!target) return;
        const others = store.items.filter((i) => i.instanceId !== replacingId);
        const samePose: PlacedItem = { ...target, elementId: el.id, letterChar: el.letraChar ?? undefined };
        const allShapes = new Map(shapes);
        allShapes.set(el.id, { hitbox: el.hitbox, anchoMm: el.anchoMm, altoMm: el.altoMm });
        if (esValida(samePose, others, allShapes, sceneCtx).valida) {
          store.replaceItem(replacingId, { ...samePose, instanceId: newInstanceId() });
        } else {
          const spot = findFreeSpot(el.id, allShapes.get(el.id)!, others, allShapes, device);
          if (!spot) {
            showToast(t('toasts.T06'), 'error');
            return;
          }
          store.replaceItem(replacingId, {
            instanceId: newInstanceId(), elementId: el.id, xMm: spot.x, yMm: spot.y,
            rotationDeg: spot.rotationDeg, letterChar: el.letraChar ?? undefined,
          });
        }
        setExpiredIds((prev) => {
          const next = new Set(prev);
          const stillUsed = useEditorStore.getState().items.some((i) => i.elementId === target.elementId);
          if (!stillUsed) next.delete(target.elementId);
          return next;
        });
        setReplacingId(null);
        return;
      }
      const doAdd = () => {
        const shape: ElementShape = { hitbox: el.hitbox, anchoMm: el.anchoMm, altoMm: el.altoMm };
        const all = new Map(shapes);
        all.set(el.id, shape);
        const spot = findFreeSpot(el.id, shape, store.items, all, device);
        if (!spot) {
          showToast(t('toasts.T06'), 'error');
          return;
        }
        store.addItem({
          instanceId: newInstanceId(), elementId: el.id, xMm: spot.x, yMm: spot.y,
          rotationDeg: spot.rotationDeg, letterChar: el.letraChar ?? undefined,
        });
      };
      if (!backFacing) {
        // Reencuadre y despues anadir (SS7.5)
        pendingAddRef.current = el;
        setSnapTarget('trasera');
        return;
      }
      doAdd();
    },
    [device, sceneCtx, replacingId, store, shapes, backFacing, showToast, t],
  );

  const onSnapReached = useCallback(() => {
    setSnapTarget(null);
    const pending = pendingAddRef.current;
    if (pending) {
      pendingAddRef.current = null;
      addElement(pending);
    }
  }, [addElement]);

  // ---------- gestos: matriz SS7.4 ----------
  const onItemPointerDown = (instanceId: string, e: ThreeEvent<PointerEvent>) => {
    const item = store.items.find((i) => i.instanceId === instanceId);
    if (!item) return;
    store.select(instanceId);
    if (expiredIds.has(item.elementId)) return; // caducados: sin drag (SS7.8)
    if (controlsRef.current) controlsRef.current.enabled = false; // regla: camara bloqueada
    store.beginGesture();
    dragRef.current = {
      id: instanceId,
      pointerId: e.pointerId,
      startX: e.nativeEvent.clientX,
      startY: e.nativeEvent.clientY,
      moved: false,
      isTouch: e.nativeEvent.pointerType === 'touch',
      lastValid: { xMm: item.xMm, yMm: item.yMm, rotationDeg: item.rotationDeg },
      hadValid: true,
      isGhost: false,
    };
  };

  const mmPerPx = useCallback((): number => {
    const el = viewerRef.current;
    if (!el || !device) return 0.3;
    return (device.altoMm * 1.6) / el.clientHeight;
  }, [device]);

  const applyMagnet = useCallback(
    (item: PlacedItem, x: number, y: number): { x: number; y: number } => {
      if (!device) return { x, y };
      const g: { v?: number | null; h?: number | null } = {};
      let nx = x;
      let ny = y;
      const centerX = device.anchoMm / 2;
      const centerY = device.altoMm / 2;
      // Iman SOLO de posicion, radio 1,5 mm (SS7.7); jamas de rotacion
      if (Math.abs(nx - centerX) < 1.5) {
        nx = centerX;
        g.v = centerX;
      }
      if (Math.abs(ny - centerY) < 1.5) {
        ny = centerY;
        g.h = centerY;
      }
      for (const other of store.items) {
        if (other.instanceId === item.instanceId) continue;
        if (g.v === undefined && Math.abs(nx - other.xMm) < 1.5) {
          nx = other.xMm;
          g.v = other.xMm;
        }
        if (g.h === undefined && Math.abs(ny - other.yMm) < 1.5) {
          ny = other.yMm;
          g.h = other.yMm;
        }
      }
      setGuides(g);
      return { x: nx, y: ny };
    },
    [device, store.items],
  );

  const onPlanePointerMove = (xMm: number, yMm: number, e: ThreeEvent<PointerEvent>) => {
    const drag = dragRef.current;
    if (!drag || twistRef.current) return;
    if (e.pointerId !== drag.pointerId) return;
    const dx = e.nativeEvent.clientX - drag.startX;
    const dy = e.nativeEvent.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return; // umbral tap/drag (SS7.4)
    drag.moved = true;
    store.setStatus('dragging');
    let y = yMm;
    if (drag.isTouch) y -= 48 * mmPerPx(); // offset tactil 48 px (SS7.6)
    const isGhostItem = ghost?.instanceId === drag.id;
    const current = isGhostItem ? ghost : store.items.find((i) => i.instanceId === drag.id);
    if (!current) return;
    const snapped = applyMagnet(current, xMm, y);
    const updated = { ...current, xMm: snapped.x, yMm: snapped.y };
    if (isGhostItem) setGhost(updated);
    else store.updateItemLive(drag.id, { xMm: snapped.x, yMm: snapped.y });
    const valid = validateLive(updated, isGhostItem);
    if (valid) drag.lastValid = { xMm: snapped.x, yMm: snapped.y, rotationDeg: updated.rotationDeg };
    drag.hadValid = drag.hadValid || valid;
    // Zona de papelera (SS7.6)
    const trashEl = document.getElementById('cc-trash-zone');
    if (trashEl) {
      const r = trashEl.getBoundingClientRect();
      const inside =
        e.nativeEvent.clientX >= r.left - 10 && e.nativeEvent.clientX <= r.right + 10 &&
        e.nativeEvent.clientY >= r.top - 10 && e.nativeEvent.clientY <= r.bottom + 10;
      setTrashActive(inside);
    }
  };

  const endDrag = useCallback(
    (cancelled = false) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      setGuides({});
      if (controlsRef.current) controlsRef.current.enabled = true;
      store.setStatus(hasExpired ? 'resolving-expired' : 'ready');
      const wasTrash = trashActive;
      setTrashActive(false);

      const isGhostItem = ghost?.instanceId === drag.id;
      if (isGhostItem) {
        const g = ghost;
        setGhost(null);
        setLiveStates(new Map());
        if (cancelled || !g) return;
        if (wasTrash) return;
        if (!sceneCtx) return;
        const valid = esValida(g, store.items, shapes, sceneCtx).valida;
        if (!valid) {
          showToast(t('toasts.T05'), 'error');
          return;
        }
        store.addItem({ ...g, instanceId: newInstanceId() });
        return;
      }

      const item = useEditorStore.getState().items.find((i) => i.instanceId === drag.id);
      if (!item || !sceneCtx) {
        setLiveStates(new Map());
        store.cancelGesture();
        return;
      }
      if (cancelled) {
        // pointercancel: reversion silenciosa (SS7.4)
        store.cancelGesture();
        setLiveStates(new Map());
        return;
      }
      if (wasTrash && drag.moved) {
        store.cancelGesture();
        store.removeItem(drag.id);
        setLiveStates(new Map());
        return;
      }
      if (!drag.moved) {
        store.cancelGesture(); // tap: solo seleccion (regla 2)
        setLiveStates(new Map());
        return;
      }
      const others = useEditorStore.getState().items.filter((i) => i.instanceId !== drag.id);
      const valid = esValida(item, others, shapes, sceneCtx).valida;
      if (!valid) {
        showToast(t('toasts.T05'), 'error');
        store.updateItemLive(drag.id, drag.lastValid);
        store.commitGesture();
      } else {
        store.commitGesture();
      }
      setLiveStates(new Map());
    },
    [store, sceneCtx, shapes, ghost, trashActive, hasExpired, showToast, t],
  );

  // Rotacion por gesto de dos dedos / asa; doble tap reencuadra
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    const angleOf = (touches: TouchList) => {
      const a = touches[0]!;
      const b = touches[1]!;
      return (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI;
    };

    const onTouchStart = (ev: TouchEvent) => {
      if (ev.touches.length === 2) {
        const drag = dragRef.current;
        const selected = drag?.id ?? useEditorStore.getState().selectedId;
        if (drag) {
          // Regla 10: un dedo extra durante drag se ignora
          return;
        }
        if (selected) {
          const item = useEditorStore.getState().items.find((i) => i.instanceId === selected);
          if (item && !expiredIds.has(item.elementId)) {
            // Regla 5: dos dedos sobre elemento seleccionado = rotacion
            if (controlsRef.current) controlsRef.current.enabled = false;
            store.beginGesture();
            store.setStatus('rotating-item');
            twistRef.current = { id: selected, startAngle: angleOf(ev.touches), startRot: item.rotationDeg };
          }
        }
      } else if (ev.touches.length === 1 && !dragRef.current) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) setSnapTarget('trasera'); // doble tap (SS7.3)
        lastTapRef.current = now;
      }
    };

    const onTouchMove = (ev: TouchEvent) => {
      const tw = twistRef.current;
      if (tw && ev.touches.length === 2) {
        ev.preventDefault();
        const delta = angleOf(ev.touches) - tw.startAngle;
        let rot = (tw.startRot + delta) % 360;
        if (rot < 0) rot += 360;
        store.updateItemLive(tw.id, { rotationDeg: rot });
        setRotationTooltip(Math.round(rot));
        const item = useEditorStore.getState().items.find((i) => i.instanceId === tw.id);
        if (item) validateLive({ ...item, rotationDeg: rot });
      }
    };

    const onTouchEnd = (ev: TouchEvent) => {
      const tw = twistRef.current;
      if (tw && ev.touches.length < 2) {
        twistRef.current = null;
        setRotationTooltip(null);
        if (controlsRef.current) controlsRef.current.enabled = true;
        store.setStatus(hasExpired ? 'resolving-expired' : 'ready');
        const state = useEditorStore.getState();
        const item = state.items.find((i) => i.instanceId === tw.id);
        if (item && sceneCtx) {
          const others = state.items.filter((i) => i.instanceId !== tw.id);
          if (!esValida(item, others, shapes, sceneCtx).valida) {
            showToast(t('toasts.T05'), 'error');
            store.cancelGesture(); // reversion de rotacion (SS26.3)
          } else {
            store.commitGesture();
          }
        }
        setLiveStates(new Map());
      }
    };

    const onDblClick = () => {
      if (!dragRef.current) setSnapTarget('trasera');
    };

    const onPointerUp = () => endDrag(false);
    const onPointerCancel = () => endDrag(true);

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('dblclick', onDblClick);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [endDrag, expiredIds, sceneCtx, shapes, store, validateLive, hasExpired, showToast, t]);

  // Teclado (SS21)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        if (ev.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (ev.key === 'Escape') {
        store.select(null);
        return;
      }
      if (ev.key === 'Tab') {
        const items = store.items;
        if (items.length > 0) {
          ev.preventDefault();
          const idx = items.findIndex((i) => i.instanceId === store.selectedId);
          store.select(items[(idx + 1) % items.length]!.instanceId);
        }
        return;
      }
      const selected = store.selectedId;
      if (!selected) return;
      const item = store.items.find((i) => i.instanceId === selected);
      if (!item || !sceneCtx) return;
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        store.removeItem(selected);
        return;
      }
      if (ev.key.toLowerCase() === 'r') {
        const delta = ev.shiftKey ? -1 : 1;
        let rot = (item.rotationDeg + delta) % 360;
        if (rot < 0) rot += 360;
        tryPose({ ...item, rotationDeg: rot });
        return;
      }
      const step = ev.shiftKey ? 5 : 1;
      let patch: Partial<PlacedItem> | null = null;
      if (ev.key === 'ArrowUp') patch = { yMm: item.yMm - step };
      if (ev.key === 'ArrowDown') patch = { yMm: item.yMm + step };
      if (ev.key === 'ArrowLeft') patch = { xMm: item.xMm - step };
      if (ev.key === 'ArrowRight') patch = { xMm: item.xMm + step };
      if (patch) {
        ev.preventDefault();
        tryPose({ ...item, ...patch });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, sceneCtx, shapes]);

  const tryPose = useCallback(
    (candidate: PlacedItem): boolean => {
      if (!sceneCtx) return false;
      const others = store.items.filter((i) => i.instanceId !== candidate.instanceId);
      if (!esValida(candidate, others, shapes, sceneCtx).valida) return false;
      store.beginGesture();
      store.updateItemLive(candidate.instanceId, {
        xMm: candidate.xMm, yMm: candidate.yMm, rotationDeg: candidate.rotationDeg,
      });
      store.commitGesture();
      return true;
    },
    [sceneCtx, store, shapes],
  );

  // ---------- acciones del panel contextual (SS7.6) ----------
  const selected = store.items.find((i) => i.instanceId === store.selectedId) ?? null;
  const selectedElement = selected ? (catalog.get(selected.elementId) ?? null) : null;
  const selectedExpired = selected ? expiredIds.has(selected.elementId) : false;

  const nudge = (dx: number, dy: number) => {
    if (!selected) return;
    tryPose({ ...selected, xMm: selected.xMm + dx, yMm: selected.yMm + dy });
  };

  const rotateTo = (deg: number) => {
    if (!selected) return;
    let rot = deg % 360;
    if (rot < 0) rot += 360;
    if (!tryPose({ ...selected, rotationDeg: rot })) showToast(t('toasts.T05'), 'error');
  };

  const centerSelected = () => {
    if (!selected || !device || !selectedElement) return;
    const centerX = device.anchoMm / 2;
    if (tryPose({ ...selected, xMm: centerX })) return;
    const others = store.items.filter((i) => i.instanceId !== selected.instanceId);
    const spot = findFreeSpot(
      selected.elementId,
      { hitbox: selectedElement.hitbox, anchoMm: selectedElement.anchoMm, altoMm: selectedElement.altoMm },
      others, shapes, device, undefined, { x: centerX, y: selected.yMm },
    );
    if (spot) tryPose({ ...selected, xMm: spot.x, yMm: spot.y, rotationDeg: selected.rotationDeg });
    else showToast(t('toasts.T06'), 'error');
  };

  // ---------- letras (SS11.5) ----------
  const [lettersText, setLettersText] = useState('');
  const [lettersJuego, setLettersJuego] = useState<'letras-oro' | 'letras-sticker'>('letras-oro');
  const createLetters = async () => {
    if (!device || lettersText.trim() === '') return;
    try {
      const res = await api<{
        letras: { elementId: string; char: string; anchoMm: number; altoMm: number; precioCentimos: number; hitbox: ElementShape['hitbox'] }[];
        filtrados: number;
      }>('/api/letters/expand', {
        method: 'POST',
        body: JSON.stringify({ texto: lettersText, juego: lettersJuego }),
      });
      if (res.filtrados > 0) showToast(t('toasts.T08'));
      if (res.letras.length === 0) return;
      const row = placeLettersRow(
        res.letras.map((l) => ({
          letterChar: l.char, elementId: l.elementId,
          shape: { hitbox: l.hitbox, anchoMm: l.anchoMm, altoMm: l.altoMm },
        })),
        store.items, shapes, device,
      );
      if (row.length === 0) {
        showToast(t('toasts.T06'), 'error');
        return;
      }
      if (row.length < res.letras.length) showToast(t('toasts.T07'));
      store.addBatch(
        row.map((l) => ({
          instanceId: newInstanceId(), elementId: l.elementId, xMm: l.xMm, yMm: l.yMm,
          rotationDeg: 0, letterChar: l.letterChar,
        })),
      );
      setLettersText('');
    } catch (e) {
      if (e instanceof ApiClientError && e.code === 'LETTERS_EMPTY') showToast(t('toasts.T08'), 'error');
      else showToast(t('toasts.T15'), 'error');
    }
  };

  // ---------- guardado (SS7.10) ----------
  const doSave = async (asCopy = false): Promise<string | null> => {
    const s = useEditorStore.getState();
    if (!s.deviceId || !s.variantId) return null;
    if (authStatus !== 'authenticated') {
      writeDraftDebounced({
        designId: s.designId, nombre: s.nombre, deviceId: s.deviceId, variantId: s.variantId,
        items: s.items, pendingSave: true, updatedAt: Date.now(),
      });
      setAuthPrompt(true);
      return null;
    }
    setSaving(true);
    store.setStatus('saving');
    try {
      const payload = {
        nombre: s.nombre, deviceId: s.deviceId, caseVariantId: s.variantId,
        elementos: s.items, updatedAt: s.serverUpdatedAt ?? undefined,
      };
      const design =
        s.designId && !asCopy
          ? await api<{ id: string; updatedAt: string }>(`/api/designs/${s.designId}`, {
              method: 'PUT', body: JSON.stringify(payload),
            })
          : await api<{ id: string; updatedAt: string }>('/api/designs', {
              method: 'POST', body: JSON.stringify(payload),
            });
      store.setSaved(design.id, design.updatedAt);
      clearDraft();
      void uploadThumbnail(design.id);
      showToast(t('toasts.T01'), 'success');
      return design.id;
    } catch (e) {
      if (e instanceof ApiClientError && e.code === 'DESIGN_CONFLICT') {
        setConflict({ serverUpdatedAt: (e.detail as { updatedAt?: string } | undefined)?.updatedAt ?? '' });
      } else if (e instanceof ApiClientError && e.code.startsWith('DESIGN_')) {
        showToast(t('toasts.T05'), 'error');
      } else {
        showToast(t('toasts.T15'), 'error');
      }
      return null;
    } finally {
      setSaving(false);
      store.setStatus(hasExpired ? 'resolving-expired' : 'ready');
    }
  };

  const uploadThumbnail = async (id: string) => {
    try {
      // Vista trasera pura para la captura (SS7.10)
      setSnapTarget('trasera');
      await new Promise((r) => setTimeout(r, 500));
      const canvas = viewerRef.current?.querySelector('canvas');
      if (!canvas) return;
      const blob = await captureThumbnail(canvas);
      const { uploadUrl, publicUrl } = await api<{ uploadUrl: string; publicUrl: string }>(
        `/api/designs/${id}/thumbnail-url`, { method: 'POST' },
      );
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/webp' }, body: blob });
      await api(`/api/designs/${id}/thumbnail-confirm`, {
        method: 'POST', body: JSON.stringify({ publicUrl }),
      });
    } catch {
      // best-effort
    }
  };

  const addToCart = async () => {
    if (hasExpired) {
      showToast(t('toasts.T10'), 'error');
      return;
    }
    let id = store.designId;
    if (!id || store.dirty) id = await doSave();
    if (!id) return;
    try {
      await api('/api/cart', { method: 'POST', body: JSON.stringify({ designId: id }) });
      showToast(t('toasts.T02'), 'success');
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  const shareLink = async () => {
    let id = store.designId;
    if (!id || store.dirty) id = await doSave();
    if (!id) return;
    try {
      const d = await api<{ shareToken: string }>(`/api/designs/${id}`);
      await navigator.clipboard.writeText(`${window.location.origin}/d/${d.shareToken}`);
      showToast(t('toasts.T03'), 'success');
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  const shareImage = async () => {
    const canvas = viewerRef.current?.querySelector('canvas');
    if (!canvas) return;
    setSnapTarget(null);
    // Vista tres cuartos para la imagen (SS16.1)
    if (controlsRef.current) {
      controlsRef.current.setAzimuthalAngle(35 * DEG);
      controlsRef.current.setPolarAngle(80 * DEG);
      controlsRef.current.update();
    }
    await new Promise((r) => setTimeout(r, 350));
    const { composeShareImage, shareOrDownload } = await import('./shareImage');
    try {
      const blob = await composeShareImage(canvas, store.nombre);
      await shareOrDownload(blob, `${store.nombre.replace(/\s+/g, '-').toLowerCase()}.webp`);
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  // ---------- render ----------
  if (!webgl) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-sm text-[15px] font-medium">{t('toasts.T14')}</p>
        <img src="/renders/cases/silicona-soft.webp" alt="" className="w-40 rounded-card" />
      </div>
    );
  }

  const loading = store.status === 'loading-assets';
  const categoryTabs = [
    ...CATEGORY_ORDER.map((c) => ({ id: c, label: t(`editor.categorias.${c}`) })),
    ...(elementsData?.temporada ? [{ id: 'temporada', label: `${t('editor.categorias.temporada')}: ${elementsData.temporada.nombre}` }] : []),
  ];
  const tabElements = elementsData?.porCategoria[activeTab] ?? [];
  const viewerItems = ghost ? [...store.items, ghost] : store.items;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg" style={{ paddingBottom: SHEET_HEIGHTS_PX[sheetPos] }}>
      {/* Barra superior (SS7.1) */}
      <div className="flex h-14 items-center justify-between gap-2 border-b border-border bg-surface px-2">
        <button
          type="button"
          aria-label={t('common.nav.volver')}
          onClick={() => router.back()}
          className="flex h-11 w-11 items-center justify-center rounded-control text-text-soft transition-colors hover:bg-surface-2"
        >
          <ArrowLeft size={20} aria-hidden />
        </button>
        {renaming ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              setRenaming(false);
            }}
          >
            <input
              autoFocus
              aria-label={t('editor.renombrar')}
              value={store.nombre}
              onChange={(e) => store.setNombre(e.target.value)}
              maxLength={40}
              className="h-9 w-full rounded-control border border-border px-3 text-[15px] font-medium outline-none focus:border-pink-500"
            />
            <button type="submit" aria-label={t('common.acciones.aceptar')} className="p-2 text-pink-500">
              <Check size={18} aria-hidden />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="flex min-w-0 items-center gap-1.5 rounded-control px-2 py-1 transition-colors hover:bg-surface-2"
          >
            <span className="truncate font-display text-[17px] font-semibold">{store.nombre}</span>
            <Pencil size={14} className="shrink-0 text-text-soft" aria-hidden />
          </button>
        )}
        <button
          type="button"
          aria-label={t('common.nav.menu')}
          onClick={() => setMenuOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-control text-text-soft transition-colors hover:bg-surface-2"
        >
          <MoreHorizontal size={20} aria-hidden />
        </button>
      </div>

      {/* Visor */}
      <div ref={viewerRef} className="relative min-h-0 flex-1 touch-none">
        {device && currentVariant && currentCase && (
          <Viewer3D
            device={device}
            material={currentCase.material}
            colorHex={currentVariant.colorHex}
            items={viewerItems}
            catalog={catalog}
            visualStates={visualStates}
            showGrid={showGrid}
            guides={guides}
            snapTarget={snapTarget}
            onSnapReached={onSnapReached}
            onCameraChange={setCameraState}
            onItemPointerDown={onItemPointerDown}
            onPlanePointerMove={onPlanePointerMove}
            onBackgroundTap={() => {
              if (!dragRef.current && !twistRef.current) store.select(null);
            }}
            controlsRef={(c) => {
              controlsRef.current = c;
            }}
          />
        )}
        <p className="sr-only" aria-live="polite">
          {currentCase && t('editor.accesibilidad.visor', { nombre: `${currentCase.nombre} ${currentVariant?.colorNombre ?? ''}`, n: store.items.length })}
        </p>

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg">
            <span className="wordmark text-lg text-text">Cute Cases</span>
            <div className="h-1 w-48 overflow-hidden rounded bg-surface-2">
              <div className="skeleton-shimmer h-full w-full" />
            </div>
            <p className="text-[13px] text-text-soft">{t('editor.preparando')}</p>
          </div>
        )}
        {elementsError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg">
            <p className="text-[15px]">{t('toasts.T15')}</p>
            <Button variant="secondary" onClick={() => refetchElements()}>
              {t('common.acciones.reintentar')}
            </Button>
          </div>
        )}

        {/* Chips de vista (SS7.3) */}
        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
          {(['trasera', 'lateral-izq', 'lateral-der'] as SnapView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSnapTarget(v)}
              className={`rounded-control border px-3 py-1.5 text-[13px] font-medium shadow-1 transition-colors ${
                activeSnap === v
                  ? 'border-pink-300 bg-pink-100 text-pink-700'
                  : 'border-border bg-surface text-text-soft hover:text-text'
              }`}
            >
              {t(`editor.vistas.${v === 'trasera' ? 'trasera' : v === 'lateral-izq' ? 'lateralIzq' : 'lateralDer'}`)}
            </button>
          ))}
        </div>

        {/* Tooltip de rotacion (SS7.6) */}
        {rotationTooltip !== null && (
          <div className="tabular absolute left-1/2 top-4 -translate-x-1/2 rounded-control bg-text px-2.5 py-1 text-[13px] font-medium text-white">
            {rotationTooltip}&deg;
          </div>
        )}

        {/* Zona de papelera durante drag (SS7.6) */}
        {(dragRef.current?.moved || ghost) && (
          <div
            id="cc-trash-zone"
            className={`absolute bottom-14 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border transition-all ${
              trashActive
                ? 'h-16 w-16 border-error bg-error-bg text-error'
                : 'h-[52px] w-[52px] border-border bg-surface text-text-soft'
            }`}
          >
            <Trash2 size={22} aria-hidden />
          </div>
        )}

        {/* Panel contextual del seleccionado (SS7.6, alternativa no gestual) */}
        {selected && selectedElement && (
          <div className="absolute right-2 top-2 flex w-[168px] flex-col gap-2 rounded-card border border-border bg-surface p-2.5 shadow-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[13px] font-medium">{selectedElement.nombre}</span>
              <span className="tabular shrink-0 text-[13px] text-text-soft">
                {formatCentimos(selectedElement.precioCentimos)}
              </span>
            </div>
            {selectedExpired ? (
              <>
                <Badge variant="noDisponible">{t('common.badges.noDisponible')}</Badge>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setReplacingId(selected.instanceId);
                    setSheetPos('full');
                  }}
                >
                  {t('common.acciones.sustituir')}
                </Button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1">
                  <span />
                  <NudgeButton label={t('editor.accesibilidad.arriba')} onNudge={() => nudge(0, -1)}>
                    <ArrowUp size={15} aria-hidden />
                  </NudgeButton>
                  <span />
                  <NudgeButton label={t('editor.accesibilidad.izquierda')} onNudge={() => nudge(-1, 0)}>
                    <ArrowLeft size={15} aria-hidden />
                  </NudgeButton>
                  <button
                    type="button"
                    aria-label={t('common.acciones.centrar')}
                    onClick={centerSelected}
                    className="flex h-9 items-center justify-center rounded-control border border-border text-text-soft hover:text-text"
                  >
                    <Crosshair size={15} aria-hidden />
                  </button>
                  <NudgeButton label={t('editor.accesibilidad.derecha')} onNudge={() => nudge(1, 0)}>
                    <ArrowRightIcon size={15} aria-hidden />
                  </NudgeButton>
                  <span />
                  <NudgeButton label={t('editor.accesibilidad.abajo')} onNudge={() => nudge(0, 1)}>
                    <ArrowDown size={15} aria-hidden />
                  </NudgeButton>
                  <span />
                </div>
                <label className="flex items-center gap-1.5">
                  <RotateCw size={14} className="shrink-0 text-text-soft" aria-hidden />
                  <input
                    type="number"
                    aria-label={t('editor.accesibilidad.rotarElemento')}
                    value={Math.round(selected.rotationDeg)}
                    onChange={(e) => rotateTo(Number(e.target.value))}
                    className="tabular h-8 w-full rounded-control border border-border px-2 text-center text-[13px] outline-none focus:border-pink-500"
                  />
                </label>
              </>
            )}
            <button
              type="button"
              aria-label={t('editor.accesibilidad.eliminarElemento')}
              onClick={() => store.removeItem(selected.instanceId)}
              className="flex h-9 items-center justify-center gap-1.5 rounded-control text-[13px] font-medium text-error transition-colors hover:bg-error-bg"
            >
              <Trash2 size={15} aria-hidden />
              {t('common.acciones.eliminar')}
            </button>
          </div>
        )}
      </div>

      {/* Barra de precio y acciones (SS7.1) */}
      <div className="flex items-center justify-between gap-2 border-t border-border bg-surface px-3 py-2">
        <div className="flex items-center gap-1">
          <PriceTag centimos={totalCentimos} onClick={() => setBreakdownOpen(true)} />
          <button
            type="button"
            aria-label={t('common.acciones.deshacer')}
            disabled={store.history.past.length === 0}
            onClick={store.undo}
            className="flex h-10 w-10 items-center justify-center rounded-control text-text-soft transition-colors hover:bg-surface-2 disabled:opacity-30"
          >
            <Undo2 size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t('common.acciones.rehacer')}
            disabled={store.history.future.length === 0}
            onClick={store.redo}
            className="flex h-10 w-10 items-center justify-center rounded-control text-text-soft transition-colors hover:bg-surface-2 disabled:opacity-30"
          >
            <Redo2 size={18} aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="md" loading={saving} onClick={() => void doSave()}>
            {t('common.acciones.guardar')}
          </Button>
          <button
            type="button"
            aria-label={t('common.acciones.compartir')}
            onClick={() => setShareOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-control border border-border text-text-soft transition-colors hover:text-text"
          >
            <Share2 size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t('common.acciones.anadirCesta')}
            disabled={hasExpired}
            title={hasExpired ? t('toasts.T10') : undefined}
            onClick={() => void addToCart()}
            className="flex h-10 w-10 items-center justify-center rounded-control border border-border text-text-soft transition-colors hover:text-text disabled:opacity-40"
          >
            <ShoppingBag size={18} aria-hidden />
          </button>
        </div>
      </div>

      {/* BottomSheet de elementos (SS7.1) */}
      <BottomSheet
        position={sheetPos}
        onPositionChange={setSheetPos}
        header={
          <Tabs
            tabs={categoryTabs}
            active={activeTab}
            onChange={(id) => {
              setActiveTab(id);
              if (sheetPos === 'collapsed') setSheetPos('half');
            }}
            label="Categorias"
          />
        }
      >
        {!backFacing && (
          <button
            type="button"
            onClick={() => setSnapTarget('trasera')}
            className="mb-3 w-full rounded-card border border-border bg-surface-2 px-4 py-3 text-center text-[13px] font-medium text-text-soft"
          >
            {t('toasts.T11')}
          </button>
        )}
        <div className={backFacing ? '' : 'pointer-events-auto opacity-50'}>
          {activeTab === 'letras' && (
            <form
              className="mb-3 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void createLetters();
              }}
            >
              <div className="flex gap-1.5">
                {(['letras-oro', 'letras-sticker'] as const).map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setLettersJuego(j)}
                    aria-pressed={lettersJuego === j}
                    className={`h-8 rounded-control border px-3 text-[13px] font-medium ${
                      lettersJuego === j ? 'border-pink-300 bg-pink-100 text-pink-700' : 'border-border text-text-soft'
                    }`}
                  >
                    {t(j === 'letras-oro' ? 'editor.letras.juegoOro' : 'editor.letras.juegoSticker')}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <Input
                  label={t('editor.letras.label')}
                  placeholder={t('editor.letras.placeholder')}
                  value={lettersText}
                  onChange={(e) => setLettersText(e.target.value)}
                  maxLength={14}
                  className="flex-1"
                />
                <Button type="submit">{t('editor.letras.crear')}</Button>
              </div>
            </form>
          )}
          <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
            {tabElements.map((el) => (
              <button
                key={el.id}
                type="button"
                onClick={() => addElement(el)}
                onPointerDown={(e) => {
                  // Regla 9: drag desde miniatura = modo arrastre con fantasma
                  if (!backFacing || !device) return;
                  const startY = e.clientY;
                  const startX = e.clientX;
                  const onMove = (ev: PointerEvent) => {
                    if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 14 && !ghost) {
                      const id = `ghost-${newInstanceId()}`;
                      const g: PlacedItem = {
                        instanceId: id, elementId: el.id,
                        xMm: device.anchoMm / 2, yMm: device.altoMm / 2, rotationDeg: 0,
                        letterChar: el.letraChar ?? undefined,
                      };
                      setGhost(g);
                      dragRef.current = {
                        id, pointerId: e.pointerId, startX, startY, moved: true,
                        isTouch: e.pointerType === 'touch',
                        lastValid: { xMm: g.xMm, yMm: g.yMm, rotationDeg: 0 },
                        hadValid: false, isGhost: true,
                      };
                      if (controlsRef.current) controlsRef.current.enabled = false;
                      window.removeEventListener('pointermove', onMove);
                    }
                  };
                  window.addEventListener('pointermove', onMove);
                  window.addEventListener('pointerup', () => window.removeEventListener('pointermove', onMove), { once: true });
                }}
                className="flex flex-col items-center gap-1 rounded-thumb border border-border bg-surface p-2 transition-colors hover:border-pink-300"
              >
                <ElementThumb element={el} />
                <span className="w-full truncate text-center text-xs font-medium">
                  {el.letraChar ?? el.nombre}
                </span>
                <span className="tabular text-xs font-semibold text-text-soft">
                  {formatCentimos(el.precioCentimos)}
                </span>
                <Badge variant={el.tipo === 'charm3d' ? 'tresD' : 'sticker'}>
                  {el.tipo === 'charm3d' ? t('common.badges.tresD') : t('common.badges.sticker')}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Menu (SS7.1) */}
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title={t('common.nav.menu')}>
        <div className="flex flex-col gap-2">
          <label className="flex h-11 items-center justify-between rounded-control border border-border px-3 text-[15px] font-medium">
            {t('editor.menu.cuadricula')}
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="h-4 w-4 accent-pink-700"
            />
          </label>
          {currentCase && (
            <div className="rounded-control border border-border p-3">
              <p className="mb-2 text-[13px] font-medium text-text-soft">{currentCase.nombre}</p>
              <div className="flex gap-2">
                {currentCase.variantes
                  .filter((v) => v.disponible)
                  .map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      aria-label={v.colorNombre}
                      aria-pressed={v.id === store.variantId}
                      onClick={() => store.setVariant(v)}
                      className={`h-8 w-8 rounded-full border-2 ${
                        v.id === store.variantId ? 'border-pink-500 ring-2 ring-pink-500/30' : 'border-border'
                      }`}
                      style={{ backgroundColor: v.colorHex }}
                    />
                  ))}
              </div>
            </div>
          )}
          <Button
            variant="secondary"
            disabled={!store.designId}
            onClick={async () => {
              if (!store.designId) return;
              try {
                await api(`/api/designs/${store.designId}/duplicate`, { method: 'POST' });
                showToast(t('toasts.T24'), 'success');
              } catch {
                showToast(t('toasts.T15'), 'error');
              }
              setMenuOpen(false);
            }}
          >
            {t('editor.menu.duplicar')}
          </Button>
          <Button variant="secondary" onClick={() => { setMenuOpen(false); setHelpOpen(true); }}>
            {t('editor.menu.ayuda')}
          </Button>
        </div>
      </Modal>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title={t('editor.menu.ayuda')}>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px] text-text-soft">
          <li>Arrastra en una zona vacia para girar la funda.</li>
          <li>Arrastra una pieza para moverla; el rojo indica que no cabe.</li>
          <li>Con una pieza seleccionada, gira con dos dedos o con el campo de grados.</li>
          <li>El tamano de las piezas es fijo: se mueven, giran y eliminan.</li>
        </ul>
      </Modal>

      {/* Desglose (SS7.9) */}
      <Modal open={breakdownOpen} onClose={() => setBreakdownOpen(false)} title={t('editor.desglose')}>
        {breakdown && (
          <ul className="flex flex-col gap-2">
            {breakdown.lines.map((line, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="flex min-w-0 items-center gap-2">
                  {line.elementId && catalog.get(line.elementId) && (
                    <ElementThumb element={catalog.get(line.elementId)!} size={32} />
                  )}
                  <span className="truncate">{line.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular font-medium">{formatCentimos(line.centimos)}</span>
                  {line.instanceId && (
                    <button
                      type="button"
                      aria-label={t('common.acciones.eliminar')}
                      onClick={() => store.removeItem(line.instanceId!)}
                      className="text-error"
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  )}
                </span>
              </li>
            ))}
            <li className="mt-1 flex justify-between border-t border-border pt-2 text-[15px] font-semibold">
              <span>{t('common.precio.total')}</span>
              <span className="tabular">{formatCentimos(breakdown.totalCentimos)}</span>
            </li>
          </ul>
        )}
      </Modal>

      {/* Compartir (SS16.2) */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={t('common.acciones.compartir')}>
        <div className="flex flex-col gap-2">
          <Button onClick={() => { setShareOpen(false); void shareImage(); }}>
            {t('regalo.compartirImagen')}
          </Button>
          <Button variant="secondary" onClick={() => { setShareOpen(false); void shareLink(); }}>
            {t('regalo.compartirEnlace')}
          </Button>
        </div>
      </Modal>

      {/* Caducados (SS7.8) */}
      <Modal open={expiredModal} onClose={() => setExpiredModal(false)} title={t('editor.caducadosTitulo')}>
        <p className="mb-3 text-[13px] text-text-soft">{t('toasts.T09')}</p>
        <ul className="mb-4 flex flex-col gap-1.5">
          {store.items
            .filter((i) => expiredIds.has(i.elementId))
            .map((i) => {
              const el = catalog.get(i.elementId);
              return (
                <li key={i.instanceId} className="flex items-center justify-between rounded-control bg-surface-2 px-3 py-2 text-[13px]">
                  <span>{i.letterChar ? `${el?.nombre ?? ''} "${i.letterChar}"` : (el?.nombre ?? t('common.badges.noDisponible'))}</span>
                  <span className="tabular text-text-soft">{el ? formatCentimos(el.precioCentimos) : ''}</span>
                </li>
              );
            })}
        </ul>
        <Button onClick={() => setExpiredModal(false)}>{t('common.acciones.revisar')}</Button>
      </Modal>

      {/* Borrador recuperable (T-13) */}
      <Modal open={Boolean(draftPrompt)} onClose={() => setDraftPrompt(null)} title={t('toasts.T13')} dismissable={false}>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              const d = draftPrompt!;
              store.init({
                designId: d.designId, nombre: d.nombre, deviceId: d.deviceId,
                variantId: d.variantId, items: d.items,
              });
              setDraftPrompt(null);
            }}
          >
            {t('common.acciones.continuar')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              clearDraft();
              setDraftPrompt(null);
              router.replace('/fundas');
            }}
          >
            {t('common.acciones.empezarDeCero')}
          </Button>
        </div>
      </Modal>

      {/* Guardar sin sesion (T-12, SS15.4) */}
      <Modal open={authPrompt} onClose={() => setAuthPrompt(false)} title={t('toasts.T12')}>
        <div className="flex flex-col gap-2">
          <Button onClick={() => router.push('/registro?next=/editor')}>{t('auth.registrarse')}</Button>
          <Button variant="secondary" onClick={() => router.push('/login?next=/editor')}>
            {t('auth.entrar')}
          </Button>
        </div>
      </Modal>

      {/* Conflicto (T-19, SS7.10) */}
      <Modal open={Boolean(conflict)} onClose={() => setConflict(null)} title={t('editor.conflictoTitulo')} dismissable={false}>
        <p className="mb-4 text-[13px] text-text-soft">{t('toasts.T19')}</p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={async () => {
              const s = useEditorStore.getState();
              if (conflict?.serverUpdatedAt) {
                useEditorStore.setState({ serverUpdatedAt: conflict.serverUpdatedAt });
              } else if (s.designId) {
                const fresh = await api<{ updatedAt: string }>(`/api/designs/${s.designId}`);
                useEditorStore.setState({ serverUpdatedAt: fresh.updatedAt });
              }
              setConflict(null);
              void doSave();
            }}
          >
            {t('common.acciones.sobrescribir')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setConflict(null);
              void doSave(true);
            }}
          >
            {t('common.acciones.guardarCopia')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** Flecha de desplazamiento fino: 1 mm por pulsacion, mantenida acelera (SS7.6). */
function NudgeButton({
  label,
  onNudge,
  children,
}: {
  label: string;
  onNudge: () => void;
  children: React.ReactNode;
}) {
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timeout.current) clearTimeout(timeout.current);
    if (interval.current) clearInterval(interval.current);
    timeout.current = null;
    interval.current = null;
  };
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onNudge}
      onPointerDown={() => {
        timeout.current = setTimeout(() => {
          interval.current = setInterval(onNudge, 200); // 5 mm/s (SS7.6)
        }, 400);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      className="flex h-9 items-center justify-center rounded-control border border-border text-text-soft hover:text-text"
    >
      {children}
    </button>
  );
}
