import * as THREE from 'three';

/**
 * Geometría procedural para assets `procedural://…` (seeds de desarrollo).
 * Cuando el admin sube GLB/PNG reales, el visor los carga en su lugar.
 */

export function heartShape(w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = 0;
  const y = 0;
  s.moveTo(x, y + h * 0.3);
  s.bezierCurveTo(x, y + h * 0.45, x - w * 0.5, y + h * 0.45, x - w * 0.5, y + h * 0.1);
  s.bezierCurveTo(x - w * 0.5, y - h * 0.25, x - w * 0.12, y - h * 0.35, x, y - h * 0.5);
  s.bezierCurveTo(x + w * 0.12, y - h * 0.35, x + w * 0.5, y - h * 0.25, x + w * 0.5, y + h * 0.1);
  s.bezierCurveTo(x + w * 0.5, y + h * 0.45, x, y + h * 0.45, x, y + h * 0.3);
  return s;
}

export function starShape(size: number): THREE.Shape {
  const outer = size / 2;
  const inner = outer * 0.45;
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const px = r * Math.cos(a);
    const py = r * Math.sin(a);
    if (i === 0) s.moveTo(px, py);
    else s.lineTo(px, py);
  }
  s.closePath();
  return s;
}

export function bowShape(w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w * 0.5, h * 0.3);
  s.quadraticCurveTo(-w * 0.55, 0, -w * 0.5, -h * 0.3);
  s.quadraticCurveTo(-w * 0.2, -h * 0.1, -w * 0.08, -h * 0.12);
  s.lineTo(w * 0.08, -h * 0.12);
  s.quadraticCurveTo(w * 0.2, -h * 0.1, w * 0.5, -h * 0.3);
  s.quadraticCurveTo(w * 0.55, 0, w * 0.5, h * 0.3);
  s.quadraticCurveTo(w * 0.2, h * 0.1, w * 0.08, h * 0.12);
  s.lineTo(-w * 0.08, h * 0.12);
  s.quadraticCurveTo(-w * 0.2, h * 0.1, -w * 0.5, h * 0.3);
  s.closePath();
  return s;
}

export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
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

const PALETTE: Record<string, string> = {
  rosa: '#FF69B4',
  fucsia: '#F5259C',
  rojo: '#E0355C',
  perlado: '#F5EDF2',
  glitter: '#F5259C',
  blanco: '#FFF7FB',
  coqueta: '#FFA1CF',
  dorada: '#E8C468',
  plateada: '#CFCFDA',
  perlas: '#F2EAE4',
  lavanda: '#C9A7EB',
  margarita: '#FFF3B0',
  girasol: '#F2C14E',
};

/** Color base para un asset procedural a partir de su querystring. */
export function proceduralColor(assetUrl: string): string {
  try {
    const url = new URL(assetUrl.replace('procedural://', 'https://x/'));
    const color = url.searchParams.get('color') ?? url.searchParams.get('tipo') ?? '';
    return PALETTE[color] ?? '#FF9CC7';
  } catch {
    return '#FF9CC7';
  }
}

/** Tipo de forma procedural: "heart", "bow", "star", "letter", … */
export function proceduralKind(assetUrl: string): string {
  const rest = assetUrl.replace('procedural://', '');
  return rest.split('?')[0] ?? 'generic';
}

/** Letra de un asset procedural de letra. */
export function proceduralLetter(assetUrl: string): string {
  try {
    const url = new URL(assetUrl.replace('procedural://', 'https://x/'));
    return url.searchParams.get('char') ?? '?';
  } catch {
    return '?';
  }
}

/** Textura de rayas diagonales para la zona de cámara (§6.3). */
export function stripedTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(255,161,207,0.85)';
  ctx.lineWidth = 6;
  for (let i = -64; i < 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 64);
    ctx.lineTo(i + 64, 0);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
