import * as THREE from 'three';
import { caseMaterial, phoneBodyMaterial } from './materials';
import { moduleLayout } from './moduleLayout';
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

/** Agujero redondeado centrado en (cx, cy): mismo radio que la plataforma. */
function roundedRectPath(w: number, h: number, r: number, cx: number, cy: number): THREE.Path {
  const path = new THREE.Path();
  const rr = Math.min(r, w / 2, h / 2);
  path.moveTo(cx - w / 2 + rr, cy - h / 2);
  path.lineTo(cx + w / 2 - rr, cy - h / 2);
  path.quadraticCurveTo(cx + w / 2, cy - h / 2, cx + w / 2, cy - h / 2 + rr);
  path.lineTo(cx + w / 2, cy + h / 2 - rr);
  path.quadraticCurveTo(cx + w / 2, cy + h / 2, cx + w / 2 - rr, cy + h / 2);
  path.lineTo(cx - w / 2 + rr, cy + h / 2);
  path.quadraticCurveTo(cx - w / 2, cy + h / 2, cx - w / 2, cy + h / 2 - rr);
  path.lineTo(cx - w / 2, cy - h / 2 + rr);
  path.quadraticCurveTo(cx - w / 2, cy - h / 2, cx - w / 2 + rr, cy - h / 2);
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

  // 1) Placa trasera con agujero de camara REDONDEADO (queda siempre
  //    cubierto por la plataforma; sin muescas en las esquinas)
  const backShape = roundedRectShape(w, h, r);
  if (device.cameraZone.length >= 3) {
    const hx = device.cameraZone.map((p) => p.x);
    const hy = device.cameraZone.map((p) => p.y);
    const hw = Math.max(...hx) - Math.min(...hx);
    const hh = Math.max(...hy) - Math.min(...hy);
    const [hcx, hcy] = mmToWorld(
      (Math.min(...hx) + Math.max(...hx)) / 2,
      (Math.min(...hy) + Math.max(...hy)) / 2,
      device,
    );
    backShape.holes.push(
      roundedRectPath(hw, hh, Math.min(hw, hh) * 0.3, hcx, hcy),
    );
  }
  // Borde exterior suave (rediseno realista): bisel amplio y esquinas finas
  const backGeo = new THREE.ExtrudeGeometry(backShape, {
    depth: grosor,
    bevelEnabled: true,
    bevelThickness: 1.1,
    bevelSize: 1.1,
    bevelSegments: 7,
    curveSegments: 48,
  });
  backGeo.translate(0, 0, -grosor);
  const back = new THREE.Mesh(backGeo, mat);
  back.castShadow = true;
  back.receiveShadow = true;
  group.add(back);

  // 2) Recorte de camara como en la funda de silicona real: la apertura
  //    deja ver el modulo OSCURO del iPhone hundido bajo la superficie,
  //    con sus lentes; nada de plataforma del color de la funda.
  if (device.cameraZone.length >= 3) {
    const xs = device.cameraZone.map((p) => p.x);
    const ys = device.cameraZone.map((p) => p.y);
    const zw = Math.max(...xs) - Math.min(...xs);
    const zh = Math.max(...ys) - Math.min(...ys);
    const zcx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const zcy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const [icx, icy] = mmToWorld(zcx, zcy, device);

    // Aro en relieve del color de la funda alrededor del recorte (el labio
    // enrollado caracteristico de la funda de silicona real)
    const lipRingShape = roundedRectShape(zw + 3.2, zh + 3.2, Math.min(zw, zh) * 0.3 + 1.6);
    lipRingShape.holes.push(
      roundedRectPath(zw - 1.2, zh - 1.2, Math.min(zw, zh) * 0.28, 0, 0),
    );
    const lipRingGeo = new THREE.ExtrudeGeometry(lipRingShape, {
      depth: 0.9,
      bevelEnabled: true,
      bevelThickness: 0.55,
      bevelSize: 0.55,
      bevelSegments: 6,
      curveSegments: 40,
    });
    lipRingGeo.translate(icx, icy, -0.3);
    const lipRing = new THREE.Mesh(lipRingGeo, mat.clone());
    lipRing.castShadow = true;
    group.add(lipRing);

    // Modulo del telefono visto por el recorte: cristal claro satinado
    const moduleShape = roundedRectShape(zw - 0.6, zh - 0.6, Math.min(zw, zh) * 0.28);
    const moduleGeo = new THREE.ExtrudeGeometry(moduleShape, {
      depth: grosor + 0.6,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.3,
      bevelSegments: 2,
      curveSegments: 16,
    });
    moduleGeo.translate(icx, icy, -grosor - 0.8);
    const moduleMat = new THREE.MeshPhysicalMaterial({
      color: '#AEC3D6',
      roughness: 0.25,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.1,
    });
    const modulePlate = new THREE.Mesh(moduleGeo, moduleMat);
    modulePlate.receiveShadow = true;
    group.add(modulePlate);

    // Lentes sobre el modulo oscuro: anillo metalico + cristal con brillo
    const zone = { x: Math.min(...xs), y: Math.min(...ys), w: zw, h: zh };
    // Cara superior real de la placa del modulo: -grosor-0.8 + (grosor+0.6) + bisel 0.3
    const moduleTop = 0.1;
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: '#93A9BF',
      metalness: 0.85,
      roughness: 0.25,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#07070C',
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.7,
      iridescence: 0.55,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [120, 480],
    });
    const pupilMat = new THREE.MeshPhysicalMaterial({
      color: '#1B2340',
      roughness: 0.1,
      clearcoat: 1,
    });
    // Sombra interior del recorte: el modulo se lee hundido, como en la foto
    const innerShadowShape = roundedRectShape(zw - 0.6, zh - 0.6, Math.min(zw, zh) * 0.28);
    innerShadowShape.holes.push(
      roundedRectPath(zw - 3.2, zh - 3.2, Math.min(zw, zh) * 0.24, 0, 0),
    );
    const innerShadow = new THREE.Mesh(
      new THREE.ShapeGeometry(innerShadowShape),
      new THREE.MeshBasicMaterial({
        color: '#000000',
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
      }),
    );
    innerShadow.position.set(icx, icy, moduleTop + 0.03);
    group.add(innerShadow);

    const barrelMat = new THREE.MeshPhysicalMaterial({
      color: '#10131A',
      roughness: 0.25,
      clearcoat: 0.9,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.2,
    });
    const layout = moduleLayout(device.moduloForma ?? '', zone);
    for (const lens of layout.lenses) {
      const [lx, ly] = mmToWorld(lens.x, lens.y, device);
      // Estructura de la lente real (de fuera adentro): aro metalico que
      // ocupa el 20% del radio, barril negro brillante, cristal de zafiro
      // con dos anillos de elementos y pupila oscura
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(lens.r, lens.r * 1.03, 1.8, 48, 1, true),
        ringMat,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(lx, ly, moduleTop + 0.9);
      rim.castShadow = true;
      group.add(rim);
      const rimTop = new THREE.Mesh(
        new THREE.RingGeometry(lens.r * 0.8, lens.r, 48),
        ringMat.clone(),
      );
      rimTop.position.set(lx, ly, moduleTop + 1.8);
      group.add(rimTop);
      const barrelTop = new THREE.Mesh(
        new THREE.RingGeometry(lens.r * 0.56, lens.r * 0.8, 48),
        barrelMat,
      );
      barrelTop.position.set(lx, ly, moduleTop + 1.79);
      group.add(barrelTop);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(lens.r * 0.57, 48), glassMat);
      glass.position.set(lx, ly, moduleTop + 1.77);
      group.add(glass);
      const concentricOuter = new THREE.Mesh(
        new THREE.RingGeometry(lens.r * 0.42, lens.r * 0.46, 40),
        new THREE.MeshBasicMaterial({ color: '#2A3550', transparent: true, opacity: 0.7 }),
      );
      concentricOuter.position.set(lx, ly, moduleTop + 1.78);
      group.add(concentricOuter);
      const concentricInner = new THREE.Mesh(
        new THREE.RingGeometry(lens.r * 0.3, lens.r * 0.335, 40),
        new THREE.MeshBasicMaterial({ color: '#232C46', transparent: true, opacity: 0.55 }),
      );
      concentricInner.position.set(lx, ly, moduleTop + 1.78);
      group.add(concentricInner);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(lens.r * 0.22, 28), pupilMat);
      pupil.position.set(lx, ly, moduleTop + 1.79);
      group.add(pupil);
      const glint = new THREE.Mesh(
        new THREE.CircleGeometry(lens.r * 0.06, 12),
        new THREE.MeshBasicMaterial({ color: '#CFE0F2', transparent: true, opacity: 0.9 }),
      );
      glint.position.set(lx - lens.r * 0.2, ly + lens.r * 0.24, moduleTop + 1.8);
      group.add(glint);
    }

    // Flash True Tone: aro perimetral tenue con la ventana calida dentro
    const [fx, fy] = mmToWorld(layout.flash.x, layout.flash.y, device);
    const flashRing = new THREE.Mesh(
      new THREE.RingGeometry(layout.flash.r * 0.72, layout.flash.r, 32),
      new THREE.MeshPhysicalMaterial({ color: '#E9E4D8', roughness: 0.35, clearcoat: 0.5 }),
    );
    flashRing.position.set(fx, fy, moduleTop + 0.06);
    group.add(flashRing);
    const flashInner = new THREE.Mesh(
      new THREE.CircleGeometry(layout.flash.r * 0.72, 32),
      new THREE.MeshPhysicalMaterial({
        color: '#F6EED6',
        emissive: '#FFEFC2',
        emissiveIntensity: 0.16,
        roughness: 0.3,
        clearcoat: 0.8,
      }),
    );
    flashInner.position.set(fx, fy, moduleTop + 0.07);
    group.add(flashInner);

    // LiDAR de los Pro: circulo oscuro brillante sin aro
    if (layout.lidar) {
      const [dx, dy] = mmToWorld(layout.lidar.x, layout.lidar.y, device);
      const lidarDot = new THREE.Mesh(
        new THREE.CircleGeometry(layout.lidar.r, 28),
        new THREE.MeshPhysicalMaterial({
          color: '#171B26',
          roughness: 0.15,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          envMapIntensity: 1.3,
        }),
      );
      lidarDot.position.set(dx, dy, moduleTop + 0.06);
      group.add(lidarDot);
    }

    // Microfono: punto pequeno mate
    if (layout.mic) {
      const [mx, my] = mmToWorld(layout.mic.x, layout.mic.y, device);
      const micDot = new THREE.Mesh(
        new THREE.CircleGeometry(layout.mic.r, 12),
        new THREE.MeshStandardMaterial({ color: '#3C4048', roughness: 0.5 }),
      );
      micDot.position.set(mx, my, moduleTop + 0.06);
      group.add(micDot);
    }
  }

  // 2b) Botones laterales en el color de la funda (volumen + accion a la
  //     izquierda, encendido a la derecha): el detalle que la hace real
  const buttonZ = -grosor - PHONE_DEPTH_MM * 0.42;
  const buttonSpecs: { side: -1 | 1; yMm: number; lenMm: number }[] = [
    { side: -1, yMm: h * 0.245, lenMm: 6 },
    { side: -1, yMm: h * 0.335, lenMm: 10 },
    { side: -1, yMm: h * 0.415, lenMm: 10 },
    { side: 1, yMm: h * 0.33, lenMm: 14 },
  ];
  for (const b of buttonSpecs) {
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.05, b.lenMm - 2.1, 4, 10),
      mat.clone(),
    );
    const [, wy] = mmToWorld(0, b.yMm, device);
    capsule.position.set(b.side * (w / 2 + 0.55), wy, buttonZ);
    capsule.castShadow = true;
    group.add(capsule);
  }

  // 3) Paredes laterales: cascaron hasta la profundidad del telefono
  const wallShape = roundedRectShape(w, h, r);
  wallShape.holes.push(
    roundedRectShape(w - 2 * grosor, h - 2 * grosor, Math.max(1, r - grosor)) as unknown as THREE.Path,
  );
  // Paredes con canto exterior redondeado: adios al perfil de caja
  const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
    depth: PHONE_DEPTH_MM,
    bevelEnabled: true,
    bevelThickness: 0.85,
    bevelSize: 0.85,
    bevelSegments: 6,
    curveSegments: 48,
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
  const lipGeo = new THREE.ExtrudeGeometry(lipShape, {
    depth: 1,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 2,
    curveSegments: 24,
  });
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
