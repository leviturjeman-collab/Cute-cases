'use client';

import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { CatalogElement, DeviceGeometry, ElementInstance, VariantInfo, ViewName } from './types';
import { CaseMesh, ElementMesh, mmToWorld } from './meshes';
import { transformPolygon } from '@/lib/collision';

/** Posiciones de cámara de las 5 vistas controladas (§6.2). */
function viewTarget(view: ViewName, device: DeviceGeometry): THREE.Vector3 {
  const d = device.altoMm * 1.35;
  switch (view) {
    case 'trasera':
      return new THREE.Vector3(0, -device.altoMm * 0.08, d);
    case 'lateral-izq':
      return new THREE.Vector3(-d * 0.9, 0, d * 0.25);
    case 'lateral-der':
      return new THREE.Vector3(d * 0.9, 0, d * 0.25);
    case 'esquina-sup':
      return new THREE.Vector3(d * 0.45, device.altoMm * 0.5, d * 0.7);
    case 'esquina-inf':
      return new THREE.Vector3(d * 0.45, -device.altoMm * 0.5, d * 0.7);
  }
}

/** Transición animada de cámara (400–500 ms) + zoom limitado 0.8×–1.6× (§6.2). */
function CameraRig({ view, device, zoom }: { view: ViewName; device: DeviceGeometry; zoom: number }) {
  const { camera } = useThree();
  const target = useMemo(() => viewTarget(view, device), [view, device]);

  useFrame((_, delta) => {
    const desired = target.clone().multiplyScalar(1 / zoom);
    // Amortiguación exponencial ≈ transición de ~450 ms
    const k = 1 - Math.exp(-delta * 7);
    camera.position.lerp(desired, k);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export interface InstanceVisualState {
  selected?: boolean;
  invalid?: boolean;
  /** Colisionado por el elemento en movimiento (resalte rojo punteado, §6.5). */
  collidedWith?: boolean;
  /** Elemento caducado: atenuado, no movible (§4.5). */
  expired?: boolean;
}

export interface CaseViewerProps {
  device: DeviceGeometry;
  variant: VariantInfo;
  instances: ElementInstance[];
  catalog: ReadonlyMap<string, CatalogElement>;
  view: ViewName;
  zoom?: number;
  /** Estados visuales por instanceId (selección, inválido, caducado…). */
  visualStates?: ReadonlyMap<string, InstanceVisualState>;
  /** Cuadrícula de 5 mm opcional (§6.6). */
  showGrid?: boolean;
  /** Guías dinámicas de alineación en mm (§6.6): eje vertical/horizontal. */
  guides?: { v?: number | null; h?: number | null };
  onElementPointerDown?: (instanceId: string, e: ThreeEvent<PointerEvent>) => void;
  onBackgroundPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  /** Plano invisible de la cara trasera para raycast de drag (solo editor). */
  onPlanePointerMove?: (xMm: number, yMm: number, e: ThreeEvent<PointerEvent>) => void;
  className?: string;
}

function InstanceGroup({
  inst,
  element,
  device,
  state,
  onPointerDown,
}: {
  inst: ElementInstance;
  element: CatalogElement;
  device: DeviceGeometry;
  state?: InstanceVisualState;
  onPointerDown?: (instanceId: string, e: ThreeEvent<PointerEvent>) => void;
}) {
  const [x, y] = mmToWorld(inst.xMm, inst.yMm, device);
  const rotation = -THREE.MathUtils.degToRad(inst.rotacionGrados);

  // Halo/overlay a partir de la hitbox real del elemento
  const overlayGeo = useMemo(() => {
    const hitbox = element.hitbox ?? [
      { x: -element.anchoMm / 2, y: -element.altoMm / 2 },
      { x: element.anchoMm / 2, y: -element.altoMm / 2 },
      { x: element.anchoMm / 2, y: element.altoMm / 2 },
      { x: -element.anchoMm / 2, y: element.altoMm / 2 },
    ];
    // margen visual de 1 mm alrededor
    const scale = 1 + 2 / Math.max(element.anchoMm, element.altoMm);
    const poly = transformPolygon(hitbox, 0, 0, 0).map((p) => ({ x: p.x * scale, y: -p.y * scale }));
    const shape = new THREE.Shape();
    poly.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)));
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [element]);

  return (
    <group
      position={[x, y, 0.2]}
      rotation={[0, 0, rotation]}
      onPointerDown={
        onPointerDown
          ? (e) => {
              e.stopPropagation();
              onPointerDown(inst.instanceId, e);
            }
          : undefined
      }
    >
      {(state?.selected || state?.invalid || state?.collidedWith) && (
        <mesh geometry={overlayGeo} position={[0, 0, -0.05]}>
          <meshBasicMaterial
            color={state.invalid || state.collidedWith ? '#FF3B5C' : '#FF69B4'}
            transparent
            opacity={state.invalid ? 0.55 : 0.35}
            depthWrite={false}
          />
        </mesh>
      )}
      <group scale={state?.expired ? 0.999 : 1}>
        <ElementMesh element={element} />
        {state?.expired && (
          <mesh geometry={overlayGeo} position={[0, 0, (element.profundidadMm ?? 3) + 0.3]}>
            <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
          </mesh>
        )}
      </group>
    </group>
  );
}

function Grid5mm({ device }: { device: DeviceGeometry }) {
  const geo = useMemo(() => {
    const points: number[] = [];
    for (let x = 0; x <= device.anchoMm; x += 5) {
      const [wx] = mmToWorld(x, 0, device);
      points.push(wx, -device.altoMm / 2, 0.25, wx, device.altoMm / 2, 0.25);
    }
    for (let y = 0; y <= device.altoMm; y += 5) {
      const [, wy] = mmToWorld(0, y, device);
      points.push(-device.anchoMm / 2, wy, 0.25, device.anchoMm / 2, wy, 0.25);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, [device]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#FFA1CF" transparent opacity={0.35} />
    </lineSegments>
  );
}

/**
 * Visor 3D compartido (§6.2–6.3): giro controlado entre 5 vistas, materiales
 * PBR, sombras suaves, fondo degradado rosa. Usado por editor, fichas,
 * preestablecidos y página regalo (solo ver).
 */
export function CaseViewer({
  device,
  variant,
  instances,
  catalog,
  view,
  zoom = 1,
  visualStates,
  showGrid = false,
  guides,
  onElementPointerDown,
  onBackgroundPointerDown,
  onPlanePointerMove,
  className = '',
}: CaseViewerProps) {
  const planeRef = useRef<THREE.Mesh>(null);

  return (
    <div
      className={`relative h-full w-full ${className}`}
      style={{
        background: 'radial-gradient(circle at 50% 35%, var(--pink-50) 0%, var(--pink-100) 75%)',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        camera={{ fov: 35, near: 1, far: 2000, position: [0, 0, device.altoMm * 1.35] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <CameraRig view={view} device={device} zoom={zoom} />
        {/* Iluminación de estudio suave (§6.3) sin dependencias de red */}
        <hemisphereLight args={['#fff5fa', '#e8b8d4', 0.85]} />
        <directionalLight
          position={[device.anchoMm, device.altoMm * 0.8, device.altoMm]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-device.anchoMm, -device.altoMm * 0.3, device.altoMm * 0.6]} intensity={0.4} />

        <Suspense fallback={null}>
          <group
            onPointerDown={onBackgroundPointerDown}
          >
            <CaseMesh device={device} variant={variant} />
          </group>
          {showGrid && <Grid5mm device={device} />}
          {typeof guides?.v === 'number' && (
            <mesh position={[guides.v - device.anchoMm / 2, 0, 0.28]}>
              <planeGeometry args={[0.4, device.altoMm]} />
              <meshBasicMaterial color="#F5259C" transparent opacity={0.7} depthWrite={false} />
            </mesh>
          )}
          {typeof guides?.h === 'number' && (
            <mesh position={[0, device.altoMm / 2 - guides.h, 0.28]}>
              <planeGeometry args={[device.anchoMm, 0.4]} />
              <meshBasicMaterial color="#F5259C" transparent opacity={0.7} depthWrite={false} />
            </mesh>
          )}
          {instances.map((inst) => {
            const element = catalog.get(inst.elementId);
            if (!element) return null;
            return (
              <InstanceGroup
                key={inst.instanceId}
                inst={inst}
                element={{ ...element, letraChar: inst.letraChar ?? element.letraChar }}
                device={device}
                state={visualStates?.get(inst.instanceId)}
                onPointerDown={onElementPointerDown}
              />
            );
          })}
          {/* Plano invisible de drag: mapea el puntero a coordenadas mm */}
          {onPlanePointerMove && (
            <mesh
              ref={planeRef}
              position={[0, 0, 0.3]}
              onPointerMove={(e) => {
                const xMm = e.point.x + device.anchoMm / 2;
                const yMm = device.altoMm / 2 - e.point.y;
                onPlanePointerMove(xMm, yMm, e);
              }}
            >
              <planeGeometry args={[device.anchoMm * 2.5, device.altoMm * 2.5]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          )}
          <ContactShadows
            position={[0, -device.altoMm * 0.62, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            width={device.anchoMm * 3}
            height={device.altoMm * 1.5}
            blur={2.4}
            opacity={0.25}
            far={device.altoMm}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
