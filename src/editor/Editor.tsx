'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import type { ThreeEvent } from '@react-three/fiber';
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, Crosshair, MoreHorizontal,
  Pencil, Redo2, RotateCw, Share2, ShoppingBag, Trash2, Undo2,
} from 'lucide-react';
import {
  Badge, BottomSheet, Button, Confetti, Input, Modal, PriceTag, Tabs, useToast,
  type SheetPosition,
} from '@/components/ui';
import { api, ApiClientError } from '@/lib/api-client';
import { getRememberedDevice } from '@/lib/deviceStorage';
import {
  DEFAULT_SAFETY_MARGIN_MM, findFreeSpot, placeLettersRow, validatePlacement,
  type CaseGeometry, type ElementInstance, type ElementShape, type Polygon,
} from '@/lib/collision';
import { computeBreakdown, computeTotalCentimos, formatCentimos, type PricedElement } from '@/lib/pricing';
import { CaseViewer, type InstanceVisualState } from './CaseViewer';
import { newInstanceId, useEditorStore } from './store';
import { clearDraft, readDraft, writeDraftDebounced, type LocalDraft } from './autosave';
import { captureThumbnail, composeStoryImage, shareOrDownload } from './shareImage';
import { hasWebGL2 } from './webgl';
import { VIEWS, viewAllowsPlacement, type CatalogElement, type DeviceGeometry, type ViewName } from './types';

const CATEGORIES = [
  'letras', 'corazones', 'lazos', 'flores', 'frutas', 'animales', 'estrellas', 'cadenas',
] as const;

interface DevicesResponse {
  generaciones: Record<
    string,
    { id: string; nombre: string; anchoMm: number; altoMm: number; radioEsquinaMm: number; cameraZone: Polygon }[]
  >;
}

interface ElementsResponse {
  porCategoria: Record<string, (CatalogElement & { hitbox: Polygon; precioCentimos: number })[]>;
  temporada: { id: string; nombre: string; emoji: string } | null;
}

interface CasesResponse {
  fundas: {
    id: string; slug: string; nombre: string; material: string;
    variantes: { id: string; colorNombre: string; colorHex: string; precioCentimos: number; disponible: boolean }[];
  }[];
}

