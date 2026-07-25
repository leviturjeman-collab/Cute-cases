import * as THREE from 'three';

/**
 * Materiales del estandar de realismo (SS9.2 fundas, SS9.3 elementos).
 * MeshPhysicalMaterial con parametros exactos del contrato.
 */

function lighten(hex: string, amount: number): THREE.Color {
  const c = new THREE.Color(hex);
  return c.lerp(new THREE.Color('#ffffff'), amount);
}

// Micro-grano de la silicona: ruido suave compartido como mapa de rugosidad
// y de relieve. Se genera una sola vez; en SSR no hay document y se omite.
let siliconeGrain: THREE.CanvasTexture | null = null;
function siliconeGrainMap(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (siliconeGrain) return siliconeGrain;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 208 + Math.floor(Math.random() * 34);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // Suavizado leve para que el grano no parezca ruido digital
  ctx.filter = 'blur(1.2px)';
  ctx.drawImage(canvas, 0, 0);
  siliconeGrain = new THREE.CanvasTexture(canvas);
  siliconeGrain.wrapS = THREE.RepeatWrapping;
  siliconeGrain.wrapT = THREE.RepeatWrapping;
  // Las UV de la extrusion van en mm: un ciclo cada 20mm deja grano ~0.08mm
  siliconeGrain.repeat.set(0.05, 0.05);
  return siliconeGrain;
}

/** SS9.2 — material de la funda segun su tipo. */
export function caseMaterial(material: string, colorHex: string): THREE.MeshPhysicalMaterial {
  const color = new THREE.Color(colorHex);
  switch (material) {
    case 'transparente':
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#ffffff'),
        transmission: 1.0,
        thickness: 1.2,
        roughness: 0.08,
        ior: 1.45,
        attenuationColor: lighten(colorHex, 0.4),
        attenuationDistance: 8,
        transparent: true,
      });
    case 'rigida':
      return new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.3,
        clearcoat: 0.8,
        clearcoatRoughness: 0.22,
        envMapIntensity: 1.05,
      });
    case 'rigida-perlada':
      return new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.35,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        iridescence: 0.25,
        iridescenceIOR: 1.3,
      });
    case 'silicona':
    default: {
      const grain = siliconeGrainMap();
      return new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.5,
        roughnessMap: grain ?? undefined,
        bumpMap: grain ?? undefined,
        bumpScale: 0.12,
        sheen: 0.75,
        sheenRoughness: 0.55,
        sheenColor: lighten(colorHex, 0.15),
        clearcoat: 0.1,
        clearcoatRoughness: 0.55,
        envMapIntensity: 1.0,
      });
    }
  }
}

/** SS9.3 — acabados de elementos. */
export function finishMaterial(acabado: string, colorHex: string): THREE.MeshPhysicalMaterial {
  switch (acabado) {
    case 'metal-oro':
      return new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#D4AF37'), metalness: 1.0, roughness: 0.25 });
    case 'metal-plata':
      return new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#C0C0C0'), metalness: 1.0, roughness: 0.22 });
    case 'cristal':
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colorHex),
        transmission: 0.9,
        roughness: 0.1,
        ior: 1.5,
        transparent: true,
      });
    case 'nacar':
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#F5F0E6'),
        roughness: 0.3,
        clearcoat: 0.8,
        iridescence: 0.35,
      });
    case 'vinilo':
      return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(colorHex), roughness: 0.4, metalness: 0 });
    case 'esmalte':
    default:
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(colorHex),
        metalness: 0,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.15,
      });
  }
}

/** Cuerpo de iPhone grafito mate para fundas transparentes (SS9.2). */
export function phoneBodyMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#3A3A3C'),
    metalness: 0.7,
    roughness: 0.5,
  });
}
