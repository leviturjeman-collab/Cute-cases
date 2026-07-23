'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { CatalogElement, DeviceGeometry, VariantInfo } from './types';
import {
  bowShape,
  heartShape,
  proceduralColor,
  proceduralKind,
  proceduralLetter,
  roundedRectShape,
  starShape,
  stripedTexture,
} from './proceduralShapes';

export const CASE_DEPTH_MM = 3;

/** mm (origen esq. sup. izq., y abajo) → mundo three (origen centro, y arriba). */
export function mmToWorld(xMm: number, yMm: number, device: DeviceGeometry): [number, number] {
  return [xMm - device.anchoMm / 2, device.altoMm / 2 - yMm];
}

/** Material PBR según material de la funda (§6.3). */
function caseMaterial(variant: VariantInfo): THREE.Material {
  const color = new THREE.Color(variant.colorHex);
  if (variant.material === 'transparente') {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.15,
      transmission: 0.85,
      transparent: true,
      opacity: 0.85,
      ior: 1.4,
      thickness: 1.5,
    });
  }
  if (variant.material === 'rigida') {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
    });
  }
  // silicona (default): rugosidad alta, sheen suave
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.85,
    sheen: 0.6,
    sheenColor: new THREE.Color('#ffffff'),
  });
}

/** Funda: rectángulo redondeado extruido + sombra de contacto + zona de cámara. */
export function CaseMesh({ device, variant }: { device: DeviceGeometry; variant: VariantInfo }) {
  const geometry = useMemo(() => {
    const shape = roundedRectShape(device.anchoMm, device.altoMm, device.radioEsquinaMm);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: CASE_DEPTH_MM,
      bevelEnabled: true,
      bevelThickness: 0.8,
      bevelSize: 0.8,
      bevelSegments: 3,
      curveSegments: 24,
    });
    geo.translate(0, 0, -CASE_DEPTH_MM);
    return geo;
  }, [device.anchoMm, device.altoMm, device.radioEsquinaMm]);

  const material = useMemo(() => caseMaterial(variant), [variant]);

  const cameraZoneGeo = useMemo(() => {
    if (device.cameraZone.length < 3) return null;
    const shape = new THREE.Shape();
    device.cameraZone.forEach((p, i) => {
      const [x, y] = mmToWorld(p.x, p.y, device);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [device]);

  const stripes = useMemo(() => stripedTexture(), []);

  return (
    <group>
      <mesh geometry={geometry} material={material} receiveShadow castShadow />
      {/* Zona de cámara: overlay permanente rayado rosa (§6.3) */}
      {cameraZoneGeo && (
        <mesh geometry={cameraZoneGeo} position={[0, 0, 0.15]}>
          <meshBasicMaterial map={stripes} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** Malla procedural de un charm 3D (mientras no haya GLB reales). */
function CharmMesh({ element }: { element: CatalogElement }) {
  const kind = proceduralKind(element.assetUrl);
  const color = proceduralColor(element.assetUrl);
  const depth = element.profundidadMm ?? 3;

  const geometry = useMemo(() => {
    const opts = { depth: depth * 0.7, bevelEnabled: true, bevelThickness: depth * 0.15, bevelSize: depth * 0.15, bevelSegments: 2, curveSegments: 16 };
    switch (kind) {
      case 'heart':
        return new THREE.ExtrudeGeometry(heartShape(element.anchoMm, element.altoMm), opts);
      case 'bow':
        return new THREE.ExtrudeGeometry(bowShape(element.anchoMm, element.altoMm), opts);
      case 'star':
      case 'xmas':
        return new THREE.ExtrudeGeometry(starShape(element.anchoMm), opts);
      case 'chain': {
        const geo = new THREE.CapsuleGeometry(element.altoMm / 2.4, element.anchoMm - element.altoMm, 4, 10);
        geo.rotateZ(Math.PI / 2);
        return geo;
      }
      case 'flower':
      case 'fruit':
      case 'animal': {
        return new THREE.SphereGeometry(element.anchoMm / 2, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      }
      default:
        return new THREE.ExtrudeGeometry(
          roundedRectShape(element.anchoMm, element.altoMm, Math.min(2, element.anchoMm / 4)),
          opts,
        );
    }
  }, [kind, element.anchoMm, element.altoMm, depth]);

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        roughness: 0.35,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
      }),
    [color],
  );

  if (kind === 'letter') {
    const ch = element.letraChar ?? proceduralLetter(element.assetUrl);
    return (
      <group>
        <mesh castShadow material={material}>
          <cylinderGeometry
            args={[element.anchoMm / 2, element.anchoMm / 2, depth * 0.5, 20]}
          />
        </mesh>
        <Text
          fontSize={element.altoMm * 0.62}
          color="#7A5A2C"
          anchorX="center"
          anchorY="middle"
          position={[0, 0, depth * 0.5]}
        >
          {ch}
        </Text>
      </group>
    );
  }

  // El cilindro de las letras se orienta plano sobre la funda
  if (kind === 'chain' || kind === 'flower' || kind === 'fruit' || kind === 'animal') {
    return <mesh geometry={geometry} material={material} castShadow rotation={kind === 'chain' ? [0, 0, 0] : [Math.PI / 2, 0, 0]} />;
  }
  return <mesh geometry={geometry} material={material} castShadow />;
}

/** Sticker plano: silueta con leve brillo de vinilo, sin volumen (§4.3). */
function StickerMesh({ element }: { element: CatalogElement }) {
  const kind = proceduralKind(element.assetUrl);
  const color = proceduralColor(element.assetUrl);
  const geometry = useMemo(() => {
    switch (kind) {
      case 'heart-flat':
        return new THREE.ShapeGeometry(heartShape(element.anchoMm, element.altoMm));
      case 'star-flat':
        return new THREE.ShapeGeometry(starShape(element.anchoMm));
      case 'flower-flat':
        return new THREE.CircleGeometry(element.anchoMm / 2, 24);
      default:
        return new THREE.ShapeGeometry(
          roundedRectShape(element.anchoMm, element.altoMm, Math.min(2, element.anchoMm / 4)),
        );
    }
  }, [kind, element.anchoMm, element.altoMm]);

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        roughness: 0.4,
        clearcoat: 0.9,
        clearcoatRoughness: 0.3,
        side: THREE.DoubleSide,
      }),
    [color],
  );
  return <mesh geometry={geometry} material={material} position={[0, 0, 0.12]} />;
}

/** Render de un elemento del catálogo (charm 3D con volumen o sticker plano). */
export function ElementMesh({ element }: { element: CatalogElement }) {
  if (element.tipo === 'plano') return <StickerMesh element={element} />;
  return <CharmMesh element={element} />;
}
