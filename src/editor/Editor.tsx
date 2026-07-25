'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import type { ThreeEvent } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  ArrowDown, ArrowLeft, ArrowUp, ArrowRight as ArrowRightIcon, Check, Copy, Crosshair,
  Heart, Lock, LockOpen, Maximize2, MoreHorizontal, Pencil, Redo2, RotateCw,
  Search, Share2, ShoppingBag, Smartphone, Trash2, Undo2, X,
} from 'lucide-react';
import {
  Badge, BottomSheet, Button, Input, Modal, PriceTag, SHEET_HEIGHTS_PX, Tabs, useToast,
  type SheetPosition,
} from '@/components/ui';
import { api, ApiClientError } from '@/lib/api-client';
import { getRememberedDevice } from '@/lib/deviceStorage';
import { track } from '@/lib/analytics';
import {
  buildSceneContext, esValida, findFreeSpot, placeLettersRow,
  type ElementShape, type PlacedItem,
} from '@/lib/collision';
import { computeBreakdown, computeTotalCentimos, formatCentimos, type PricedElement } from '@/lib/pricing';
import { loadLetterFont } from '@/assets-procedural';
import { Viewer3D, type GuideLine, type FrameTarget, type ItemVisualState } from './Viewer3D';
import { newInstanceId, useEditorStore } from './store';
import { clearDraft, readDraft, writeDraftDebounced, type LocalDraft } from './autosave';
import { captureThumbnail } from './capture';
import { ElementThumb } from './ElementThumb';
import {
  persistFavorites, pushRecent, readLocalFavorites, readRecents, syncFavorites,
} from './favorites';
import {
  hapticCollision, hapticGuide, hapticLift, hapticTrash, hapticsEnabled, setHapticsEnabled,
} from './haptics';
import { hasWebGL2 } from './webgl';
import { COMPOSITIONS, compositionAnchors, type CompositionId } from './compositions';
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
const SNAP_MM = 1.5; // iman de posicion (SS7.7, E6)

function readHint(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return true;
  }
}

function writeHint(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // best-effort
  }
}

/** AABB en mm de una pieza rotada (para guias E6). */
function rotatedAabb(item: PlacedItem, shape: ElementShape) {
  const rad = item.rotationDeg * DEG;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const hw = (shape.anchoMm * c + shape.altoMm * s) / 2;
  const hh = (shape.anchoMm * s + shape.altoMm * c) / 2;
  return { cx: item.xMm, cy: item.yMm, hw, hh };
}

