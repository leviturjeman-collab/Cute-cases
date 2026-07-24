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
  const backGeo = new THREE.ExtrudeGeometry(backShape, {
    depth: grosor,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 2,
    curveSegments: 14,
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
