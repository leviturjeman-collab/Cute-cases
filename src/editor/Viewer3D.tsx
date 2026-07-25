'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { buildCaseGeometry, buildElementMesh, mmToWorld } from '@/assets-procedural';
import { computeFitDistance, computeFitTargetY, computePieceFitDistance } from './camera/fit';
import type { CatalogElement, DeviceSpec, SnapView } from './types';
import { SNAP_POSES } from './types';
import type { PlacedItem } from '@/lib/collision';

/**
 * Visor 3D v4.3: estandar de realismo (SS9.1, E2/E3) con HDR de estudio
 * propio, encuadre derivado del fov y el area util (E1), asa de rotacion
 * (E5) y guias entre piezas (E6). Compartido por editor, fichas y regalo.
 */

const DEG = Math.PI / 180;

// Uniforms de rectAreaLight (softbox): se inicializan una sola vez
let rectAreaReady = false;
function ensureRectAreaUniforms() {
  if (!rectAreaReady) {
    RectAreaLightUniformsLib.init();
    rectAreaReady = true;
  }
}

/** Softbox de estudio: luz de area orientada al origen, con caida suave. */
function Softbox({
  position,
  size,
  intensity,
  color = '#FFFFFF',
}: {
  position: [number, number, number];
  size: [number, number];
  intensity: number;
  color?: string;
}) {
  const ref = useRef<THREE.RectAreaLight>(null);
  useEffect(() => {
    ref.current?.lookAt(0, 0, 0);
  }, []);
  return (
    <rectAreaLight ref={ref} args={[color, intensity, size[0], size[1]]} position={position} />
  );
}

export interface ItemVisualState {
  selected?: boolean;
  invalid?: boolean;
  collided?: boolean;
  expired?: boolean;
  ghost?: boolean;
  locked?: boolean;
}

/** Guia de alineacion (E6): segmento en mm de dispositivo. */
export interface GuideLine {
  axis: 'v' | 'h';
  posMm: number;
  fromMm?: number;
  toMm?: number;
}

/** Encaje a una pieza (N5); null = funda completa. */
export interface FrameTarget {
  xMm: number;
  yMm: number;
  sizeMm: number;
}

export interface Viewer3DProps {
  device: DeviceSpec;
  material: string;
  colorHex: string;
  items: PlacedItem[];
  catalog: ReadonlyMap<string, CatalogElement>;
  visualStates?: ReadonlyMap<string, ItemVisualState>;
  showGrid?: boolean;
  guides?: GuideLine[];
  lowPerf?: boolean;
  /** Pose objetivo de un chip de vista; null = control libre del usuario. */
  snapTarget?: SnapView | null;
  onSnapReached?: () => void;
  onCameraChange?: (state: { azimuthDeg: number; polarDeg: number }) => void;
  onItemPointerDown?: (instanceId: string, e: ThreeEvent<PointerEvent>) => void;
  onPlanePointerMove?: (xMm: number, yMm: number, e: ThreeEvent<PointerEvent>) => void;
  onBackgroundTap?: () => void;
  controlsEnabled?: boolean;
  controlsRef?: (c: OrbitControlsImpl | null) => void;
  /** Franjas de UI superpuesta al canvas (E1); el padding externo ya no cuenta. */
  occlusions?: { topPx: number; bottomPx: number };
  /** Incrementar para reencuadrar explicitamente (boton, doble tap). */
  fitSignal?: number;
  /** Pieza a encuadrar (N5); null = encuadre de funda completa. */
  frameTarget?: FrameTarget | null;
  /** Asa de rotacion (E5) sobre esta pieza. */
  rotationHandleFor?: { item: PlacedItem; element: CatalogElement } | null;
  onHandlePointerDown?: (instanceId: string, e: ThreeEvent<PointerEvent>) => void;
  /** Giro suave automatico hasta la primera interaccion (hero de la home). */
  autoRotate?: boolean;
  /** Sin fondo propio: el canvas se integra en el fondo de la pagina. */
  transparentBg?: boolean;
  className?: string;
}

