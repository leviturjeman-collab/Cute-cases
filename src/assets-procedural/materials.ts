import * as THREE from 'three';

/**
 * Materiales del estandar de realismo (SS9.2 fundas, SS9.3 elementos).
 * MeshPhysicalMaterial con parametros exactos del contrato.
 */

function lighten(hex: string, amount: number): THREE.Color {
  const c = new THREE.Color(hex);
  return c.lerp(new THREE.Color('#ffffff'), amount);
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
    default:
      return new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.46,
        sheen: 0.65,
        sheenRoughness: 0.6,
        sheenColor: lighten(colorHex, 0.25),
        clearcoat: 0.06,
        clearcoatRoughness: 0.5,
        envMapIntensity: 1.0,
      });
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