/** Editor 3D v4.3 (SS7 + anexo). D2: es el producto. */
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
  const [guidesEnabled, setGuidesEnabled] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snapTarget, setSnapTarget] = useState<SnapView | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const [frameTarget, setFrameTarget] = useState<FrameTarget | null>(null);
  const [cameraState, setCameraState] = useState({ azimuthDeg: 0, polarDeg: 82 });
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [liveStates, setLiveStates] = useState<Map<string, ItemVisualState>>(new Map());
  const [ghost, setGhost] = useState<PlacedItem | null>(null);
  const [rotationTooltip, setRotationTooltip] = useState<number | null>(null);
  const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set());
  const [expiredModal, setExpiredModal] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replacingCategoria, setReplacingCategoria] = useState<string | null>(null);
  const [draftPrompt, setDraftPrompt] = useState<LocalDraft | null>(null);
  const [authPrompt, setAuthPrompt] = useState(false);
  const [conflict, setConflict] = useState<{ serverUpdatedAt: string } | null>(null);
  const [trashActive, setTrashActive] = useState(false);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [spaceLow, setSpaceLow] = useState(false);
  const [addFeedback, setAddFeedback] = useState<{ id: string; kind: 'pulse' | 'shake' } | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [pieceHint, setPieceHint] = useState(false);
  const [compositionsOpen, setCompositionsOpen] = useState(false);
  const [composition, setComposition] = useState<{
    id: CompositionId;
    anchors: { x: number; y: number }[];
    next: number;
  } | null>(null);

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
  const handleRef = useRef<{ id: string; tracked: boolean } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
  const lastItemTapRef = useRef<{ id: string; time: number } | null>(null);
  const pendingAddRef = useRef<CatalogElement | null>(null);
  const wasInvalidRef = useRef(false);
  const hadGuideRef = useRef(false);
  const spaceLowNotified = useRef(false);

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

  // Preferencias y ayudas de primera vez (E9, N15, N16)
  useEffect(() => {
    setHaptics(hapticsEnabled());
    setRecents(readRecents());
    setFavorites(readLocalFavorites());
    if (!readHint('cc.hints.tour')) setTourStep(0);
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      void syncFavorites(true).then(setFavorites);
    }
  }, [authStatus]);

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

  const sceneCtx = useMemo(() => (device ? buildSceneContext(device) : null), [device]);

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
      if (lockedIds.has(item.instanceId)) st.locked = true;
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
  }, [store.items, store.selectedId, expiredIds, lockedIds, liveStates, ghost]);

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
        if (!wasInvalidRef.current) hapticCollision(); // N15: una vez por transicion
        wasInvalidRef.current = true;
      } else {
        wasInvalidRef.current = false;
      }
      setLiveStates(map);
      return res.valida;
    },
    [sceneCtx, store.items, shapes, ghost],
  );

  // ---------- N20: aviso de espacio ----------
  useEffect(() => {
    if (!device || catalog.size === 0) return;
    const timer = setTimeout(() => {
      let smallest: CatalogElement | null = null;
      catalog.forEach((el) => {
        if (el.letraChar) return;
        if (!smallest || el.anchoMm * el.altoMm < smallest.anchoMm * smallest.altoMm) smallest = el;
      });
      if (!smallest) return;
      const s = smallest as CatalogElement;
      const spot = findFreeSpot(
        s.id,
        { hitbox: s.hitbox, anchoMm: s.anchoMm, altoMm: s.altoMm },
        store.items, shapes, device,
      );
      const low = spot === null;
      setSpaceLow(low);
      if (low && !spaceLowNotified.current) {
        spaceLowNotified.current = true;
        track('espacio_bajo_mostrado');
      }
      if (!low) spaceLowNotified.current = false;
    }, 350);
    return () => clearTimeout(timer);
  }, [store.items, catalog, shapes, device]);

  // ---------- anadir (SS7.5 / E8) ----------
  const addElement = useCallback(
    (el: CatalogElement): void => {
      if (!device || !sceneCtx) return;
      if (replacingId) {
        // Sustitucion (SS7.8 / N1): misma pose y, si no cabe, busqueda de hueco
        const target = store.items.find((i) => i.instanceId === replacingId);
        if (!target) return;
        const others = store.items.filter((i) => i.instanceId !== replacingId);
        // N1: conserva letraChar solo si el destino es del juego de letras
        const letterChar = el.letraChar ?? undefined;
        const samePose: PlacedItem = { ...target, elementId: el.id, letterChar };
        const allShapes = new Map(shapes);
        allShapes.set(el.id, { hitbox: el.hitbox, anchoMm: el.anchoMm, altoMm: el.altoMm });
        if (esValida(samePose, others, allShapes, sceneCtx).valida) {
          store.replaceItem(replacingId, { ...samePose, instanceId: newInstanceId() });
        } else {
          const spot = findFreeSpot(el.id, allShapes.get(el.id)!, others, allShapes, device);
          if (!spot) {
            showToast(t('toasts.T06'), 'error');
            setAddFeedback({ id: el.id, kind: 'shake' });
            return;
          }
          store.replaceItem(replacingId, {
            instanceId: newInstanceId(), elementId: el.id, xMm: spot.x, yMm: spot.y,
            rotationDeg: spot.rotationDeg, letterChar,
          });
        }
        setExpiredIds((prev) => {
          const next = new Set(prev);
          const stillUsed = useEditorStore.getState().items.some((i) => i.elementId === target.elementId);
          if (!stillUsed) next.delete(target.elementId);
          return next;
        });
        setReplacingId(null);
        setReplacingCategoria(null);
        return;
      }
      const doAdd = () => {
        const shape: ElementShape = { hitbox: el.hitbox, anchoMm: el.anchoMm, altoMm: el.altoMm };
        const all = new Map(shapes);
        all.set(el.id, shape);
        // N9: composicion activa — la pieza cae en el siguiente anclaje valido
        if (composition && sceneCtx) {
          let placedAt = -1;
          for (let i = composition.next; i < composition.anchors.length; i++) {
            const anchor = composition.anchors[i]!;
            const candidate: PlacedItem = {
              instanceId: '__anchor__', elementId: el.id, xMm: anchor.x, yMm: anchor.y,
              rotationDeg: 0, letterChar: el.letraChar ?? undefined,
            };
            if (esValida(candidate, store.items, all, sceneCtx).valida) {
              placedAt = i;
              store.addItem({ ...candidate, instanceId: newInstanceId() });
              setAddFeedback({ id: el.id, kind: 'pulse' });
              setRecents(pushRecent(el.id));
              track('elemento_anadido', { categoria: el.categoria, tipo: el.tipo });
              break;
            }
          }
          if (placedAt === -1) {
            showToast(t('toasts.T06'), 'error');
            setAddFeedback({ id: el.id, kind: 'shake' });
            return;
          }
          const next = placedAt + 1;
          if (next >= composition.anchors.length) setComposition(null);
          else setComposition({ ...composition, next });
          return;
        }
        const spot = findFreeSpot(el.id, shape, store.items, all, device);
        if (!spot) {
          showToast(t('toasts.T06'), 'error');
          // Parte IV.3: el error se percibe donde se toco
          setAddFeedback({ id: el.id, kind: 'shake' });
          return;
        }
        store.addItem({
          instanceId: newInstanceId(), elementId: el.id, xMm: spot.x, yMm: spot.y,
          rotationDeg: spot.rotationDeg, letterChar: el.letraChar ?? undefined,
        });
        setAddFeedback({ id: el.id, kind: 'pulse' });
        setRecents(pushRecent(el.id));
        track('elemento_anadido', { categoria: el.categoria, tipo: el.tipo });
        // Hint de primera pieza (E9.2)
        if (!readHint('cc.hints.piece') && readHint('cc.hints.tour')) {
          setPieceHint(true);
          writeHint('cc.hints.piece');
          track('hint_completado', { hint: 'piece' });
          setTimeout(() => setPieceHint(false), 3000);
        }
      };
      if (!backFacing) {
        // Reencuadre y despues anadir (SS7.5, T-11)
        pendingAddRef.current = el;
        setSnapTarget('trasera');
        return;
      }
      doAdd();
    },
    [device, sceneCtx, replacingId, store, shapes, backFacing, composition, showToast, t],
  );

  /** N10: "Diseno sorpresa" — punto de partida valido, coherente y editable. */
  const generateSurprise = useCallback(() => {
    if (!device || !sceneCtx || catalog.size === 0) return;
    const id = COMPOSITIONS[Math.floor(Math.random() * COMPOSITIONS.length)]!;
    const anchors = compositionAnchors(id, device);
    const pool = [...catalog.values()].filter((el) => !el.letraChar);
    // Paleta simple por acabado: oro/plata combinan con todo; max 2 categorias + 1 acento
    const metals = pool.filter((el) => el.acabado.startsWith('metal-'));
    const rest = pool.filter((el) => !el.acabado.startsWith('metal-'));
    const categorias = [...new Set(rest.map((el) => el.categoria))].sort(() => Math.random() - 0.5).slice(0, 2);
    const base = rest.filter((el) => categorias.includes(el.categoria));
    const accent = metals.length > 0 ? [metals[Math.floor(Math.random() * metals.length)]!] : [];
    const candidates = [...base.sort(() => Math.random() - 0.5), ...accent];
    const target = Math.min(anchors.length, 4 + Math.floor(Math.random() * 4)); // 4-7 piezas
    const placed: PlacedItem[] = [];
    const all = new Map(shapes);
    let anchorIdx = 0;
    for (const el of candidates) {
      if (placed.length >= target || anchorIdx >= anchors.length) break;
      all.set(el.id, { hitbox: el.hitbox, anchoMm: el.anchoMm, altoMm: el.altoMm });
      while (anchorIdx < anchors.length) {
        const anchor = anchors[anchorIdx]!;
        anchorIdx++;
        const candidate: PlacedItem = {
          instanceId: newInstanceId(), elementId: el.id, xMm: anchor.x, yMm: anchor.y, rotationDeg: 0,
        };
        if (esValida(candidate, [...store.items, ...placed], all, sceneCtx).valida) {
          placed.push(candidate);
          break;
        }
      }
    }
    if (placed.length === 0) {
      showToast(t('toasts.T06'), 'error');
      return;
    }
    store.addBatch(placed);
    track('sorpresa_generada', { composicion: id, n: placed.length });
  }, [device, sceneCtx, catalog, shapes, store, showToast, t]);

  useEffect(() => {
    if (!addFeedback) return;
    const timer = setTimeout(() => setAddFeedback(null), 400);
    return () => clearTimeout(timer);
  }, [addFeedback]);

  const onSnapReached = useCallback(() => {
    setSnapTarget(null);
    const pending = pendingAddRef.current;
    if (pending) {
      pendingAddRef.current = null;
      addElement(pending);
    }
  }, [addElement]);

  // ---------- N14: eliminar con Deshacer ----------
  const removePiece = useCallback(
    (instanceId: string, isLetterBatch = false) => {
      store.removeItem(instanceId);
      setLockedIds((prev) => {
        if (!prev.has(instanceId)) return prev;
        const next = new Set(prev);
        next.delete(instanceId);
        return next;
      });
      showToast(
        t(isLetterBatch ? 'editor.pieza.letrasEliminadas' : 'editor.pieza.eliminada'),
        'info',
        {
          label: t('common.acciones.deshacer'),
          onAction: () => {
            useEditorStore.getState().undo();
            track('deshacer_toast_usado');
          },
        },
      );
    },
    [store, showToast, t],
  );

  // ---------- gestos: matriz SS7.4 ----------
  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const onItemPointerDown = (instanceId: string, e: ThreeEvent<PointerEvent>) => {
    const item = store.items.find((i) => i.instanceId === instanceId);
    if (!item) return;
    store.select(instanceId);
    lastItemTapRef.current = { id: instanceId, time: Date.now() };
    if (expiredIds.has(item.elementId)) return; // caducados: sin drag (SS7.8)
    if (lockedIds.has(instanceId)) return; // N3: bloqueada, el gesto pasa a la camara
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
    // N2: pulsacion larga (450 ms) sin mover levanta una copia "en la mano"
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      const drag = dragRef.current;
      if (!drag || drag.id !== instanceId || drag.moved) return;
      const source = useEditorStore.getState().items.find((i) => i.instanceId === instanceId);
      if (!source) return;
      store.cancelGesture();
      const ghostId = `ghost-${newInstanceId()}`;
      const copy: PlacedItem = { ...source, instanceId: ghostId };
      setGhost(copy);
      dragRef.current = {
        ...drag, id: ghostId, moved: true, isGhost: true, hadValid: false,
        lastValid: { xMm: source.xMm, yMm: source.yMm, rotationDeg: source.rotationDeg },
      };
      hapticLift();
      track('pieza_duplicada', { origen: 'gesto' });
    }, 450);
  };

  // E5: pointerdown sobre el asa = gesto de rotacion (fila propia de SS7.4)
  const onHandlePointerDown = (instanceId: string, _e: ThreeEvent<PointerEvent>) => {
    const item = store.items.find((i) => i.instanceId === instanceId);
    if (!item || lockedIds.has(instanceId)) return;
    if (controlsRef.current) controlsRef.current.enabled = false;
    store.beginGesture();
    store.setStatus('rotating-item');
    handleRef.current = { id: instanceId, tracked: false };
  };

  const mmPerPx = useCallback((): number => {
    const el = viewerRef.current;
    if (!el || !device) return 0.3;
    return (device.altoMm * 1.6) / el.clientHeight;
  }, [device]);

  /** E6: iman de posicion contra ejes de funda, piezas ajenas y separaciones. */
  const computeSnap = useCallback(
    (item: PlacedItem, x: number, y: number): { x: number; y: number } => {
      if (!device || !guidesEnabled) {
        setGuides([]);
        return { x, y };
      }
      const shape = shapes.get(item.elementId);
      const aabb = shape ? rotatedAabb({ ...item, xMm: x, yMm: y }, shape) : { cx: x, cy: y, hw: 0, hh: 0 };
      const out: GuideLine[] = [];
      let nx = x;
      let ny = y;
      let capturedType: string | null = null;

      interface Candidate {
        pos: number;
        from: number;
        to: number;
        delta: number;
      }
      const others = store.items
        .filter((o) => o.instanceId !== item.instanceId)
        .map((o) => ({ o, box: rotatedAabb(o, shapes.get(o.elementId) ?? { hitbox: [], anchoMm: 6, altoMm: 6 }) }));

      // Eje X: centro y bordes del arrastrado contra centros/bordes ajenos y eje de funda
      const bestAxis = (
        dragged: number[],
        candidates: { pos: number; from: number; to: number }[],
      ): Candidate | null => {
        let best: Candidate | null = null;
        for (const dv of dragged) {
          for (const c of candidates) {
            const delta = c.pos - dv;
            if (Math.abs(delta) <= SNAP_MM && (!best || Math.abs(delta) < Math.abs(best.delta))) {
              best = { pos: c.pos, from: c.from, to: c.to, delta };
            }
          }
        }
        return best;
      };

      const xCandidates: { pos: number; from: number; to: number }[] = [
        { pos: device.anchoMm / 2, from: 0, to: device.altoMm },
      ];
      const yCandidates: { pos: number; from: number; to: number }[] = [
        { pos: device.altoMm / 2, from: 0, to: device.anchoMm },
      ];
      for (const { box } of others) {
        const spanFrom = Math.min(box.cy - box.hh, aabb.cy - aabb.hh);
        const spanTo = Math.max(box.cy + box.hh, aabb.cy + aabb.hh);
        xCandidates.push(
          { pos: box.cx, from: spanFrom, to: spanTo },
          { pos: box.cx - box.hw, from: spanFrom, to: spanTo },
          { pos: box.cx + box.hw, from: spanFrom, to: spanTo },
        );
        const spanFromX = Math.min(box.cx - box.hw, aabb.cx - aabb.hw);
        const spanToX = Math.max(box.cx + box.hw, aabb.cx + aabb.hw);
        yCandidates.push(
          { pos: box.cy, from: spanFromX, to: spanToX },
          { pos: box.cy - box.hh, from: spanFromX, to: spanToX },
          { pos: box.cy + box.hh, from: spanFromX, to: spanToX },
        );
      }

      const bx = bestAxis([aabb.cx, aabb.cx - aabb.hw, aabb.cx + aabb.hw], xCandidates);
      if (bx) {
        nx = x + bx.delta;
        out.push({ axis: 'v', posMm: bx.pos, fromMm: bx.from, toMm: bx.to });
        capturedType = Math.abs(bx.pos - device.anchoMm / 2) < 0.01 ? 'eje' : 'pieza';
      }
      const by = bestAxis([aabb.cy, aabb.cy - aabb.hh, aabb.cy + aabb.hh], yCandidates);
      if (by) {
        ny = y + by.delta;
        out.push({ axis: 'h', posMm: by.pos, fromMm: by.from, toMm: by.to });
        if (!capturedType) capturedType = Math.abs(by.pos - device.altoMm / 2) < 0.01 ? 'eje' : 'pieza';
      }

      // E6.4: igualado de separaciones entre dos piezas alineadas en Y
      const dragged = { ...aabb, cx: nx, cy: ny };
      const aligned = others.filter(({ box }) => Math.abs(box.cy - dragged.cy) < 6);
      const left = aligned
        .filter(({ box }) => box.cx + box.hw < dragged.cx - dragged.hw + SNAP_MM)
        .sort((a, b) => b.box.cx - a.box.cx)[0];
      const right = aligned
        .filter(({ box }) => box.cx - box.hw > dragged.cx + dragged.hw - SNAP_MM)
        .sort((a, b) => a.box.cx - b.box.cx)[0];
      if (left && right && out.length < 3) {
        const gapL = dragged.cx - dragged.hw - (left.box.cx + left.box.hw);
        const gapR = right.box.cx - right.box.hw - (dragged.cx + dragged.hw);
        if (gapL > 0 && gapR > 0 && Math.abs(gapL - gapR) < SNAP_MM) {
          const equal = (gapL + gapR) / 2;
          nx = left.box.cx + left.box.hw + equal + dragged.hw;
          out.push(
            { axis: 'h', posMm: dragged.cy, fromMm: left.box.cx + left.box.hw, toMm: nx - dragged.hw },
            { axis: 'h', posMm: dragged.cy, fromMm: nx + dragged.hw, toMm: right.box.cx - right.box.hw },
          );
          capturedType = 'spacing';
        }
      }

      setGuides(out.slice(0, 3)); // limite de rendimiento (E6.3)
      if (capturedType && !hadGuideRef.current) {
        hapticGuide(); // N15
        track('guia_capturada', { tipo: capturedType });
      }
      hadGuideRef.current = capturedType !== null;
      return { x: nx, y: ny };
    },
    [device, guidesEnabled, shapes, store.items],
  );

  const onPlanePointerMove = (xMm: number, yMm: number, e: ThreeEvent<PointerEvent>) => {
    // E5: gesto del asa de rotacion
    const handle = handleRef.current;
    if (handle) {
      const item = useEditorStore.getState().items.find((i) => i.instanceId === handle.id);
      if (!item) return;
      if (!handle.tracked) {
        handle.tracked = true;
        track('asa_rotacion_usada');
      }
      // El asa apunta "arriba" de la pieza: rot = 90 - angulo visual del puntero
      const angleDeg = Math.atan2(-(yMm - item.yMm), xMm - item.xMm) / DEG;
      let rot = (90 - angleDeg) % 360;
      if (rot < 0) rot += 360;
      store.updateItemLive(handle.id, { rotationDeg: rot });
      setRotationTooltip(Math.round(rot));
      validateLive({ ...item, rotationDeg: rot });
      return;
    }

    const drag = dragRef.current;
    if (!drag || twistRef.current) return;
    if (e.pointerId !== drag.pointerId) return;
    const dx = e.nativeEvent.clientX - drag.startX;
    const dy = e.nativeEvent.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return; // umbral tap/drag (SS7.4)
    if (!drag.moved) clearLongPress();
    drag.moved = true;
    store.setStatus('dragging');
    let y = yMm;
    if (drag.isTouch) y -= 48 * mmPerPx(); // offset tactil 48 px (SS7.6)
    const isGhostItem = ghost?.instanceId === drag.id;
    const current = isGhostItem ? ghost : store.items.find((i) => i.instanceId === drag.id);
    if (!current) return;
    const snapped = computeSnap(current, xMm, y);
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

  const endHandle = useCallback(() => {
    const handle = handleRef.current;
    if (!handle) return;
    handleRef.current = null;
    setRotationTooltip(null);
    if (controlsRef.current) controlsRef.current.enabled = true;
    store.setStatus(hasExpired ? 'resolving-expired' : 'ready');
    const state = useEditorStore.getState();
    const item = state.items.find((i) => i.instanceId === handle.id);
    if (item && sceneCtx) {
      const others = state.items.filter((i) => i.instanceId !== handle.id);
      if (!esValida(item, others, shapes, sceneCtx).valida) {
        showToast(t('toasts.T05'), 'error');
        track('colision_al_soltar');
        store.cancelGesture();
      } else {
        store.commitGesture();
      }
    }
    setLiveStates(new Map());
    wasInvalidRef.current = false;
  }, [store, sceneCtx, shapes, hasExpired, showToast, t]);

  const endDrag = useCallback(
    (cancelled = false) => {
      clearLongPress();
      if (handleRef.current) {
        endHandle();
        return;
      }
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      setGuides([]);
      hadGuideRef.current = false;
      wasInvalidRef.current = false;
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
        if (wasTrash) {
          hapticTrash();
          return;
        }
        if (!sceneCtx) return;
        const valid = esValida(g, store.items, shapes, sceneCtx).valida;
        if (!valid) {
          showToast(t('toasts.T05'), 'error');
          track('colision_al_soltar');
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
        hapticTrash();
        removePiece(drag.id); // N14: toast con Deshacer
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
        track('colision_al_soltar');
        store.updateItemLive(drag.id, drag.lastValid);
        store.commitGesture();
      } else {
        store.commitGesture();
      }
      setLiveStates(new Map());
    },
    [store, sceneCtx, shapes, ghost, trashActive, hasExpired, showToast, t, removePiece, endHandle],
  );

  // Rotacion por gesto de dos dedos; doble tap reencuadra (funda o pieza N5)
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
        if (drag || handleRef.current) {
          // Regla 10: un dedo extra durante drag se ignora
          return;
        }
        if (selected && !lockedIds.has(selected)) {
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
        if (now - lastTapRef.current < 300) {
          onDoubleActivate();
        }
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
            track('colision_al_soltar');
            store.cancelGesture(); // reversion de rotacion (SS26.3)
          } else {
            store.commitGesture();
          }
        }
        setLiveStates(new Map());
        wasInvalidRef.current = false;
      }
    };

    const onDblClick = () => {
      if (!dragRef.current) onDoubleActivate();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endDrag, expiredIds, lockedIds, sceneCtx, shapes, store, validateLive, hasExpired, showToast, t]);

  /** Doble tap/click: pieza seleccionada -> zoom a pieza (N5); vacio -> funda completa (E1.4). */
  const onDoubleActivate = () => {
    const selectedId = useEditorStore.getState().selectedId;
    const recentItemTap =
      lastItemTapRef.current && Date.now() - lastItemTapRef.current.time < 400
        ? lastItemTapRef.current.id
        : null;
    if (selectedId && recentItemTap === selectedId) {
      const item = useEditorStore.getState().items.find((i) => i.instanceId === selectedId);
      const el = item ? catalog.get(item.elementId) : null;
      if (item && el) {
        setFrameTarget({ xMm: item.xMm, yMm: item.yMm, sizeMm: Math.max(el.anchoMm, el.altoMm) });
        return;
      }
    }
    setFrameTarget(null);
    setFitSignal((n) => n + 1);
    track('reencuadre_usado', { origen: 'dobletap' });
  };

  // Teclado (SS21 + N17)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (ev.key === '?') {
        setShortcutsOpen(true);
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        if (ev.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (ev.key === 'Escape') {
        store.select(null);
        setFrameTarget(null);
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
      if (!selected || lockedIds.has(selected)) return;
      const item = store.items.find((i) => i.instanceId === selected);
      if (!item || !sceneCtx) return;
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        removePiece(selected);
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
  }, [store, sceneCtx, shapes, lockedIds]);

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

  // ---------- acciones de pieza (SS7.6 + N1/N3) ----------
  const selected = store.items.find((i) => i.instanceId === store.selectedId) ?? null;
  const selectedElement = selected ? (catalog.get(selected.elementId) ?? null) : null;
  const selectedExpired = selected ? expiredIds.has(selected.elementId) : false;
  const selectedLocked = selected ? lockedIds.has(selected.instanceId) : false;

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

  /** N1: duplicar desde el menu — copia con hueco desde +6 mm en diagonal. */
  const duplicateSelected = () => {
    if (!selected || !selectedElement || !device) return;
    const shape: ElementShape = {
      hitbox: selectedElement.hitbox, anchoMm: selectedElement.anchoMm, altoMm: selectedElement.altoMm,
    };
    const spot = findFreeSpot(
      selected.elementId, shape, store.items, shapes, device, undefined,
      { x: selected.xMm + 6, y: selected.yMm + 6 },
    );
    if (!spot) {
      showToast(t('toasts.T06'), 'error');
      return;
    }
    store.addItem({
      instanceId: newInstanceId(), elementId: selected.elementId, xMm: spot.x, yMm: spot.y,
      rotationDeg: selected.rotationDeg, letterChar: selected.letterChar,
    });
    track('pieza_duplicada', { origen: 'menu' });
  };

  /** N3: bloquear/desbloquear. */
  const toggleLock = () => {
    if (!selected) return;
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(selected.instanceId)) next.delete(selected.instanceId);
      else {
        next.add(selected.instanceId);
        track('pieza_bloqueada');
      }
      return next;
    });
  };

  /** N1: sustituir — abre el panel filtrado a la misma categoria. */
  const startReplace = () => {
    if (!selected || !selectedElement) return;
    setReplacingId(selected.instanceId);
    setReplacingCategoria(selectedElement.categoria);
    setActiveTab(selectedElement.categoria);
    setSheetPos('full');
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
      track('letras_generadas', { n: row.length, filtrados: res.filtrados });
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
      track('diseno_guardado', { nElementos: s.items.length, totalCentimos });
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
      track('anadido_cesta', { origen: 'editor' });
      showToast(t('toasts.T02'), 'success');
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  /** N13: el enlace de regalo exige guardar (encadenado); la imagen no. */
  const shareLink = async () => {
    let id = store.designId;
    if (!id || store.dirty) id = await doSave();
    if (!id) return;
    try {
      const d = await api<{ shareToken: string }>(`/api/designs/${id}`);
      await navigator.clipboard.writeText(`${window.location.origin}/d/${d.shareToken}`);
      track('compartido', { tipo: 'regalo' });
      showToast(t('toasts.T03'), 'success');
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  /** N13: imagen para redes generada del canvas actual, sin guardar. */
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
      track('compartido', { tipo: 'imagen' });
    } catch {
      showToast(t('toasts.T15'), 'error');
    }
  };

  /** N8: favorito con persistencia en cuenta o localStorage. */
  const toggleFavorite = (elementId: string) => {
    setFavorites((prev) => {
      const has = prev.includes(elementId);
      const next = has ? prev.filter((id) => id !== elementId) : [...prev, elementId];
      persistFavorites(next, authStatus === 'authenticated');
      if (!has) track('favorito_marcado');
      return next;
    });
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
  const assetsLoaded = [Boolean(devicesData), Boolean(elementsData), fontReady].filter(Boolean).length;
  const categoryTabs = [
    ...CATEGORY_ORDER.map((c) => ({
      id: c,
      label: t(`editor.categorias.${c}`),
    })),
    ...(elementsData?.temporada ? [{ id: 'temporada', label: `${t('editor.categorias.temporada')}: ${elementsData.temporada.nombre}` }] : []),
  ];
  const allElements = [...catalog.values()];
  const query = searchQuery.trim().toLowerCase();
  const searchResults = query
    ? allElements.filter(
        (el) =>
          !el.letraChar &&
          (el.nombre.toLowerCase().includes(query) ||
            el.categoria.toLowerCase().includes(query) ||
            el.acabado.toLowerCase().includes(query)),
      )
    : [];
  const tabElements = (elementsData?.porCategoria[activeTab] ?? []).filter(
    (el) => !replacingCategoria || el.categoria === replacingCategoria,
  );
  const tabCharms = tabElements.filter((el) => el.tipo === 'charm3d');
  const tabStickers = tabElements.filter((el) => el.tipo === 'plano');
  const viewerItems = ghost ? [...store.items, ghost] : store.items;
  const activeTabLabel = categoryTabs.find((c) => c.id === activeTab)?.label ?? '';

  const saveState: 'guardado' | 'guardando' | 'sinGuardar' = saving
    ? 'guardando'
    : store.designId && !store.dirty
      ? 'guardado'
      : 'sinGuardar';

  const rotationHandleFor =
    selected && selectedElement && !selectedExpired && !selectedLocked && !dragRef.current && !ghost
      ? { item: selected, element: selectedElement }
      : null;

  const renderThumbButton = (el: CatalogElement, showCategory = false) => (
    <div key={el.id} className="relative">
      <button
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
        className={`flex w-full flex-col items-center gap-1 rounded-thumb border border-border bg-surface p-2 transition-colors hover:border-pink-300 ${
          addFeedback?.id === el.id ? (addFeedback.kind === 'pulse' ? 'thumb-pulse' : 'thumb-shake') : ''
        }`}
      >
        <ElementThumb element={el} />
        <span className="w-full truncate text-center text-xs font-medium">
          {el.letraChar ?? el.nombre}
        </span>
        <span className="tabular text-xs font-semibold text-text-soft">
          {formatCentimos(el.precioCentimos)}
        </span>
        <Badge variant={el.tipo === 'charm3d' ? 'tresD' : 'sticker'}>
          {showCategory
            ? t(`editor.categorias.${el.categoria as CategoryId}`)
            : el.tipo === 'charm3d'
              ? t('common.badges.tresD')
              : t('common.badges.sticker')}
        </Badge>
      </button>
      {!el.letraChar && (
        <button
          type="button"
          aria-label={favorites.includes(el.id) ? t('editor.aria.favoritoQuitar') : t('editor.aria.favoritoMarcar')}
          aria-pressed={favorites.includes(el.id)}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(el.id);
          }}
          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-control bg-surface/85"
        >
          <Heart
            size={13}
            className={favorites.includes(el.id) ? 'fill-pink-500 text-pink-500' : 'text-text-soft'}
            aria-hidden
          />
        </button>
      )}
    </div>
  );

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
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="flex min-w-0 items-center gap-1.5 rounded-control px-2 py-0.5 transition-colors hover:bg-surface-2"
            >
              <span className="truncate font-display text-[17px] font-semibold">{store.nombre}</span>
              <Pencil size={14} className="shrink-0 text-text-soft" aria-hidden />
            </button>
            {/* E9.5: indicador de guardado */}
            <span className="flex items-center gap-1 text-[11px] text-text-soft">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-badge ${
                  saveState === 'guardado' ? 'bg-success' : saveState === 'guardando' ? 'bg-warning' : 'bg-text-disabled'
                }`}
              />
              {t(`editor.guardadoEstado.${saveState}`)}
            </span>
          </div>
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
              if (!dragRef.current && !twistRef.current && !handleRef.current) {
                store.select(null);
                setFrameTarget(null);
              }
            }}
            controlsRef={(c) => {
              controlsRef.current = c;
            }}
            occlusions={{ topPx: 0, bottomPx: 56 }}
            fitSignal={fitSignal}
            frameTarget={frameTarget}
            rotationHandleFor={rotationHandleFor}
            onHandlePointerDown={onHandlePointerDown}
          />
        )}
        <p className="sr-only" aria-live="polite">
          {currentCase && t('editor.accesibilidad.visor', { nombre: `${currentCase.nombre} ${currentVariant?.colorNombre ?? ''}`, n: store.items.length })}
        </p>

        {/* E9.4: pantalla de carga con silueta a proporcion y progreso real */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg">
            <div className="skeleton-shimmer overflow-hidden" style={{ width: 96, height: 190, borderRadius: 22 }}>
              <svg width="96" height="190" viewBox="0 0 96 190" aria-hidden>
                <rect x="2" y="2" width="92" height="186" rx="20" fill="none" stroke="var(--pink-300)" strokeWidth="2" />
                <rect x="8" y="8" width="42" height="42" rx="12" fill="none" stroke="var(--pink-300)" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="h-1 w-48 overflow-hidden rounded-badge bg-surface-2">
              <div
                className="h-full bg-pink-500 transition-all duration-300"
                style={{ width: `${Math.round((assetsLoaded / 3) * 100)}%` }}
              />
            </div>
            <p className="text-[13px] text-text-soft">
              {currentCase && currentVariant
                ? t('editor.preparandoFunda', { funda: `${currentCase.nombre} ${currentVariant.colorNombre}` })
                : t('editor.preparando')}
            </p>
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

        {/* E9.3: chip del modelo activo */}
        {device && !loading && (
          <button
            type="button"
            onClick={() => router.push('/modelo?volver=%2Feditor')}
            className="absolute left-2 top-2 inline-flex h-8 items-center gap-1.5 rounded-control border border-border bg-surface/95 px-2.5 text-[13px] font-medium text-text shadow-1"
          >
            <Smartphone size={13} aria-hidden className="text-text-soft" />
            {device.nombre}
          </button>
        )}

        {/* Hint de primera pieza (E9.2) */}
        {pieceHint && (
          <div className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center">
            <p className="rounded-control bg-text/85 px-3.5 py-2 text-[13px] font-medium text-white">
              {t('editor.hints.pieza')}
            </p>
          </div>
        )}

        {/* Chips de vista (SS7.3) + Reencuadrar (E1.4) */}
        <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
          {(['trasera', 'lateral-izq', 'lateral-der'] as SnapView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setFrameTarget(null);
                setSnapTarget(v);
                track('vista_cambiada', { modo: 'chip' });
                if (v === 'trasera') track('reencuadre_usado', { origen: 'chip' });
              }}
              className={`rounded-control border px-3 py-1.5 text-[13px] font-medium shadow-1 transition-colors ${
                activeSnap === v
                  ? 'border-pink-300 bg-pink-100 text-pink-700'
                  : 'border-border bg-surface text-text-soft hover:text-text'
              }`}
            >
              {t(`editor.vistas.${v === 'trasera' ? 'trasera' : v === 'lateral-izq' ? 'lateralIzq' : 'lateralDer'}`)}
            </button>
          ))}
          <button
            type="button"
            aria-label={t('common.acciones.reencuadrar')}
            onClick={() => {
              setFrameTarget(null);
              setFitSignal((n) => n + 1);
              track('reencuadre_usado', { origen: 'boton' });
            }}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-control border border-border bg-surface text-text-soft shadow-1 transition-colors hover:text-text"
          >
            <Maximize2 size={15} aria-hidden />
          </button>
        </div>

        {/* Tooltip de rotacion (SS7.6 / E5.2) */}
        {rotationTooltip !== null && (
          <div className="tabular absolute left-1/2 top-4 -translate-x-1/2 rounded-control bg-text px-2.5 py-1 text-[13px] font-medium text-white">
            {rotationTooltip}&deg;
          </div>
        )}

        {/* Zona de papelera durante drag (SS7.6) */}
        {(dragRef.current?.moved || ghost) && (
          <div
            id="cc-trash-zone"
            aria-label={t('editor.accesibilidad.papelera')}
            className={`absolute bottom-14 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border transition-all ${
              trashActive
                ? 'h-16 w-16 border-error bg-error-bg text-error'
                : 'h-[52px] w-[52px] border-border bg-surface text-text-soft'
            }`}
          >
            <Trash2 size={22} aria-hidden />
          </div>
        )}

        {/* Panel contextual de la pieza (SS7.6 + N1/N3) */}
        {selected && selectedElement && (
          <div className="absolute right-2 top-2 flex w-[176px] flex-col gap-2 rounded-card border border-border bg-surface p-2.5 shadow-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[13px] font-medium">{selectedElement.nombre}</span>
              <span className="tabular shrink-0 text-[13px] text-text-soft">
                {formatCentimos(selectedElement.precioCentimos)}
              </span>
            </div>
            {selectedExpired ? (
              <>
                <Badge variant="noDisponible">{t('common.badges.noDisponible')}</Badge>
                <Button variant="secondary" size="md" onClick={startReplace}>
                  {t('common.acciones.sustituir')}
                </Button>
              </>
            ) : selectedLocked ? (
              <Button variant="secondary" size="md" onClick={toggleLock}>
                <LockOpen size={14} aria-hidden />
                {t('common.acciones.desbloquear')}
              </Button>
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
                {/* N1: menu de pieza */}
                <div className="grid grid-cols-3 gap-1" aria-label={t('editor.aria.menuPieza')}>
                  <button
                    type="button"
                    aria-label={t('common.acciones.duplicar')}
                    onClick={duplicateSelected}
                    className="flex h-9 items-center justify-center rounded-control border border-border text-text-soft hover:text-text"
                  >
                    <Copy size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={t('common.acciones.bloquear')}
                    onClick={toggleLock}
                    className="flex h-9 items-center justify-center rounded-control border border-border text-text-soft hover:text-text"
                  >
                    <Lock size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={t('common.acciones.sustituir')}
                    onClick={startReplace}
                    className="flex h-9 items-center justify-center rounded-control border border-border text-text-soft hover:text-text"
                  >
                    <RotateCw size={15} className="rotate-90" aria-hidden />
                  </button>
                </div>
              </>
            )}
            <button
              type="button"
              aria-label={t('editor.accesibilidad.eliminarElemento')}
              disabled={selectedLocked}
              onClick={() => removePiece(selected.instanceId)}
              className="flex h-9 items-center justify-center gap-1.5 rounded-control text-[13px] font-medium text-error transition-colors hover:bg-error-bg disabled:opacity-40"
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
          <div className="flex items-center gap-1.5">
            {searchOpen ? (
              <div className="flex flex-1 items-center gap-1.5 px-1 py-1">
                <Search size={15} className="shrink-0 text-text-soft" aria-hidden />
                <input
                  autoFocus
                  aria-label={t('editor.aria.buscar')}
                  placeholder={t('editor.buscar.placeholder')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim()) {
                      track('busqueda_elementos', { conResultados: searchResults.length > 0 ? 1 : 0 });
                    }
                  }}
                  className="h-9 w-full rounded-control border border-border bg-surface px-2.5 text-[13px] outline-none focus:border-pink-500"
                />
                <button
                  type="button"
                  aria-label={t('common.acciones.cerrar')}
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-soft hover:bg-surface-2"
                >
                  <X size={15} aria-hidden />
                </button>
              </div>
            ) : (
              <>
                <div className="tabs-fade min-w-0 flex-1">
                  <Tabs
                    tabs={categoryTabs}
                    active={activeTab}
                    onChange={(id) => {
                      setActiveTab(id);
                      if (sheetPos === 'collapsed') setSheetPos('half');
                    }}
                    label={t('editor.aria.categorias')}
                  />
                </div>
                <button
                  type="button"
                  aria-label={t('editor.aria.buscar')}
                  onClick={() => {
                    setSearchOpen(true);
                    if (sheetPos === 'collapsed') setSheetPos('half');
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-text-soft hover:bg-surface-2"
                >
                  <Search size={16} aria-hidden />
                </button>
              </>
            )}
          </div>
        }
      >
        {/* N20: aviso de espacio */}
        {spaceLow && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-card border border-border bg-surface-2 px-3 py-2.5">
            <p className="text-[13px] font-medium text-text">{t('editor.espacioBajo')}</p>
            <Button variant="secondary" onClick={() => setInventoryOpen(true)}>
              {t('editor.verPiezas')}
            </Button>
          </div>
        )}
        {!backFacing && (
          <button
            type="button"
            onClick={() => setSnapTarget('trasera')}
            className="mb-3 w-full rounded-card border border-border bg-surface-2 px-4 py-3 text-center text-[13px] font-medium text-text-soft"
          >
            {t('toasts.T11')}
          </button>
        )}
        {/* N9: composicion activa */}
        {composition && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-card border border-pink-300 bg-pink-100 px-3 py-2.5">
            <p className="text-[13px] font-medium text-pink-700">
              {t('editor.composiciones.activa', {
                nombre: t(`editor.composiciones.${composition.id}`),
                n: composition.next + 1,
                total: composition.anchors.length,
              })}
            </p>
            <Button variant="secondary" onClick={() => setComposition(null)}>
              {t('editor.composiciones.salir')}
            </Button>
          </div>
        )}
        <div className={backFacing ? '' : 'pointer-events-auto opacity-50'}>
          {searchOpen && query ? (
            searchResults.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="text-[13px] text-text-soft">
                  {t('editor.buscar.sinResultados', { q: searchQuery.trim() })}
                </p>
                <Button variant="secondary" onClick={() => setSearchQuery('')}>
                  {t('common.acciones.limpiar')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
                {searchResults.map((el) => renderThumbButton(el, true))}
              </div>
            )
          ) : (
            <>
              {/* N8: recientes y favoritos al frente del panel */}
              {!replacingCategoria && recents.length > 0 && (
                <section className="mb-3">
                  <h3 className="mb-1.5 text-[12px] font-semibold text-text-soft">
                    {t('editor.panel.recientes')}
                  </h3>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {recents
                      .map((id) => catalog.get(id))
                      .filter((el): el is CatalogElement => Boolean(el))
                      .map((el) => (
                        <div key={el.id} className="w-[84px] shrink-0">
                          {renderThumbButton(el)}
                        </div>
                      ))}
                  </div>
                </section>
              )}
              {!replacingCategoria && favorites.length > 0 && (
                <section className="mb-3">
                  <h3 className="mb-1.5 text-[12px] font-semibold text-text-soft">
                    {t('editor.panel.favoritos')}
                  </h3>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {favorites
                      .map((id) => catalog.get(id))
                      .filter((el): el is CatalogElement => Boolean(el))
                      .map((el) => (
                        <div key={el.id} className="w-[84px] shrink-0">
                          {renderThumbButton(el)}
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* N9/N10: composiciones y diseno sorpresa */}
              {!replacingCategoria && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {!composition && (
                    <Button variant="secondary" onClick={() => setCompositionsOpen(true)}>
                      {t('editor.composiciones.titulo')}
                    </Button>
                  )}
                  {store.items.length === 0 && (
                    <Button variant="ghost" onClick={generateSurprise}>
                      {t('editor.sorpresa.cta')}
                    </Button>
                  )}
                </div>
              )}

              {/* Parte IV.5: contador por pestana */}
              <p className="mb-2 text-[12px] text-text-soft">
                {t('editor.panel.contador', { categoria: activeTabLabel, n: tabElements.length })}
              </p>

              {activeTab === 'letras' && !replacingCategoria && (
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

              {/* Parte IV.1: sub-secciones charm/sticker */}
              {activeTab === 'letras' && !replacingCategoria ? (
                <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
                  {tabElements.map((el) => renderThumbButton(el))}
                </div>
              ) : (
                <>
                  {tabCharms.length > 0 && (
                    <section className="mb-3">
                      <h3 className="mb-1.5 text-[12px] font-semibold text-text-soft">
                        {t('editor.panel.charms')}
                      </h3>
                      <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
                        {tabCharms.map((el) => renderThumbButton(el))}
                      </div>
                    </section>
                  )}
                  {tabStickers.length > 0 && (
                    <section className="mb-3">
                      <h3 className="mb-1.5 text-[12px] font-semibold text-text-soft">
                        {t('editor.panel.adhesivos')}
                      </h3>
                      <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
                        {tabStickers.map((el) => renderThumbButton(el))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
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
          <label className="flex h-11 items-center justify-between rounded-control border border-border px-3 text-[15px] font-medium">
            {t('editor.menu.guias')}
            <input
              type="checkbox"
              checked={guidesEnabled}
              onChange={(e) => setGuidesEnabled(e.target.checked)}
              className="h-4 w-4 accent-pink-700"
            />
          </label>
          <label className="flex h-11 items-center justify-between rounded-control border border-border px-3 text-[15px] font-medium">
            {t('editor.menu.vibracion')}
            <input
              type="checkbox"
              checked={haptics}
              onChange={(e) => {
                setHaptics(e.target.checked);
                setHapticsEnabled(e.target.checked);
              }}
              className="h-4 w-4 accent-pink-700"
            />
          </label>
          {/* N6: cambiador de variante sin salir del editor */}
          {currentCase && (
            <div className="rounded-control border border-border p-3">
              <p className="mb-2 text-[13px] font-medium text-text-soft">{currentCase.nombre}</p>
              <div className="flex flex-wrap gap-2">
                {currentCase.variantes.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-label={v.disponible ? v.colorNombre : `${v.colorNombre}: ${t('common.precio.agotado')}`}
                    aria-pressed={v.id === store.variantId}
                    disabled={!v.disponible}
                    title={v.disponible ? v.colorNombre : t('common.precio.agotado')}
                    onClick={() => {
                      store.setVariant(v);
                      track('variante_cambiada_en_editor');
                    }}
                    className={`relative h-8 w-8 rounded-full border-2 ${
                      v.id === store.variantId ? 'border-pink-500 ring-2 ring-pink-500/30' : 'border-border'
                    } ${v.disponible ? '' : 'cursor-not-allowed opacity-50'}`}
                    style={{ backgroundColor: v.colorHex }}
                  >
                    {!v.disponible && (
                      <span
                        aria-hidden
                        className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-text-soft"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* N4: lista de piezas */}
          <Button variant="secondary" onClick={() => { setMenuOpen(false); setInventoryOpen(true); }}>
            {t('editor.menu.piezas', { n: store.items.length })}
          </Button>
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
          <Button variant="secondary" onClick={() => { setMenuOpen(false); setShortcutsOpen(true); }}>
            {t('editor.menu.atajos')}
          </Button>
          <Button variant="secondary" onClick={() => { setMenuOpen(false); setHelpOpen(true); }}>
            {t('editor.menu.ayuda')}
          </Button>
        </div>
      </Modal>

      {/* N9: selector de composiciones */}
      <Modal
        open={compositionsOpen}
        onClose={() => setCompositionsOpen(false)}
        title={t('editor.composiciones.titulo')}
      >
        <p className="mb-3 text-[13px] text-text-soft">{t('editor.composiciones.texto')}</p>
        <div className="flex flex-col gap-2">
          {COMPOSITIONS.map((id) => (
            <Button
              key={id}
              variant="secondary"
              onClick={() => {
                if (!device) return;
                const anchors = compositionAnchors(id, device);
                setComposition({ id, anchors, next: 0 });
                setCompositionsOpen(false);
                track('composicion_aplicada', { tipo: id });
              }}
            >
              {t(`editor.composiciones.${id}`)}
            </Button>
          ))}
        </div>
      </Modal>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title={t('editor.menu.ayuda')}>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[13px] text-text-soft">
          <li>{t('editor.ayuda.orbita')}</li>
          <li>{t('editor.ayuda.mover')}</li>
          <li>{t('editor.ayuda.rotar')}</li>
          <li>{t('editor.ayuda.tamano')}</li>
        </ul>
      </Modal>

      {/* N17: atajos de teclado */}
      <Modal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title={t('editor.atajos.titulo')}>
        <table className="w-full text-[13px]">
          <tbody>
            {(
              [
                ['editor.atajos.mover', 'Flechas'],
                ['editor.atajos.moverRapido', 'Shift + Flechas'],
                ['editor.atajos.rotar', 'R'],
                ['editor.atajos.rotarInverso', 'Shift + R'],
                ['editor.atajos.eliminar', 'Supr'],
                ['editor.atajos.siguientePieza', 'Tab'],
                ['editor.atajos.deseleccionar', 'Esc'],
                ['editor.atajos.deshacer', 'Ctrl + Z'],
                ['editor.atajos.rehacer', 'Ctrl + Shift + Z'],
              ] as const
            ).map(([key, combo]) => (
              <tr key={key} className="border-b border-border last:border-b-0">
                <td className="py-2 text-text-soft">{t(key)}</td>
                <td className="tabular py-2 text-right font-medium">{combo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>

      {/* N4: inventario de piezas */}
      <Modal open={inventoryOpen} onClose={() => setInventoryOpen(false)} title={t('editor.menu.piezas', { n: store.items.length })}>
        <ul className="flex max-h-[50dvh] flex-col gap-1.5 overflow-y-auto">
          {store.items.map((item) => {
            const el = catalog.get(item.elementId);
            if (!el) return null;
            const locked = lockedIds.has(item.instanceId);
            return (
              <li key={item.instanceId} className="flex items-center gap-2 rounded-control border border-border px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    store.select(item.instanceId);
                    setFrameTarget({ xMm: item.xMm, yMm: item.yMm, sizeMm: Math.max(el.anchoMm, el.altoMm) });
                    setInventoryOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <ElementThumb element={el} size={28} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                    {item.letterChar ? `${el.nombre} (${item.letterChar})` : el.nombre}
                  </span>
                  <span className="tabular shrink-0 text-[13px] text-text-soft">
                    {formatCentimos(el.precioCentimos)}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={locked ? t('common.acciones.desbloquear') : t('common.acciones.bloquear')}
                  aria-pressed={locked}
                  onClick={() =>
                    setLockedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.instanceId)) next.delete(item.instanceId);
                      else {
                        next.add(item.instanceId);
                        track('pieza_bloqueada');
                      }
                      return next;
                    })
                  }
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${locked ? 'text-pink-700' : 'text-text-soft'}`}
                >
                  {locked ? <Lock size={14} aria-hidden /> : <LockOpen size={14} aria-hidden />}
                </button>
                <button
                  type="button"
                  aria-label={t('common.acciones.eliminar')}
                  disabled={locked}
                  onClick={() => removePiece(item.instanceId)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-error disabled:opacity-40"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            );
          })}
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
                      onClick={() => removePiece(line.instanceId!)}
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

      {/* Compartir (SS16.2 / N13) */}
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

      {/* N16: onboarding de tres pasos */}
      {tourStep !== null && !loading && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center pb-32">
          <div className="pointer-events-auto mx-4 w-full max-w-sm rounded-card border border-border bg-surface p-4 shadow-2">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((s) => (
                  <span
                    key={s}
                    className={`h-1.5 w-6 rounded-badge ${s <= tourStep ? 'bg-pink-500' : 'bg-surface-2'}`}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label={t('common.acciones.saltar')}
                onClick={() => {
                  setTourStep(null);
                  writeHint('cc.hints.tour');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-control text-text-soft hover:bg-surface-2"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <p className="mb-3 text-[15px] font-medium text-text">
              {t(`editor.tour.paso${tourStep + 1}` as 'editor.tour.paso1')}
            </p>
            <Button
              className="w-full"
              onClick={() => {
                if (tourStep >= 2) {
                  setTourStep(null);
                  writeHint('cc.hints.tour');
                  track('hint_completado', { hint: 'tour' });
                } else {
                  setTourStep(tourStep + 1);
                }
              }}
            >
              {tourStep >= 2 ? t('common.acciones.entendido') : t('common.acciones.siguiente')}
            </Button>
          </div>
        </div>
      )}
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