interface CamAnim {
  fromAz: number;
  toAz: number;
  fromPol: number;
  toPol: number;
  fromDist: number;
  toDist: number;
  fromTx: number;
  toTx: number;
  fromTy: number;
  toTy: number;
  start: number;
  dur: number;
  notify?: boolean;
}

/**
 * Rig E1: limites SS7.3, encaje por formula (nunca constante estetica),
 * target desplazado al centro del area util y reencuadres animados.
 */
function CameraRig({
  device,
  snapTarget,
  onSnapReached,
  onCameraChange,
  controlsEnabled,
  controlsRef,
  occlusions,
  fitSignal,
  frameTarget,
  autoRotate = false,
}: Pick<
  Viewer3DProps,
  | 'device'
  | 'snapTarget'
  | 'onSnapReached'
  | 'onCameraChange'
  | 'controlsEnabled'
  | 'controlsRef'
  | 'occlusions'
  | 'fitSignal'
  | 'frameTarget'
  | 'autoRotate'
>) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const { camera, gl, size } = useThree();
  const anim = useRef<CamAnim | null>(null);
  const booted = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [spinning, setSpinning] = useState(autoRotate);

  // El giro automatico se detiene en la primera interaccion del usuario
  useEffect(() => {
    const c = controls.current;
    if (!c || !autoRotate) return;
    const stop = () => setSpinning(false);
    c.addEventListener('start', stop);
    return () => c.removeEventListener('start', stop);
  }, [autoRotate]);

  const occTop = occlusions?.topPx ?? 0;
  const occBottom = occlusions?.bottomPx ?? 0;
  const occ = useMemo(() => ({ topPx: occTop, bottomPx: occBottom }), [occTop, occBottom]);
  const dFit = computeFitDistance(device, size, occ);
  const fitTy = computeFitTargetY(dFit, size, occ);

  useEffect(() => {
    controlsRef?.(controls.current);
  });

  // Hook de depuracion para el test e2e matricial (solo desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __ccFit?: object }).__ccFit = {
      dFit,
      fitTy,
      size: { width: size.width, height: size.height },
      device: { anchoMm: device.anchoMm, altoMm: device.altoMm },
      occlusions: occ,
      getCamera: () => {
        const c = controls.current;
        if (!c) return null;
        return {
          distance: c.object.position.distanceTo(c.target),
          targetY: c.target.y,
          azimuthDeg: c.getAzimuthalAngle() / DEG,
          polarDeg: c.getPolarAngle() / DEG,
        };
      },
    };
  }, [dFit, fitTy, size.width, size.height, device.anchoMm, device.altoMm, occ]);

  const startAnim = (to: Partial<CamAnim> & { dur: number; notify?: boolean }) => {
    const c = controls.current;
    if (!c) return;
    anim.current = {
      fromAz: c.getAzimuthalAngle(),
      toAz: to.toAz ?? c.getAzimuthalAngle(),
      fromPol: c.getPolarAngle(),
      toPol: to.toPol ?? c.getPolarAngle(),
      fromDist: c.object.position.distanceTo(c.target),
      toDist: to.toDist ?? c.object.position.distanceTo(c.target),
      fromTx: c.target.x,
      toTx: to.toTx ?? c.target.x,
      fromTy: c.target.y,
      toTy: to.toTy ?? c.target.y,
      start: performance.now(),
      dur: to.dur,
      notify: to.notify,
    };
  };

  // Chips de vista (SS7.3): restauran angulos Y distancia Y target (E1.4)
  useEffect(() => {
    if (!snapTarget || !controls.current) return;
    const pose = SNAP_POSES[snapTarget];
    startAnim({
      toAz: pose.azimuthDeg * DEG,
      toPol: pose.polarDeg * DEG,
      toDist: dFit,
      toTx: 0,
      toTy: fitTy,
      dur: 400,
      notify: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapTarget]);

  // Reencuadre explicito (boton Reencuadrar / doble tap, E1.4)
  useEffect(() => {
    if (!fitSignal || !controls.current) return;
    startAnim({
      toAz: SNAP_POSES.trasera.azimuthDeg * DEG,
      toPol: SNAP_POSES.trasera.polarDeg * DEG,
      toDist: dFit,
      toTx: 0,
      toTy: fitTy,
      dur: 250,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  // Zoom a pieza (N5): viaje de 300 ms manteniendo la vista trasera
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (frameTarget) {
      const [wx, wy] = mmToWorld(frameTarget.xMm, frameTarget.yMm, device);
      startAnim({
        toAz: SNAP_POSES.trasera.azimuthDeg * DEG,
        toPol: SNAP_POSES.trasera.polarDeg * DEG,
        toDist: Math.max(computePieceFitDistance(frameTarget.sizeMm, size), dFit * 0.45),
        toTx: wx,
        toTy: wy,
        dur: 300,
      });
    } else if (booted.current) {
      startAnim({ toDist: dFit, toTx: 0, toTy: fitTy, dur: 300 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameTarget]);

  // Reencuadre reactivo (E1.2): resize/orientacion/occlusions, debounce 150 ms
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (!booted.current) {
      booted.current = true;
      c.target.set(0, fitTy, 0);
      const az = SNAP_POSES.trasera.azimuthDeg * DEG;
      const pol = SNAP_POSES.trasera.polarDeg * DEG;
      c.object.position.set(
        dFit * Math.sin(pol) * Math.sin(az),
        fitTy + dFit * Math.cos(pol),
        dFit * Math.sin(pol) * Math.cos(az),
      );
      c.update();
      return;
    }
    if (frameTarget) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      startAnim({ toDist: dFit, toTy: fitTy, dur: 250 });
    }, 150);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dFit, fitTy]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    if (anim.current) {
      const a = anim.current;
      const t = Math.min(1, (performance.now() - a.start) / a.dur);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out
      const az = a.fromAz + (a.toAz - a.fromAz) * e;
      const pol = a.fromPol + (a.toPol - a.fromPol) * e;
      const dist = a.fromDist + (a.toDist - a.fromDist) * e;
      c.target.x = a.fromTx + (a.toTx - a.fromTx) * e;
      c.target.y = a.fromTy + (a.toTy - a.fromTy) * e;
      const offset = new THREE.Vector3().setFromSphericalCoords(dist, pol, az);
      c.object.position.copy(c.target).add(offset);
      c.update();
      if (t >= 1) {
        const notify = a.notify;
        anim.current = null;
        if (notify) onSnapReached?.();
      }
    }
    onCameraChange?.({
      azimuthDeg: c.getAzimuthalAngle() / DEG,
      polarDeg: c.getPolarAngle() / DEG,
    });
  });

  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  return (
    <OrbitControls
      ref={controls}
      args={[camera, gl.domElement]}
      enabled={controlsEnabled !== false}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={coarse ? 0.7 : 0.9}
      minPolarAngle={55 * DEG}
      maxPolarAngle={125 * DEG}
      minAzimuthAngle={-80 * DEG}
      maxAzimuthAngle={80 * DEG}
      autoRotate={spinning}
      autoRotateSpeed={1.1}
      // E1.3: alejar al maximo = funda completa; no existe "mas lejos y cortada"
      minDistance={dFit * 0.45}
      maxDistance={dFit}
    />
  );
}

function CaseModel({ device, material, colorHex }: { device: DeviceSpec; material: string; colorHex: string }) {
  const group = useMemo(
    () =>
      buildCaseGeometry(
        {
          anchoMm: device.anchoMm,
          altoMm: device.altoMm,
          radioEsquinaMm: device.radioEsquinaMm,
          grosorMm: device.grosorMm,
          cameraZone: device.cameraZone,
          moduloForma: device.moduloForma,
        },
        material,
        colorHex,
      ),
    [device, material, colorHex],
  );
  useEffect(() => () => {
    group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }, [group]);
  return <primitive object={group} />;
}

function silhouetteShape(el: CatalogElement, inflate = 1): THREE.Shape {
  const shape = new THREE.Shape();
  const first = el.hitbox[0];
  if (!first || first.length < 3) {
    const w = el.anchoMm / 2 + inflate;
    const h = el.altoMm / 2 + inflate;
    shape.moveTo(-w, -h);
    shape.lineTo(w, -h);
    shape.lineTo(w, h);
    shape.lineTo(-w, h);
    shape.closePath();
    return shape;
  }
  const scale = 1 + (inflate * 2) / Math.max(el.anchoMm, el.altoMm);
  first.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x * scale, -p.y * scale);
    else shape.lineTo(p.x * scale, -p.y * scale);
  });
  shape.closePath();
  return shape;
}

