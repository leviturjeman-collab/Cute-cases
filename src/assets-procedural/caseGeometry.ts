import * as THREE from 'three';
import { caseMaterial, phoneBodyMaterial } from './materials';
import { inflateConvexPolygon } from '@/lib/collision/geometry';
import type { Polygon } from '@/lib/collision';

/**
 * Funda parametrica (SS9.4): cascaron con grosor 2,5 mm, rebaje interior
 * visible en vistas laterales, hueco de camara con inserto elevado 1 mm y
 * labio frontal de 1 mm en el perimetro. 1 unidad = 1 mm.
 *
 * Sistema de coordenadas del mundo: la cara trasera de la funda vive en el
 * plano XY centrado en el origen (X derecha, Y arriba), con +Z hacia la
 * camara del visor. El plano de colocacion en mm (origen esquina sup. izq.,
 * y hacia abajo) se mapea con mmToWorld().
 */

export interface CaseDeviceSpec {
  anchoMm: number;
  altoMm: number;
  radioEsquinaMm: number;
  grosorMm?: number;
  cameraZone: Polygon;
  /** Disposicion de lentes del modulo (SS6.2); alimenta el detalle realista. */
  moduloForma?: string;
}

/** Lentes por forma de modulo (misma disposicion que el SVG de SS6.2). */
function lensLayout(
  forma: string,
  zone: { x: number; y: number; w: number; h: number },
): { x: number; y: number; r: number }[] {
  const cx = zone.x + zone.w / 2;
  const cy = zone.y + zone.h / 2;
  const s = Math.min(zone.w, zone.h);
  switch (forma) {
    case 'cuadrado-triple':
      return [
        { x: zone.x + zone.w * 0.32, y: zone.y + zone.h * 0.28, r: s * 0.16 },
        { x: zone.x + zone.w * 0.32, y: zone.y + zone.h * 0.72, r: s * 0.16 },
        { x: zone.x + zone.w * 0.72, y: cy, r: s * 0.16 },
      ];
    case 'cuadrado-diagonal':
      return [
        { x: zone.x + zone.w * 0.34, y: zone.y + zone.h * 0.32, r: s * 0.17 },
        { x: zone.x + zone.w * 0.66, y: zone.y + zone.h * 0.68, r: s * 0.17 },
      ];
    case 'barra-horizontal':
      return [
        { x: zone.x + zone.w * 0.25, y: cy, r: zone.h * 0.28 },
        { x: cx, y: cy, r: zone.h * 0.28 },
        { x: zone.x + zone.w * 0.75, y: cy, r: zone.h * 0.28 },
      ];
    case 'vertical-doble':
    case 'vertical':
      return [
        { x: cx, y: zone.y + zone.h * 0.28, r: zone.w * 0.3 },
        { x: cx, y: zone.y + zone.h * 0.72, r: zone.w * 0.3 },
      ];
    case 'camara-unica-vertical':
      return [{ x: cx, y: cy, r: Math.min(zone.w, zone.h) * 0.34 }];
    default:
      return [{ x: cx, y: cy, r: s * 0.25 }];
  }
}

export const PHONE_DEPTH_MM = 9;

export function mmToWorld(xMm: number, yMm: number, device: { anchoMm: number; altoMm: number }): [number, number] {
  return [xMm - device.anchoMm / 2, device.altoMm / 2 - yMm];
}

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const rr = Math.min(r, w / 2, h / 2);
  s.moveTo(-w / 2 + rr, -h / 2);
  s.lineTo(w / 2 - rr, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rr);
  s.lineTo(w / 2, h / 2 - rr);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - rr, h / 2);
  s.lineTo(-w / 2 + rr, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rr);
  s.lineTo(-w / 2, -h / 2 + rr);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rr, -h / 2);
  s.closePath();
  return s;
}