/** Editor 3D completo (§6). */
export function Editor({ designId }: { designId?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useSession();
  const { showToast } = useToast();
  const store = useEditorStore();

  const [webgl] = useState(() => (typeof window === 'undefined' ? true : hasWebGL2()));
  const [view, setView] = useState<ViewName>('trasera');
  const [zoom, setZoom] = useState(1);
  const [sheetPos, setSheetPos] = useState<SheetPosition>('half');
  const [activeTab, setActiveTab] = useState<string>(params.get('tab') === 'temporada' ? 'temporada' : 'corazones');
  const [showGrid, setShowGrid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [lettersText, setLettersText] = useState('');
  const [saving, setSaving] = useState(false);
  const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set());
  const [expiredModal, setExpiredModal] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState<LocalDraft | null>(null);
  const [authPrompt, setAuthPrompt] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Gestos en curso
  const dragRef = useRef<{
    instanceId: string;
    pointerId: number;
    isNew: boolean;
    hadValid: boolean;
    lastValid: { xMm: number; yMm: number; rotacionGrados: number };
    moved: boolean;
    isTouch: boolean;
  } | null>(null);
  const twistRef = useRef<{ instanceId: string; startAngle: number; startRotation: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);
  const swipeRef = useRef<{ x: number; y: number; onEmpty: boolean } | null>(null);
  const lastTapRef = useRef(0);
  const [liveInvalid, setLiveInvalid] = useState<Map<string, InstanceVisualState>>(new Map());
  const [guides, setGuides] = useState<{ v?: number | null; h?: number | null }>({});

  // ---------- Datos ----------
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<DevicesResponse>('/api/devices'),
  });
  const { data: elementsData, isLoading: elementsLoading, isError: elementsError, refetch: refetchElements } = useQuery({
    queryKey: ['elements'],
    queryFn: () => api<ElementsResponse>('/api/elements'),
  });

  const rememberedDevice = useMemo(() => getRememberedDevice(), []);
  const allDevices = useMemo(
    () => (devicesData ? Object.values(devicesData.generaciones).flat() : []),
    [devicesData],
  );
  const device: DeviceGeometry | null = useMemo(() => {
    const id = store.deviceId ?? rememberedDevice?.id;
    return allDevices.find((d) => d.id === id) ?? null;
  }, [allDevices, store.deviceId, rememberedDevice]);

  const { data: casesData } = useQuery({
    queryKey: ['cases', device?.id],
    queryFn: () => api<CasesResponse>(`/api/cases?deviceId=${device!.id}`),
    enabled: Boolean(device),
  });

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
    catalog.forEach((el, id) => {
      map.set(id, {
        hitbox: (el.hitbox as Polygon | undefined) ?? [],
        anchoMm: el.anchoMm,
        altoMm: el.altoMm,
      });
    });
    return map;
  }, [catalog]);

  const priced = useMemo(() => {
    const map = new Map<string, PricedElement>();
    catalog.forEach((el, id) => {
      map.set(id, { precioCentimos: el.precioCentimos ?? 0, nombre: el.nombre });
    });
    return map;
  }, [catalog]);

  const currentVariant = useMemo(() => {
    for (const funda of casesData?.fundas ?? []) {
      const v = funda.variantes.find((x) => x.id === store.caseVariantId);
      if (v) return { ...v, material: funda.material, nombre: funda.nombre, slug: funda.slug };
    }
    return null;
  }, [casesData, store.caseVariantId]);

  const geometry: CaseGeometry | null = useMemo(
    () =>
      device
        ? {
            anchoMm: device.anchoMm,
            altoMm: device.altoMm,
            radioEsquinaMm: device.radioEsquinaMm,
            cameraZone: device.cameraZone,
          }
        : null,
    [device],
  );

  // ---------- Inicialización: diseño guardado, borrador local o funda nueva ----------
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || allDevices.length === 0) return;

    const boot = async () => {
      initialized.current = true;
      if (designId) {
        try {
          const design = await api<{
            id: string; nombre: string; deviceId: string; caseVariantId: string;
            elementos: ElementInstance[]; availability: { disponible: boolean; caducadosIds: string[] };
          }>(`/api/designs/${designId}`);
          store.init({
            designId: design.id,
            nombre: design.nombre,
            deviceId: design.deviceId,
            caseVariantId: design.caseVariantId,
            instances: design.elementos.map((e) => ({ ...e, instanceId: e.instanceId ?? newInstanceId() })),
          });
          if (design.availability.caducadosIds.length > 0) {
            setExpiredIds(new Set(design.availability.caducadosIds));
            setExpiredModal(true); // E-09 (§4.5)
          }
          return;
        } catch {
          showToast(t('toasts.E15'), 'error');
        }
      }
      const draft = readDraft();
      const variantParam = params.get('variant');
      const deviceIdWanted = rememberedDevice?.id ?? draft?.deviceId;
      if (draft && !variantParam) {
        if (draft.pendingSave) {
          // Volvemos del flujo OAuth: rehidratar y ejecutar el guardado pendiente (§5.7)
          store.init({
            designId: draft.designId,
            nombre: draft.nombre,
            deviceId: draft.deviceId,
            caseVariantId: draft.caseVariantId,
            instances: draft.instances,
          });
          return;
        }
        setDraftPrompt(draft); // E-13
        return;
      }
      if (deviceIdWanted && variantParam) {
        store.init({
          designId: null,
          nombre: t('editor.nombrePorDefecto'),
          deviceId: deviceIdWanted,
          caseVariantId: variantParam,
          instances: [],
        });
        return;
      }
      if (!deviceIdWanted) {
        router.replace('/modelo');
        return;
      }
      if (!variantParam && !draft) {
        router.replace('/fundas');
      }
    };
    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDevices, designId]);

  // Guardado pendiente tras OAuth (§5.7)
  const pendingSaveDone = useRef(false);
  useEffect(() => {
    const draft = readDraft();
    if (
      status === 'authenticated' &&
      draft?.pendingSave &&
      !pendingSaveDone.current &&
      store.deviceId &&
      catalog.size > 0
    ) {
      pendingSaveDone.current = true;
      void doSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, store.deviceId, catalog.size]);

  // ---------- Autosave local (debounce 500 ms, §6.9) ----------
  useEffect(() => {
    if (!store.deviceId || !store.caseVariantId) return;
    writeDraftDebounced({
      designId: store.designId,
      nombre: store.nombre,
      deviceId: store.deviceId,
      caseVariantId: store.caseVariantId,
      instances: store.instances,
      updatedAt: Date.now(),
    });
  }, [store.designId, store.nombre, store.deviceId, store.caseVariantId, store.instances]);

  // ---------- Precio en tiempo real (§6.7) ----------
  const totalCentimos = useMemo(() => {
    if (!currentVariant) return 0;
    try {
      return computeTotalCentimos(currentVariant.precioCentimos, store.instances, priced);
    } catch {
      return currentVariant.precioCentimos;
    }
  }, [currentVariant, store.instances, priced]);

  const breakdown = useMemo(() => {
    if (!currentVariant) return null;
    return computeBreakdown(
      `${currentVariant.nombre} · ${currentVariant.colorNombre}`,
      currentVariant.precioCentimos,
      store.instances.filter((i) => priced.has(i.elementId)),
      priced,
    );
  }, [currentVariant, store.instances, priced]);

  // ---------- Validación visual ----------
  const visualStates = useMemo(() => {
    const map = new Map<string, InstanceVisualState>();
    for (const inst of store.instances) {
      const state: InstanceVisualState = {};
      if (inst.instanceId === store.selectedId) state.selected = true;
      if (expiredIds.has(inst.elementId)) state.expired = true;
      const live = liveInvalid.get(inst.instanceId);
      if (live) Object.assign(state, live);
      if (Object.keys(state).length > 0) map.set(inst.instanceId, state);
    }
    return map;
  }, [store.instances, store.selectedId, expiredIds, liveInvalid]);

  const hasExpired = expiredIds.size > 0 &&
    store.instances.some((i) => expiredIds.has(i.elementId));

  // ---------- Helpers de colocación ----------
  const validate = useCallback(
    (inst: ElementInstance): boolean => {
      if (!geometry) return false;
      const others = store.instances.filter((i) => i.instanceId !== inst.instanceId);
      const res = validatePlacement(inst, others, shapes, geometry, DEFAULT_SAFETY_MARGIN_MM);
      const map = new Map<string, InstanceVisualState>();
      if (!res.valid) {
        map.set(inst.instanceId, { invalid: true });
        for (const r of res.reasons) {
          if (r.type === 'overlap') map.set(r.otherInstanceId, { collidedWith: true });
        }
      }
      setLiveInvalid(map);
      return res.valid;
    },
    [geometry, store.instances, shapes],
  );

  /** Tap en miniatura: añadir al centro libre (espiral) o E-06 (§6.4). */
  const addElement = (el: CatalogElement) => {
    if (!geometry) return;
    if (!viewAllowsPlacement(view)) {
      showToast(t('toasts.E11'));
      return;
    }
    const shape = shapes.get(el.id);
    if (!shape) return;
    const spot = findFreeSpot(el.id, shape, store.instances, shapes, geometry);
    if (!spot) {
      showToast(t('toasts.E06'), 'error');
      return;
    }
    store.addInstance({
      instanceId: newInstanceId(),
      elementId: el.id,
      xMm: spot.x,
      yMm: spot.y,
      rotacionGrados: 0,
      ...(el.letraChar ? { letraChar: el.letraChar } : {}),
    });
  };

  /** Generador de letras (§4.4). */
  const createLetters = async () => {
    if (!geometry || lettersText.trim() === '') return;
    try {
      const res = await api<{
        letras: { letraChar: string; elementId: string; anchoMm: number; altoMm: number; hitbox: Polygon }[];
        filtered: boolean;
      }>('/api/letters/expand', { method: 'POST', body: JSON.stringify({ texto: lettersText }) });
      if (res.filtered) showToast(t('toasts.E08'));
      if (res.letras.length === 0) return;
      const row = placeLettersRow(
        res.letras.map((l) => ({
          letraChar: l.letraChar,
          elementId: l.elementId,
          shape: { hitbox: l.hitbox, anchoMm: l.anchoMm, altoMm: l.altoMm },
        })),
        store.instances,
        shapes,
        geometry,
      );
      if (row.length === 0) {
        showToast(t('toasts.E06'), 'error');
        return;
      }
      if (row.length < res.letras.length) showToast(t('toasts.E07'));
      // Un lote = una entrada de historial (§6.8, caso §18.15)
      store.addBatch(
        row.map((l) => ({
          instanceId: newInstanceId(),
          elementId: l.elementId,
          xMm: l.xMm,
          yMm: l.yMm,
          rotacionGrados: 0,
          letraChar: l.letraChar,
        })),
      );
      setLettersText('');
    } catch {
      showToast(t('toasts.E15'), 'error');
    }
  };

  // ---------- Gestos sobre el visor (§6.4) ----------
  const onElementPointerDown = (instanceId: string, e: ThreeEvent<PointerEvent>) => {
    if (!viewAllowsPlacement(view)) return;
    const inst = store.instances.find((i) => i.instanceId === instanceId);
    if (!inst) return;
    store.select(instanceId);
    if (expiredIds.has(inst.elementId)) return; // caducados: solo sustituir/eliminar (§4.5)
    store.beginGesture();
    dragRef.current = {
      instanceId,
      pointerId: e.pointerId,
      isNew: false,
      hadValid: true,
      lastValid: { xMm: inst.xMm, yMm: inst.yMm, rotacionGrados: inst.rotacionGrados },
      moved: false,
      isTouch: e.nativeEvent.pointerType === 'touch',
    };
  };

  const onPlanePointerMove = (xMm: number, yMm: number, e: ThreeEvent<PointerEvent>) => {
    const drag = dragRef.current;
    if (!drag || twistRef.current || e.pointerId !== drag.pointerId || !geometry) return;
    drag.moved = true;
    // Offset táctil: el elemento va ~48 px por encima del dedo (§6.4)
    let y = yMm;
    if (drag.isTouch && viewerRef.current) {
      const pxToMm = geometry.altoMm / viewerRef.current.clientHeight;
      y = yMm - 48 * pxToMm * 0.6;
    }
    // Imán suave SOLO de posición, radio 1,5 mm, jamás de rotación (§6.6)
    const centerX = geometry.anchoMm / 2;
    const centerY = geometry.altoMm / 2;
    let x = xMm;
    const g: { v?: number | null; h?: number | null } = {};
    if (Math.abs(x - centerX) < 1.5) {
      x = centerX;
      g.v = centerX;
    }
    if (Math.abs(y - centerY) < 1.5) {
      y = centerY;
      g.h = centerY;
    }
    setGuides(g);
    store.updateInstanceLive(drag.instanceId, { xMm: x, yMm: y });
    const inst = store.instances.find((i) => i.instanceId === drag.instanceId);
    if (inst) {
      const valid = validate({ ...inst, xMm: x, yMm: y });
      if (valid) drag.lastValid = { xMm: x, yMm: y, rotacionGrados: inst.rotacionGrados };
      drag.hadValid = drag.hadValid || valid;
    }
  };

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setGuides({});
    const inst = useEditorStore.getState().instances.find((i) => i.instanceId === drag.instanceId);
    if (!inst || !geometry) {
      setLiveInvalid(new Map());
      return;
    }
    const others = useEditorStore.getState().instances.filter((i) => i.instanceId !== drag.instanceId);
    const valid = validatePlacement(inst, others, shapes, geometry, DEFAULT_SAFETY_MARGIN_MM).valid;
    if (!valid) {
      showToast(t('toasts.E05'), 'error');
      if (drag.isNew && !drag.hadValid) {
        // Recién añadido sin posición válida previa: desaparece (§6.6)
        store.cancelGesture();
        store.removeInstance(drag.instanceId);
      } else {
        // Vuelve a la última posición/rotación válidas (§6.6)
        store.updateInstanceLive(drag.instanceId, drag.lastValid);
        store.commitGesture();
      }
    } else if (drag.moved) {
      store.commitGesture();
    } else {
      store.cancelGesture();
    }
    setLiveInvalid(new Map());
  }, [geometry, shapes, showToast, store, t]);

  // Twist de dos dedos = rotación libre; el componente de escala se IGNORA (§6.4)
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    const getAngle = (touches: TouchList) => {
      const a = touches[0]!;
      const b = touches[1]!;
      return (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI;
    };
    const getDist = (touches: TouchList) => {
      const a = touches[0]!;
      const b = touches[1]!;
      return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    };

    const onTouchStart = (ev: TouchEvent) => {
      if (ev.touches.length === 2) {
        const selected = useEditorStore.getState().selectedId;
        const dragging = dragRef.current;
        if ((dragging || selected) && viewAllowsPlacement(view)) {
          // Pinch/twist sobre elemento seleccionado → SIEMPRE rotación (caso §18.12)
          const id = dragging?.instanceId ?? selected!;
          const inst = useEditorStore.getState().instances.find((i) => i.instanceId === id);
          if (inst && !expiredIds.has(inst.elementId)) {
            store.beginGesture();
            twistRef.current = {
              instanceId: id,
              startAngle: getAngle(ev.touches),
              startRotation: inst.rotacionGrados,
            };
            return;
          }
        }
        // Pinch en zona vacía → zoom 0.8–1.6 (caso §18.13)
        pinchRef.current = { startDist: getDist(ev.touches), startZoom: zoom };
      } else if (ev.touches.length === 1) {
        const touch = ev.touches[0]!;
        swipeRef.current = { x: touch.clientX, y: touch.clientY, onEmpty: !dragRef.current };
        // Doble tap en zona vacía → reset de zoom
        const now = Date.now();
        if (now - lastTapRef.current < 300 && !dragRef.current) {
          setZoom(1);
        }
        lastTapRef.current = now;
      }
    };

    const onTouchMove = (ev: TouchEvent) => {
      if (ev.touches.length === 2 && twistRef.current) {
        const tw = twistRef.current;
        const delta = getAngle(ev.touches) - tw.startAngle;
        let rot = (tw.startRotation + delta) % 360;
        if (rot < 0) rot += 360;
        store.updateInstanceLive(tw.instanceId, { rotacionGrados: rot });
        const inst = useEditorStore.getState().instances.find((i) => i.instanceId === tw.instanceId);
        if (inst) validate({ ...inst, rotacionGrados: rot });
        ev.preventDefault();
      } else if (ev.touches.length === 2 && pinchRef.current) {
        const p = pinchRef.current;
        const ratio = getDist(ev.touches) / p.startDist;
        setZoom(Math.min(1.6, Math.max(0.8, p.startZoom * ratio)));
        ev.preventDefault();
      }
    };

    const onTouchEnd = (ev: TouchEvent) => {
      if (twistRef.current && ev.touches.length < 2) {
        const tw = twistRef.current;
        twistRef.current = null;
        const state = useEditorStore.getState();
        const inst = state.instances.find((i) => i.instanceId === tw.instanceId);
        if (inst && geometry) {
          const others = state.instances.filter((i) => i.instanceId !== tw.instanceId);
          const valid = validatePlacement(inst, others, shapes, geometry, DEFAULT_SAFETY_MARGIN_MM).valid;
          if (!valid) {
            // Rotar hasta colisión: al soltar revierte + E-05 (caso §18.3)
            showToast(t('toasts.E05'), 'error');
            store.cancelGesture();
          } else if (!dragRef.current) {
            store.commitGesture();
          }
        }
        setLiveInvalid(new Map());
      }
      if (pinchRef.current && ev.touches.length < 2) pinchRef.current = null;
      // Swipe horizontal en zona vacía → cambio de vista (§6.2, caso §18.14)
      if (swipeRef.current && ev.touches.length === 0 && !dragRef.current) {
        const sw = swipeRef.current;
        swipeRef.current = null;
        const touch = ev.changedTouches[0];
        if (touch && sw.onEmpty) {
          const dx = touch.clientX - sw.x;
          const dy = touch.clientY - sw.y;
          if (Math.abs(dx) > 60 && Math.abs(dy) < 40) {
            const idx = VIEWS.indexOf(view);
            const next = dx < 0 ? Math.min(idx + 1, VIEWS.length - 1) : Math.max(idx - 1, 0);
            setView(VIEWS[next]!);
          }
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    window.addEventListener('pointerup', endDrag);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('pointerup', endDrag);
    };
  }, [view, zoom, geometry, shapes, expiredIds, endDrag, store, validate, showToast, t]);

  // Teclado (§15): flechas 1 mm, Shift 5 mm, R+flechas rota, Supr elimina, Ctrl+Z/Y
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement | null)?.tagName === 'INPUT') return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        if (ev.shiftKey) store.redo();
        else store.undo();
        return;
      }
      const selected = store.selectedId;
      if (!selected) return;
      const inst = store.instances.find((i) => i.instanceId === selected);
      if (!inst || !geometry) return;
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        store.removeInstance(selected);
        return;
      }
      const step = ev.shiftKey ? 5 : 1;
      let patch: Partial<ElementInstance> | null = null;
      if (ev.key === 'ArrowUp') patch = { yMm: inst.yMm - step };
      if (ev.key === 'ArrowDown') patch = { yMm: inst.yMm + step };
      if (ev.key === 'ArrowLeft') patch = { xMm: inst.xMm - step };
      if (ev.key === 'ArrowRight') patch = { xMm: inst.xMm + step };
      if (patch) {
        ev.preventDefault();
        const candidate = { ...inst, ...patch };
        const others = store.instances.filter((i) => i.instanceId !== selected);
        if (validatePlacement(candidate, others, shapes, geometry, DEFAULT_SAFETY_MARGIN_MM).valid) {
          store.beginGesture();
          store.updateInstanceLive(selected, patch);
          store.commitGesture();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, geometry, shapes]);

  // ---------- Acciones del panel contextual (§6.4 accesible) ----------
  const nudge = (dx: number, dy: number) => {
    const selected = store.selectedId;
    const inst = store.instances.find((i) => i.instanceId === selected);
    if (!inst || !geometry || !selected) return;
    const candidate = { ...inst, xMm: inst.xMm + dx, yMm: inst.yMm + dy };
    const others = store.instances.filter((i) => i.instanceId !== selected);
    if (validatePlacement(candidate, others, shapes, geometry, DEFAULT_SAFETY_MARGIN_MM).valid) {
      store.beginGesture();
      store.updateInstanceLive(selected, { xMm: candidate.xMm, yMm: candidate.yMm });
      store.commitGesture();
    }
  };

  const rotateTo = (deg: number) => {
    const selected = store.selectedId;
    const inst = store.instances.find((i) => i.instanceId === selected);
    if (!inst || !geometry || !selected) return;
    let rot = deg % 360;
    if (rot < 0) rot += 360;
    const candidate = { ...inst, rotacionGrados: rot };
    const others = store.instances.filter((i) => i.instanceId !== selected);
    if (validatePlacement(candidate, others, shapes, geometry, DEFAULT_SAFETY_MARGIN_MM).valid) {
      store.beginGesture();
      store.updateInstanceLive(selected, { rotacionGrados: rot });
      store.commitGesture();
    } else {
      showToast(t('toasts.E05'), 'error');
    }
  };

  /** Botón Centrar (§6.6): eje X; si está ocupado, posición centrada válida más cercana. */
  const centerSelected = () => {
    const selected = store.selectedId;
    const inst = store.instances.find((i) => i.instanceId === selected);
    if (!inst || !geometry || !selected) return;
    const shape = shapes.get(inst.elementId);
    if (!shape) return;
    const others = store.instances.filter((i) => i.instanceId !== selected);
    const centerX = geometry.anchoMm / 2;
    const direct = { ...inst, xMm: centerX };
    if (validatePlacement(direct, others, shapes, geometry, DEFAULT_SAFETY_MARGIN_MM).valid) {
      store.beginGesture();
      store.updateInstanceLive(selected, { xMm: centerX });
      store.commitGesture();
      return;
    }
    const spot = findFreeSpot(inst.elementId, shape, others, shapes, geometry, DEFAULT_SAFETY_MARGIN_MM, {
      x: centerX,
      y: inst.yMm,
    });
    if (spot) {
      store.beginGesture();
      store.updateInstanceLive(selected, { xMm: spot.x, yMm: spot.y });
      store.commitGesture();
    } else {
      showToast(t('toasts.E06'), 'error');
    }
  };

  // ---------- Guardar (§6.9) ----------
  const doSave = async (): Promise<string | null> => {
    if (!store.deviceId || !store.caseVariantId) return null;
    if (hasExpired) {
      showToast(t('toasts.E10'), 'error');
      return null;
    }
    if (status !== 'authenticated') {
      // Marcar guardado pendiente y llevar al auth (§5.7)
      writeDraftDebounced({
        designId: store.designId,
        nombre: store.nombre,
        deviceId: store.deviceId,
        caseVariantId: store.caseVariantId,
        instances: store.instances,
        pendingSave: true,
        updatedAt: Date.now(),
      });
      setAuthPrompt(true);
      return null;
    }
    setSaving(true);
    try {
      const payload = {
        nombre: store.nombre,
        deviceId: store.deviceId,
        caseVariantId: store.caseVariantId,
        elementos: store.instances,
      };
      const wasFirstSave = !store.designId;
      const design = store.designId
        ? await api<{ id: string }>(`/api/designs/${store.designId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await api<{ id: string }>('/api/designs', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
      store.setDesignId(design.id);
      store.markSaved();
      clearDraft();
      // Miniatura: captura del canvas en vista trasera (§6.9)
      const canvas = viewerRef.current?.querySelector('canvas');
      if (canvas) {
        try {
          const imageBase64 = await captureThumbnail(canvas);
          await api(`/api/designs/${design.id}/thumbnail`, {
            method: 'POST',
            body: JSON.stringify({ imageBase64 }),
          });
        } catch {
          // la miniatura es best-effort
        }
      }
      if (wasFirstSave) setConfetti((c) => c + 1);
      showToast(t('toasts.E01'), 'success');
      return design.id;
    } catch (e) {
      if (e instanceof ApiClientError && e.code === 'S-01') showToast(t('errores.S01'), 'error');
      else if (e instanceof ApiClientError && e.code === 'S-02') showToast(t('errores.S02'), 'error');
      else showToast(t('toasts.E15'), 'error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const addToCart = async () => {
    if (hasExpired) {
      showToast(t('toasts.E10'), 'error');
      return;
    }
    let id = store.designId;
    if (!id || store.dirty) id = await doSave();
    if (!id) return;
    try {
      await api('/api/cart', { method: 'POST', body: JSON.stringify({ designId: id }) });
      setConfetti((c) => c + 1);
      showToast(t('toasts.E02'), 'success');
    } catch {
      showToast(t('toasts.E15'), 'error');
    }
  };

  const shareStory = async () => {
    const canvas = viewerRef.current?.querySelector('canvas');
    if (!canvas) return;
    // Vista más lucida para stories: esquina-sup (§8.1)
    setView('esquina-sup');
    await new Promise((r) => setTimeout(r, 600));
    try {
      const blob = await composeStoryImage(canvas, store.nombre);
      await shareOrDownload(blob, `${store.nombre.replace(/\s+/g, '-').toLowerCase()}.webp`);
    } catch {
      showToast(t('toasts.E15'), 'error');
    } finally {
      setView('trasera');
    }
  };

  const shareGiftLink = async () => {
    let id = store.designId;
    if (!id || store.dirty) id = await doSave();
    if (!id) return;
    try {
      const design = await api<{ shareToken: string }>(`/api/designs/${id}`);
      const url = `${window.location.origin}/d/${design.shareToken}`;
      await navigator.clipboard.writeText(url);
      showToast(t('toasts.E03'), 'success');
    } catch {
      showToast(t('toasts.E15'), 'error');
    }
  };

  // ---------- Render ----------
  if (!webgl) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-6xl">🥺</span>
        <p className="max-w-sm font-display text-lg font-semibold">{t('editor.sinWebgl')}</p>
      </div>
    );
  }

  const selected = store.instances.find((i) => i.instanceId === store.selectedId) ?? null;
  const selectedExpired = selected ? expiredIds.has(selected.elementId) : false;
  const placementAllowed = viewAllowsPlacement(view);

  const categoryTabs = [
    ...CATEGORIES.map((c) => ({ id: c, label: t(`editor.categorias.${c}`) })),
    ...(elementsData?.temporada
      ? [{ id: 'temporada', label: `${t('editor.categorias.temporada')} ${elementsData.temporada.emoji}` }]
      : []),
  ];
  const tabElements = elementsData?.porCategoria[activeTab] ?? [];

  // El bottom sheet es fixed: reservar su altura para no tapar las acciones (§6.1)
  const sheetPad = { collapsed: '76px', half: '240px', expanded: '70dvh' }[sheetPos];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-pink-100" style={{ paddingBottom: sheetPad }}>
      <Confetti trigger={confetti} />

      {/* Barra superior (§6.1) */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          aria-label={t('common.nav.volver')}
          onClick={() => router.back()}
          className="flex h-11 w-11 items-center justify-center rounded-pill text-pink-700 hover:bg-pink-200"
        >
          <ArrowLeft size={22} />
        </button>
        {renaming ? (
          <form
            className="flex flex-1 items-center gap-1"
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
              maxLength={60}
              className="w-full rounded-pill border-2 border-pink-300 bg-surface px-4 py-1.5 font-display font-semibold"
            />
            <button type="submit" aria-label={t('common.acciones.aceptar')} className="p-2 text-pink-700">
              <Check size={20} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="flex min-w-0 items-center gap-1 font-display text-lg font-semibold"
          >
            <span className="truncate">{store.nombre}</span>
            <Pencil size={16} className="shrink-0 text-text-soft" />
          </button>
        )}
        <div className="flex items-center gap-1">
          <PriceTag centimos={totalCentimos} onClick={() => setBreakdownOpen(true)} />
          <button
            type="button"
            aria-label="Menú"
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-pill text-pink-700 hover:bg-pink-200"
          >
            <MoreHorizontal size={22} />
          </button>
        </div>
      </div>

      {/* Visor 3D */}
      <div ref={viewerRef} className="relative min-h-0 flex-1 touch-none">
        {device && currentVariant && (
          <CaseViewer
            device={device}
            variant={currentVariant}
            instances={store.instances}
            catalog={catalog}
            view={view}
            zoom={zoom}
            visualStates={visualStates}
            showGrid={showGrid}
            guides={guides}
            onElementPointerDown={onElementPointerDown}
            onBackgroundPointerDown={() => store.select(null)}
            onPlanePointerMove={onPlanePointerMove}
          />
        )}
        {(elementsLoading || !device || !currentVariant) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="animate-pulse font-display text-lg text-pink-600">
              {t('common.estados.cargando')} ✨
            </p>
          </div>
        )}
        {elementsError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="font-display">{t('common.estados.error')}</p>
            <Button variant="secondary" size="sm" onClick={() => refetchElements()}>
              {t('common.estados.reintentar')}
            </Button>
          </div>
        )}

        {/* Navegación de vistas (§6.2) */}
        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Vista anterior"
            onClick={() => setView(VIEWS[Math.max(0, VIEWS.indexOf(view) - 1)]!)}
            className="flex h-10 w-10 items-center justify-center rounded-pill bg-surface/90 text-pink-700 shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="rounded-pill bg-surface/90 px-4 py-2 text-sm font-bold shadow-sm">
            {t(
              `editor.vistas.${
                { 'trasera': 'trasera', 'lateral-izq': 'lateralIzq', 'lateral-der': 'lateralDer', 'esquina-sup': 'esquinaSup', 'esquina-inf': 'esquinaInf' }[view]
              }`,
            )}
          </span>
          <button
            type="button"
            aria-label="Vista siguiente"
            onClick={() => setView(VIEWS[Math.min(VIEWS.length - 1, VIEWS.indexOf(view) + 1)]!)}
            className="flex h-10 w-10 items-center justify-center rounded-pill bg-surface/90 text-pink-700 shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Panel contextual del elemento seleccionado (§6.4 alternativas accesibles) */}
        {selected && placementAllowed && (
          <div className="absolute right-2 top-2 flex flex-col items-center gap-1 rounded-card bg-surface/95 p-2 shadow-md">
            {!selectedExpired && (
              <>
                <div className="grid grid-cols-3 gap-0.5">
                  <span />
                  <button type="button" aria-label={t('editor.accesibilidad.arriba')} onClick={() => nudge(0, -1)} className="rounded-thumb p-1.5 text-pink-700 hover:bg-pink-100">▲</button>
                  <span />
                  <button type="button" aria-label={t('editor.accesibilidad.izquierda')} onClick={() => nudge(-1, 0)} className="rounded-thumb p-1.5 text-pink-700 hover:bg-pink-100">◀</button>
                  <button type="button" aria-label={t('common.acciones.centrar')} onClick={centerSelected} className="rounded-thumb p-1.5 text-pink-700 hover:bg-pink-100">
                    <Crosshair size={16} />
                  </button>
                  <button type="button" aria-label={t('editor.accesibilidad.derecha')} onClick={() => nudge(1, 0)} className="rounded-thumb p-1.5 text-pink-700 hover:bg-pink-100">▶</button>
                  <span />
                  <button type="button" aria-label={t('editor.accesibilidad.abajo')} onClick={() => nudge(0, 1)} className="rounded-thumb p-1.5 text-pink-700 hover:bg-pink-100">▼</button>
                  <span />
                </div>
                <div className="flex items-center gap-1">
                  <RotateCw size={14} className="text-text-soft" />
                  <input
                    type="number"
                    aria-label={t('editor.accesibilidad.rotar')}
                    value={Math.round(selected.rotacionGrados)}
                    onChange={(e) => rotateTo(Number(e.target.value))}
                    className="w-16 rounded-pill border border-pink-200 px-2 py-1 text-center text-sm"
                  />
                </div>
              </>
            )}
            {selectedExpired && (
              <Button size="sm" variant="secondary" onClick={() => { setActiveTab('corazones'); setSheetPos('expanded'); }}>
                {t('common.acciones.sustituir')}
              </Button>
            )}
            <button
              type="button"
              aria-label={t('editor.accesibilidad.eliminarElemento')}
              onClick={() => store.removeInstance(selected.instanceId)}
              className="flex h-10 w-10 items-center justify-center rounded-pill text-error hover:bg-error-bg"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Barra de acciones (§6.1) */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={t('common.acciones.deshacer')}
            disabled={store.past.length === 0}
            onClick={store.undo}
            className="flex h-11 w-11 items-center justify-center rounded-pill text-pink-700 hover:bg-pink-200 disabled:opacity-30"
          >
            <Undo2 size={20} />
          </button>
          <button
            type="button"
            aria-label={t('common.acciones.rehacer')}
            disabled={store.future.length === 0}
            onClick={store.redo}
            className="flex h-11 w-11 items-center justify-center rounded-pill text-pink-700 hover:bg-pink-200 disabled:opacity-30"
          >
            <Redo2 size={20} />
          </button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" loading={saving} onClick={() => void doSave()}>
            {t('common.acciones.guardar')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShareOpen(true)}>
            <Share2 size={16} /> {t('common.acciones.compartir')}
          </Button>
          <Button size="sm" variant="secondary" disabled={hasExpired} onClick={() => void addToCart()}>
            <ShoppingBag size={16} />
          </Button>
        </div>
      </div>

      {/* Bottom sheet de elementos (§6.1) */}
      <BottomSheet
        position={sheetPos}
        onPositionChange={setSheetPos}
        header={
          <Tabs tabs={categoryTabs} active={activeTab} onChange={(id) => { setActiveTab(id); if (sheetPos === 'collapsed') setSheetPos('half'); }} label="Categorías" />
        }
      >
        {!placementAllowed ? (
          <button
            type="button"
            onClick={() => setView('trasera')}
            className="mt-4 w-full rounded-card bg-pink-100 px-4 py-6 text-center font-bold text-pink-700"
          >
            {t('toasts.E11')}
          </button>
        ) : (
          <>
            {activeTab === 'letras' && (
              <form
                className="mb-3 flex items-end gap-2 px-1 pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createLetters();
                }}
              >
                <Input
                  label={t('editor.letras.placeholder')}
                  hint={t('editor.letras.maximo')}
                  value={lettersText}
                  onChange={(e) => setLettersText(e.target.value)}
                  maxLength={14}
                  className="flex-1"
                />
                <Button type="submit" size="md">
                  {t('editor.letras.crear')}
                </Button>
              </form>
            )}
            <div className="grid grid-cols-4 gap-2 px-1 pt-2 md:grid-cols-6">
              {tabElements.map((el) => (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => addElement(el)}
                  className="flex flex-col items-center gap-1 rounded-thumb border-2 border-pink-100 bg-surface p-2 transition-colors hover:border-pink-300"
                >
                  <span className="text-2xl" aria-hidden>
                    {el.categoria === 'letras' ? (el.letraChar ?? '✱') : categoryEmoji(el.categoria ?? activeTab)}
                  </span>
                  <span className="w-full truncate text-center text-[11px] font-bold">{el.nombre}</span>
                  <span className="text-[11px] text-pink-600">{formatCentimos(el.precioCentimos ?? 0)}</span>
                  <span className="flex gap-0.5">
                    <Badge variant={el.tipo === 'charm3d' ? 'tresD' : 'sticker'}>
                      {el.tipo === 'charm3d' ? t('common.badges.tresD') : t('common.badges.sticker')}
                    </Badge>
                    {el.esNuevo && <Badge variant="nuevo">{t('common.badges.nuevo')}</Badge>}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </BottomSheet>

      {/* Menú ⋯ */}
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Menú">
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between rounded-thumb bg-pink-50 px-4 py-3 font-bold">
            {t('editor.menu.cuadricula')}
            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="h-5 w-5 accent-pink-600" />
          </label>
          {currentVariant && casesData && (
            <div className="rounded-thumb bg-pink-50 px-4 py-3">
              <p className="mb-2 font-bold">{currentVariant.nombre}</p>
              <div className="flex gap-2">
                {casesData.fundas
                  .find((f) => f.variantes.some((v) => v.id === store.caseVariantId))
                  ?.variantes.filter((v) => v.disponible)
                  .map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      aria-label={v.colorNombre}
                      aria-pressed={v.id === store.caseVariantId}
                      onClick={() => store.setVariant(v.id)}
                      className={`h-9 w-9 rounded-pill border-2 ${v.id === store.caseVariantId ? 'border-pink-700 ring-2 ring-pink-300' : 'border-pink-200'}`}
                      style={{ backgroundColor: v.colorHex }}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Desglose del precio (§6.7) */}
      <Modal open={breakdownOpen} onClose={() => setBreakdownOpen(false)} title={t('editor.desglose')}>
        {breakdown && (
          <ul className="flex flex-col gap-2">
            {breakdown.lines.map((line, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{line.label}</span>
                <span className="flex items-center gap-2 font-bold">
                  {formatCentimos(line.centimos)}
                  {line.instanceId && (
                    <button
                      type="button"
                      aria-label={t('common.acciones.eliminar')}
                      onClick={() => store.removeInstance(line.instanceId!)}
                      className="text-error"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </span>
              </li>
            ))}
            <li className="mt-2 flex justify-between border-t-2 border-pink-100 pt-2 font-display font-bold">
              <span>{t('cesta.total')}</span>
              <span className="text-pink-600">{formatCentimos(breakdown.totalCentimos)}</span>
            </li>
          </ul>
        )}
      </Modal>

      {/* Compartir (§8) */}
      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={t('common.acciones.compartir')}>
        <div className="flex flex-col gap-3">
          <Button onClick={() => { setShareOpen(false); void shareStory(); }}>
            {t('regalo.compartirImagen')} ✨
          </Button>
          <Button variant="secondary" onClick={() => { setShareOpen(false); void shareGiftLink(); }}>
            {t('regalo.compartirEnlace')}
          </Button>
        </div>
      </Modal>

      {/* Elementos caducados (§4.5, E-09) */}
      <Modal open={expiredModal} onClose={() => setExpiredModal(false)} title={t('editor.caducados.titulo')}>
        <p className="mb-3 text-sm text-text-soft">{t('editor.caducados.texto')}</p>
        <ul className="mb-4 flex flex-col gap-1">
          {store.instances
            .filter((i) => expiredIds.has(i.elementId))
            .map((i) => (
              <li key={i.instanceId} className="flex items-center justify-between rounded-thumb bg-error-bg px-3 py-2 text-sm font-bold text-error">
                {i.letraChar ? `Letra «${i.letraChar}»` : (catalog.get(i.elementId)?.nombre ?? t('editor.caducados.noDisponible'))}
              </li>
            ))}
        </ul>
        <Button onClick={() => setExpiredModal(false)}>{t('common.acciones.aceptar')}</Button>
      </Modal>

      {/* Recuperar borrador (E-13) */}
      <Modal open={Boolean(draftPrompt)} onClose={() => setDraftPrompt(null)} title={t('editor.recuperarBorrador')}>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              const d = draftPrompt!;
              store.init({
                designId: d.designId,
                nombre: d.nombre,
                deviceId: d.deviceId,
                caseVariantId: d.caseVariantId,
                instances: d.instances,
              });
              setDraftPrompt(null);
            }}
          >
            {t('editor.recuperarSi')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              clearDraft();
              setDraftPrompt(null);
              router.replace('/fundas');
            }}
          >
            {t('editor.recuperarNo')}
          </Button>
        </div>
      </Modal>

      {/* Guardar siendo invitado (E-12, §5.7) */}
      <Modal open={authPrompt} onClose={() => setAuthPrompt(false)} title={t('toasts.E12')}>
        <div className="flex flex-col gap-2">
          <Button onClick={() => router.push('/registro?next=/editor')}>{t('auth.registrarse')}</Button>
          <Button variant="secondary" onClick={() => router.push('/login?next=/editor')}>
            {t('auth.entrar')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function categoryEmoji(categoria: string): string {
  const map: Record<string, string> = {
    corazones: '💖',
    lazos: '🎀',
    flores: '🌸',
    frutas: '🍓',
    animales: '🐰',
    estrellas: '⭐',
    cadenas: '⛓️',
    temporada: '🎄',
    letras: '🔤',
  };
  return map[categoria] ?? '✨';
}