function ItemNode({
  item,
  element,
  device,
  state,
  onPointerDown,
}: {
  item: PlacedItem;
  element: CatalogElement;
  device: DeviceSpec;
  state?: ItemVisualState;
  onPointerDown?: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const mesh = useMemo(
    () =>
      buildElementMesh(element.recipe ?? 'fallback', {
        anchoMm: element.anchoMm,
        altoMm: element.altoMm,
        profundidadMm: element.profundidadMm,
        acabado: element.acabado,
        colores: element.colores,
        letraChar: item.letterChar ?? element.letraChar,
        recipeParams: element.recipeParams,
      }),
    [element, item.letterChar],
  );
  useEffect(() => () => {
    mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }, [mesh]);

  const overlayGeo = useMemo(() => new THREE.ShapeGeometry(silhouetteShape(element)), [element]);
  const [wx, wy] = mmToWorld(item.xMm, item.yMm, device);

  return (
    <group
      position={[wx, wy, 0.05]}
      rotation={[0, 0, -item.rotationDeg * DEG]}
      onPointerDown={
        onPointerDown
          ? (e) => {
              e.stopPropagation();
              onPointerDown(item.instanceId, e);
            }
          : undefined
      }
    >
      {(state?.selected || state?.invalid || state?.collided) && (
        <mesh geometry={overlayGeo} position={[0, 0, -0.02]}>
          <meshBasicMaterial
            color={state.invalid || state.collided ? '#E5484D' : '#E84393'}
            transparent
            opacity={state.invalid ? 0.5 : 0.3}
            depthWrite={false}
          />
        </mesh>
      )}
      <group>
        <primitive object={mesh} />
        {(state?.expired || state?.ghost) && (
          <mesh geometry={overlayGeo} position={[0, 0, (element.profundidadMm ?? 1) + 0.4]}>
            <meshBasicMaterial
              color={state?.expired ? '#FFFFFF' : '#E84393'}
              transparent
              opacity={state?.expired ? 0.55 : 0.15}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

/**
 * Asa de rotacion (E5): circulo conectado por un vastago al borde superior
 * de la caja rotada de la pieza; participa del arbitraje como origen propio.
 */
function RotationHandle({
  item,
  element,
  device,
  onPointerDown,
}: {
  item: PlacedItem;
  element: CatalogElement;
  device: DeviceSpec;
  onPointerDown?: (id: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const [wx, wy] = mmToWorld(item.xMm, item.yMm, device);
  const stemLen = 5;
  const topY = element.altoMm / 2;
  const cy = topY + stemLen;
  const zLift = (element.profundidadMm ?? 1) + 0.6;
  return (
    <group position={[wx, wy, 0.05]} rotation={[0, 0, -item.rotationDeg * DEG]}>
      <mesh position={[0, topY + stemLen / 2, zLift]}>
        <planeGeometry args={[0.25, stemLen]} />
        <meshBasicMaterial color="#E84393" depthWrite={false} depthTest={false} transparent />
      </mesh>
      <mesh position={[0, cy, zLift]} renderOrder={30}>
        <ringGeometry args={[1.7, 2.4, 32]} />
        <meshBasicMaterial color="#E84393" depthWrite={false} depthTest={false} transparent />
      </mesh>
      <mesh position={[0, cy, zLift]} renderOrder={30}>
        <circleGeometry args={[1.7, 32]} />
        <meshBasicMaterial color="#FFFFFF" depthWrite={false} depthTest={false} transparent opacity={0.9} />
      </mesh>
      {/* Zona tactil generosa (44 px equivalentes) */}
      <mesh
        position={[0, cy, zLift + 0.1]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown?.(item.instanceId, e);
        }}
      >
        <circleGeometry args={[4.2, 24]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}

function Grid5({ device }: { device: DeviceSpec }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let x = 0; x <= device.anchoMm; x += 5) {
      const [wx] = mmToWorld(x, 0, device);
      pts.push(wx, -device.altoMm / 2, 0.12, wx, device.altoMm / 2, 0.12);
    }
    for (let y = 0; y <= device.altoMm; y += 5) {
      const [, wy] = mmToWorld(0, y, device);
      pts.push(-device.anchoMm / 2, wy, 0.12, device.anchoMm / 2, wy, 0.12);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [device]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#EFE3EA" transparent opacity={0.6} />
    </lineSegments>
  );
}

/** Guias E6: lineas 1 px --pink-500 que abarcan las piezas implicadas. */
function Guides({ device, guides }: { device: DeviceSpec; guides: GuideLine[] }) {
  return (
    <>
      {guides.map((g, i) => {
        if (g.axis === 'v') {
          const from = g.fromMm ?? 0;
          const to = g.toMm ?? device.altoMm;
          const [wx] = mmToWorld(g.posMm, 0, device);
          const [, wy1] = mmToWorld(0, from, device);
          const [, wy2] = mmToWorld(0, to, device);
          return (
            <mesh key={i} position={[wx, (wy1 + wy2) / 2, 0.14]}>
              <planeGeometry args={[0.35, Math.abs(wy2 - wy1)]} />
              <meshBasicMaterial color="#E84393" transparent opacity={0.85} depthWrite={false} />
            </mesh>
          );
        }
        const from = g.fromMm ?? 0;
        const to = g.toMm ?? device.anchoMm;
        const [, wy] = mmToWorld(0, g.posMm, device);
        const [wx1] = mmToWorld(from, 0, device);
        const [wx2] = mmToWorld(to, 0, device);
        return (
          <mesh key={i} position={[(wx1 + wx2) / 2, wy, 0.14]}>
            <planeGeometry args={[Math.abs(wx2 - wx1), 0.35]} />
            <meshBasicMaterial color="#E84393" transparent opacity={0.85} depthWrite={false} />
          </mesh>
        );
      })}
    </>
  );
}

export function Viewer3D({
  device,
  material,
  colorHex,
  items,
  catalog,
  visualStates,
  showGrid = false,
  guides,
  lowPerf = false,
  snapTarget,
  onSnapReached,
  onCameraChange,
  onItemPointerDown,
  onPlanePointerMove,
  onBackgroundTap,
  controlsEnabled,
  controlsRef,
  occlusions,
  fitSignal,
  frameTarget,
  rotationHandleFor,
  onHandlePointerDown,
  autoRotate = false,
  transparentBg = false,
  className = '',
}: Viewer3DProps) {
  const baseDist = device.altoMm * 1.95;
  const initial = SNAP_POSES.trasera;

  return (
    <div
      className={`relative h-full w-full ${className}`}
      style={
        transparentBg
          ? undefined
          : { background: 'radial-gradient(circle at 50% 38%, #FFFFFF 0%, #FDF7FA 78%)' }
      }
    >
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={lowPerf ? 1 : [1, 2]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        camera={{
          fov: 32,
          near: 1,
          far: 2000,
          position: [
            baseDist * Math.sin(initial.polarDeg * DEG) * Math.sin(initial.azimuthDeg * DEG),
            baseDist * Math.cos(initial.polarDeg * DEG),
            baseDist * Math.sin(initial.polarDeg * DEG) * Math.cos(initial.azimuthDeg * DEG),
          ],
        }}
        onCreated={({ gl }) => {
          ensureRectAreaUniforms();
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.98;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
        onPointerMissed={onBackgroundTap}
      >
        <CameraRig
          device={device}
          snapTarget={snapTarget}
          onSnapReached={onSnapReached}
          onCameraChange={onCameraChange}
          controlsEnabled={controlsEnabled}
          controlsRef={controlsRef}
          occlusions={occlusions}
          fitSignal={fitSignal}
          frameTarget={frameTarget}
          autoRotate={autoRotate}
        />

        {/* Estudio fotografico (SS9.1/E2.3): softbox principal arriba a la
            izquierda (degradado suave sobre la trasera plana), relleno calido
            a la derecha, hemisferica tenue y una direccional baja solo para
            proyectar la sombra que las luces de area no pueden dar */}
        <hemisphereLight args={['#FFFFFF', '#EADDE4', 0.18]} />
        <Softbox position={[-160, 190, 210]} size={[340, 340]} intensity={1.6} />
        <Softbox position={[210, 30, 170]} size={[260, 260]} intensity={0.5} color="#FFF4EE" />
        <directionalLight
          position={[
            Math.cos(35 * DEG) * Math.sin(30 * DEG) * 200,
            Math.sin(35 * DEG) * 200,
            Math.cos(35 * DEG) * Math.cos(30 * DEG) * 200,
          ]}
          intensity={0.4}
          castShadow
          shadow-mapSize={lowPerf ? [1024, 1024] : [2048, 2048]}
          shadow-camera-left={-device.altoMm}
          shadow-camera-right={device.altoMm}
          shadow-camera-top={device.altoMm}
          shadow-camera-bottom={-device.altoMm}
        />
        <directionalLight position={[-120, -40, -160]} intensity={0.3} />
        <directionalLight position={[40, 120, -220]} intensity={0.22} />

        <Suspense fallback={null}>
          {/* E2: HDR de estudio real servido desde el propio origen; 512 en
              gama media/alta, 256 como suelo absoluto en gama baja */}
          <Environment
            files="/env/studio.hdr"
            resolution={lowPerf ? 256 : 512}
            environmentIntensity={0.7}
          />

          <group position={[0, 0, 0]}>
            <CaseModel device={device} material={material} colorHex={colorHex} />
            {showGrid && <Grid5 device={device} />}
            {guides && guides.length > 0 && <Guides device={device} guides={guides} />}
            {items.map((item) => {
              const element = catalog.get(item.elementId);
              if (!element) return null;
              return (
                <ItemNode
                  key={item.instanceId}
                  item={item}
                  element={element}
                  device={device}
                  state={visualStates?.get(item.instanceId)}
                  onPointerDown={onItemPointerDown}
                />
              );
            })}
            {rotationHandleFor && (
              <RotationHandle
                item={rotationHandleFor.item}
                element={rotationHandleFor.element}
                device={device}
                onPointerDown={onHandlePointerDown}
              />
            )}
            {onPlanePointerMove && (
              <mesh
                position={[0, 0, 0.2]}
                onPointerMove={(e) => {
                  const xMm = e.point.x + device.anchoMm / 2;
                  const yMm = device.altoMm / 2 - e.point.y;
                  onPlanePointerMove(xMm, yMm, e);
                }}
              >
                <planeGeometry args={[device.anchoMm * 2.6, device.altoMm * 2.2]} />
                <meshBasicMaterial visible={false} />
              </mesh>
            )}
          </group>

          {/* E3: sombra de contacto elipsoidal bajo la funda; frames=1 con
              invalidacion al cambiar variante/modelo via key */}
          <ContactShadows
            key={`${device.id}-${material}-${colorHex}`}
            position={[0, -device.altoMm / 2 - 2, 0]}
            opacity={0.35}
            blur={2.5}
            scale={device.altoMm * 1.6}
            far={device.grosorMm * 8}
            frames={1}
            resolution={lowPerf ? 256 : 1024}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
