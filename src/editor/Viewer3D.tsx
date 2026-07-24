'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { buildCaseGeometry, buildElementMesh, mmToWorld } from '@/assets-procedural';
import type { CatalogElement, DeviceSpec, SnapView } from './types';
import { SNAP_POSES } from './types';
import type { PlacedItem } from '@/lib/collision';

/**
 * Visor 3D v4: escena con el estandar de realismo (SS9.1) y camara de orbita
 * por arrastre directo con limites y amortiguacion (SS7.3, D3).
 * Compartido por editor, fichas, preestablecidos y pagina de regalo.
 */

const DEG = Math.PI / 180;

export interface ItemVisualState {
  selected?: boolean;
  invalid?: boolean;
  collided?: boolean;
  expired?: boolean;
  ghost?: boolean;
}

export interface Viewer3DProps {
  device: DeviceSpec;
  material: string;
  colorHex: string;
  items: PlacedItem[];
  catalog: ReadonlyMap<string, CatalogElement>;
  visualStates?: ReadonlyMap<string, ItemVisualState>;
  showGrid?: boolean;
  guides?: { v?: number | null; h?: number | null };
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
  className?: string;
}

/** Rig: limites SS7.3 + interpolacion de 400 ms hacia los chips de vista. */
function CameraRig({
  device,
  snapTarget,
  onSnapReached,
  onCameraChange,
  controlsEnabled,
  controlsRef,
}: Pick<Viewer3DProps, 'device' | 'snapTarget' | 'onSnapReached' | 'onCameraChange' | 'controlsEnabled' | 'controlsRef'>) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const { camera, gl } = useThree();
  const anim = useRef<{ fromAz: number; fromPol: number; toAz: number; toPol: number; start: number } | null>(null);
  const baseDist = device.altoMm * 1.15;

  useEffect(() => {
    controlsRef?.(controls.current);
  });

  useEffect(() => {
    if (!snapTarget || !controls.current) return;
    const pose = SNAP_POSES[snapTarget];
    anim.current = {
      fromAz: controls.current.getAzimuthalAngle(),
      fromPol: controls.current.getPolarAngle(),
      toAz: pose.azimuthDeg * DEG,
      toPol: pose.polarDeg * DEG,
      start: performance.now(),
    };
  }, [snapTarget]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    if (anim.current) {
      const t = Math.min(1, (performance.now() - anim.current.start) / 400);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out
      const az = anim.current.fromAz + (anim.current.toAz - anim.current.fromAz) * e;
      const pol = anim.current.fromPol + (anim.current.toPol - anim.current.fromPol) * e;
      c.setAzimuthalAngle(az);
      c.setPolarAngle(pol);
      c.update();
      if (t >= 1) {
        anim.current = null;
        onSnapReached?.();
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
      minDistance={baseDist / 1.8}
      maxDistance={baseDist / 0.8}
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
  // La funda vive en el plano XZ del mundo? No: XY con +Z hacia la camara.
  // Rotamos el grupo para que la trasera mire al eje +Z de orbita (y-up).
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
  const opacity = state?.ghost ? 0.75 : 1;

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
      <group scale={1} visible>
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
      {opacity < 1 && null}
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
  className = '',
}: Viewer3DProps) {
  const baseDist = device.altoMm * 1.15;
  const initial = SNAP_POSES.trasera;

  return (
    <div
      className={`relative h-full w-full ${className}`}
      style={{ background: 'radial-gradient(circle at 50% 38%, #FFFFFF 0%, #FDF7FA 78%)' }}
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
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
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
        />

        {/* SS9.1: luz principal direccional 1.2 (elev 35, az 30) + relleno 0.35 */}
        <directionalLight
          position={[
            Math.cos(35 * DEG) * Math.sin(30 * DEG) * 200,
            Math.sin(35 * DEG) * 200,
            Math.cos(35 * DEG) * Math.cos(30 * DEG) * 200,
          ]}
          intensity={1.2}
          castShadow
          shadow-mapSize={lowPerf ? [1024, 1024] : [2048, 2048]}
          shadow-camera-left={-device.altoMm}
          shadow-camera-right={device.altoMm}
          shadow-camera-top={device.altoMm}
          shadow-camera-bottom={-device.altoMm}
        />
        <directionalLight position={[-120, -40, -160]} intensity={0.35} />

        <Suspense fallback={null}>
          {/* Entorno de estudio neutro generado por lightformers (sin red) */}
          <Environment resolution={lowPerf ? 64 : 256} frames={1} environmentIntensity={0.9}>
            <Lightformer intensity={2.2} position={[0, 4, 6]} scale={[9, 5, 1]} color="#ffffff" />
            <Lightformer intensity={1.1} position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} color="#fff5fa" />
            <Lightformer intensity={0.9} position={[6, -1, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} color="#ffffff" />
            <Lightformer intensity={0.6} position={[0, -5, 3]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} color="#fdf2f8" />
          </Environment>

          {/* La funda flota 2 mm sobre el suelo de sombra (SS9.1) */}
          <group position={[0, 0, 0]}>
            <CaseModel device={device} material={material} colorHex={colorHex} />
            {showGrid && <Grid5 device={device} />}
            {typeof guides?.v === 'number' && (
              <mesh position={[guides.v - device.anchoMm / 2, 0, 0.14]}>
                <planeGeometry args={[0.35, device.altoMm]} />
                <meshBasicMaterial color="#E84393" transparent opacity={0.85} depthWrite={false} />
              </mesh>
            )}
            {typeof guides?.h === 'number' && (
              <mesh position={[0, device.altoMm / 2 - guides.h, 0.14]}>
                <planeGeometry args={[device.anchoMm, 0.35]} />
                <meshBasicMaterial color="#E84393" transparent opacity={0.85} depthWrite={false} />
              </mesh>
            )}
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

          {!lowPerf && (
            <ContactShadows
              position={[0, -device.altoMm / 2 - 2, 0]}
              opacity={0.35}
              blur={2.5}
              width={device.anchoMm * 3.2}
              height={device.altoMm * 1.4}
              far={device.altoMm * 0.8}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