function polygonToWorldPath(poly: Polygon, device: CaseDeviceSpec): THREE.Path {
  const path = new THREE.Path();
  poly.forEach((p, i) => {
    const [x, y] = mmToWorld(p.x, p.y, device);
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();
  return path;
}

/**
 * buildCaseGeometry (SS10.1): grupo completo de la funda. La cara trasera
 * exterior queda en z = 0 (los charms se apoyan en z = 0).
 */
export function buildCaseGeometry(device: CaseDeviceSpec, material: string, colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const grosor = device.grosorMm ?? 2.5;
  const mat = caseMaterial(material, colorHex);
  const w = device.anchoMm;
  const h = device.altoMm;
  const r = device.radioEsquinaMm;

  // 1) Placa trasera con agujero de camara, extruida hacia -z
  const backShape = roundedRectShape(w, h, r);
  if (device.cameraZone.length >= 3) {
    backShape.holes.push(polygonToWorldPath(device.cameraZone, device));
  }
  // Borde exterior suave (rediseno realista): bisel amplio y esquinas finas
  const backGeo = new THREE.ExtrudeGeometry(backShape, {
    depth: grosor,
    bevelEnabled: true,
    bevelThickness: 0.9,
    bevelSize: 0.9,
    bevelSegments: 4,
    curveSegments: 24,
  });
  backGeo.translate(0, 0, -grosor);
  const back = new THREE.Mesh(backGeo, mat);
  back.castShadow = true;
  back.receiveShadow = true;
  group.add(back);

  // 2) Inserto de camara elevado 1 mm con borde biselado (SS9.4)
  if (device.cameraZone.length >= 3) {
    const inflated = inflateConvexPolygon(device.cameraZone, 0.8);
    const insertShape = new THREE.Shape();
    inflated.forEach((p, i) => {
      const [x, y] = mmToWorld(p.x, p.y, device);
      if (i === 0) insertShape.moveTo(x, y);
      else insertShape.lineTo(x, y);
    });
    insertShape.closePath();
    const insertGeo = new THREE.ExtrudeGeometry(insertShape, {
      depth: 1,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.3,
      bevelSegments: 2,
    });
    insertGeo.translate(0, 0, -0.15);
    const insert = new THREE.Mesh(insertGeo, mat.clone());
    insert.castShadow = true;
    group.add(insert);

    // Fondo oscuro del hueco (lente)
    const wellShape = new THREE.Shape();
    device.cameraZone.forEach((p, i) => {
      const [x, y] = mmToWorld(p.x, p.y, device);
      if (i === 0) wellShape.moveTo(x, y);
      else wellShape.lineTo(x, y);
    });
    wellShape.closePath();
    const well = new THREE.Mesh(
      new THREE.ShapeGeometry(wellShape),
      new THREE.MeshStandardMaterial({ color: '#141216', roughness: 0.6 }),
    );
    well.position.z = 0.02;
    group.add(well);

    // Lentes reales del modulo (rediseno realista): anillo metalico +
    // cristal oscuro con brillo del HDR, dispuestas segun moduloForma
    const xs = device.cameraZone.map((p) => p.x);
    const ys = device.cameraZone.map((p) => p.y);
    const zone = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: '#3A3A3F',
      metalness: 0.9,
      roughness: 0.28,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#07070C',
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.4,
    });
    const pupilMat = new THREE.MeshPhysicalMaterial({
      color: '#1B2340',
      roughness: 0.1,
      clearcoat: 1,
    });
    for (const lens of lensLayout(device.moduloForma ?? '', zone)) {
      const [lx, ly] = mmToWorld(lens.x, lens.y, device);
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(lens.r, lens.r * 1.06, 1.5, 28, 1, true),
        ringMat,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(lx, ly, 0.75);
      ring.castShadow = true;
      group.add(ring);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(lens.r * 0.96, 28), glassMat);
      glass.position.set(lx, ly, 1.5);
      group.add(glass);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(lens.r * 0.45, 22), pupilMat);
      pupil.position.set(lx, ly, 1.52);
      group.add(pupil);
    }
  }

  // 3) Paredes laterales: cascaron hasta la profundidad del telefono
  const wallShape = roundedRectShape(w, h, r);
  wallShape.holes.push(
    roundedRectShape(w - 2 * grosor, h - 2 * grosor, Math.max(1, r - grosor)) as unknown as THREE.Path,
  );
  const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
    depth: PHONE_DEPTH_MM,
    bevelEnabled: false,
    curveSegments: 14,
  });
  wallGeo.translate(0, 0, -PHONE_DEPTH_MM - grosor + 0.01);
  const wall = new THREE.Mesh(wallGeo, mat.clone());
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // 4) Labio frontal de 1 mm en el perimetro (SS9.4)
  const lipShape = roundedRectShape(w, h, r);
  lipShape.holes.push(
    roundedRectShape(w - 2 * 1.6, h - 2 * 1.6, Math.max(1, r - 1.6)) as unknown as THREE.Path,
  );
  const lipGeo = new THREE.ExtrudeGeometry(lipShape, { depth: 1, bevelEnabled: false, curveSegments: 14 });
  lipGeo.translate(0, 0, -PHONE_DEPTH_MM - grosor - 1);
  const lip = new THREE.Mesh(lipGeo, mat.clone());
  group.add(lip);

  // 5) Fundas transparentes: cuerpo de iPhone grafito detras (SS9.2)
  if (material === 'transparente') {
    const bodyGeo = new THREE.ExtrudeGeometry(
      roundedRectShape(w - 2 * grosor - 0.6, h - 2 * grosor - 0.6, Math.max(1, r - grosor)),
      { depth: PHONE_DEPTH_MM - 1.5, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 2, curveSegments: 12 },
    );
    bodyGeo.translate(0, 0, -PHONE_DEPTH_MM - grosor + 1);
    const body = new THREE.Mesh(bodyGeo, phoneBodyMaterial());
    group.add(body);
  }

  return group;
}
