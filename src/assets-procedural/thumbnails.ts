'use client';

import * as THREE from 'three';
import { buildElementMesh, type ElementSpec } from './recipes';

/**
 * Miniaturas renderizadas (SS10.4): generador offscreen con la iluminacion
 * de SS9.1, camara ortografica frontal con 15 grados de inclinacion, fondo
 * transparente, 256x256 WebP. Cache en memoria + IndexedDB (cc.thumbs),
 * clave elementId@hashReceta. Generacion en cola idle.
 */

const SIZE = 256;
const DB_NAME = 'cc.thumbs';
const STORE = 'thumbs';

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
const memoryCache = new Map<string, string>();

function ensureRenderer(): boolean {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(30, 40, 60);
    scene.add(key);
    const fill = new THREE.DirectionalLight('#ffffff', 0.8);
    fill.position.set(-30, -10, 40);
    scene.add(fill);
    scene.add(new THREE.AmbientLight('#fdf2f8', 1.1));
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    return true;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function dbGet(key: string): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    tx.onsuccess = () => resolve((tx.result as string | undefined) ?? null);
    tx.onerror = () => resolve(null);
  });
}

async function dbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
    tx.onsuccess = () => resolve();
    tx.onerror = () => resolve();
  });
}

function hashRecipe(recipe: string, spec: ElementSpec): string {
  const raw = JSON.stringify([recipe, spec.anchoMm, spec.altoMm, spec.profundidadMm, spec.acabado, spec.colores, spec.letraChar, spec.recipeParams]);
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Render sincrono de una miniatura (<= 30 ms objetivo en gama media). */
function renderThumb(recipe: string, spec: ElementSpec): string | null {
  if (!ensureRenderer() || !renderer || !scene || !camera) return null;
  const mesh = buildElementMesh(recipe, spec);
  scene.add(mesh);
  const half = Math.max(spec.anchoMm, spec.altoMm) * 0.62;
  camera.left = -half;
  camera.right = half;
  camera.top = half;
  camera.bottom = -half;
  // Frontal con 15 grados de inclinacion (SS10.4)
  const dist = half * 6;
  camera.position.set(0, -Math.sin((15 * Math.PI) / 180) * dist, Math.cos((15 * Math.PI) / 180) * dist);
  camera.lookAt(0, 0, (spec.profundidadMm ?? 2) / 2);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/webp', 0.85);
  scene.remove(mesh);
  mesh.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
  });
  return url;
}

/** Obtiene la miniatura de un elemento (cache memoria -> IndexedDB -> render). */
export async function getElementThumbnail(
  elementId: string,
  recipe: string,
  spec: ElementSpec,
): Promise<string | null> {
  const key = `${elementId}@${hashRecipe(recipe, spec)}`;
  const memo = memoryCache.get(key);
  if (memo) return memo;
  const stored = await dbGet(key);
  if (stored) {
    memoryCache.set(key, stored);
    return stored;
  }
  const url = renderThumb(recipe, spec);
  if (url) {
    memoryCache.set(key, url);
    void dbSet(key, url);
  }
  return url;
}

type QueueItem = { elementId: string; recipe: string; spec: ElementSpec; resolve: (v: string | null) => void };
const queue: QueueItem[] = [];
let pumping = false;

function pump(): void {
  if (pumping) return;
  pumping = true;
  const step = () => {
    const item = queue.shift();
    if (!item) {
      pumping = false;
      return;
    }
    void getElementThumbnail(item.elementId, item.recipe, item.spec).then((url) => {
      item.resolve(url);
      schedule(step);
    });
  };
  schedule(step);
}

function schedule(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => fn(), { timeout: 300 });
  else setTimeout(fn, 16);
}

/** Encola una miniatura para generacion en idle (SS10.4). */
export function queueElementThumbnail(
  elementId: string,
  recipe: string,
  spec: ElementSpec,
): Promise<string | null> {
  return new Promise((resolve) => {
    queue.push({ elementId, recipe, spec, resolve });
    pump();
  });
}
