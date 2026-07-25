/**
 * SEED v4 (D4, SS11): idempotente (upsert por slug/clave natural).
 * - Catalogo SIEMPRE: 21 dispositivos, 6 fundas / 19 variantes, 48 elementos
 *   + 5 de temporada + 2 juegos de letras (74 glifos), 4 preestablecidos.
 * - El seed VALIDA los 4 preestablecidos con el motor de colisiones y ABORTA
 *   con error si alguno es invalido, listando el motivo.
 * - SEED_DEMO_CONTENT=true (por defecto fuera de produccion): usuarios de
 *   demostracion y disenos publicados en galeria.
 * Dimensiones de SS11.1: valores de referencia para desarrollo, corregibles
 * desde el admin; verificar contra especificaciones oficiales antes de vender.
 */
import { PrismaClient } from '@prisma/client';
import { rectHitbox, validarEscena, type DeviceSpec, type ElementShape, type Hitbox, type PlacedItem } from '../src/lib/collision';
import { recipeHitbox } from '../src/lib/silhouettes';
import { VALID_LETTER_CHARS, glyphWidthMm } from '../src/lib/letters';

const prisma = new PrismaClient();

const DEMO = (process.env.SEED_DEMO_CONTENT ?? (process.env.NODE_ENV === 'production' ? 'false' : 'true')) === 'true';

// ---------- SS11.1 Dispositivos (21) ----------

interface DeviceSeed {
  slug: string;
  nombre: string;
  generacion: string;
  altoMm: number;
  anchoMm: number;
  cam: { x: number; y: number; w: number; h: number };
  moduloForma: string;
}

const DEVICES: DeviceSeed[] = [
  { slug: 'iphone-13-mini', nombre: 'iPhone 13 mini', generacion: '13', altoMm: 134.5, anchoMm: 67.2, cam: { x: 4, y: 4, w: 32, h: 32 }, moduloForma: 'cuadrado-diagonal' },
  { slug: 'iphone-13', nombre: 'iPhone 13', generacion: '13', altoMm: 149.7, anchoMm: 74.5, cam: { x: 4, y: 4, w: 36, h: 36 }, moduloForma: 'cuadrado-diagonal' },
  { slug: 'iphone-13-pro', nombre: 'iPhone 13 Pro', generacion: '13', altoMm: 149.7, anchoMm: 74.5, cam: { x: 4, y: 4, w: 42, h: 42 }, moduloForma: 'cuadrado-triple' },
  { slug: 'iphone-13-pro-max', nombre: 'iPhone 13 Pro Max', generacion: '13', altoMm: 163.8, anchoMm: 81.1, cam: { x: 4, y: 4, w: 44, h: 44 }, moduloForma: 'cuadrado-triple' },
  { slug: 'iphone-14', nombre: 'iPhone 14', generacion: '14', altoMm: 149.7, anchoMm: 74.5, cam: { x: 4, y: 4, w: 36, h: 36 }, moduloForma: 'cuadrado-diagonal' },
  { slug: 'iphone-14-plus', nombre: 'iPhone 14 Plus', generacion: '14', altoMm: 163.8, anchoMm: 81.1, cam: { x: 4, y: 4, w: 38, h: 38 }, moduloForma: 'cuadrado-diagonal' },
  { slug: 'iphone-14-pro', nombre: 'iPhone 14 Pro', generacion: '14', altoMm: 150.5, anchoMm: 74.5, cam: { x: 4, y: 4, w: 44, h: 44 }, moduloForma: 'cuadrado-triple' },
  { slug: 'iphone-14-pro-max', nombre: 'iPhone 14 Pro Max', generacion: '14', altoMm: 163.7, anchoMm: 80.6, cam: { x: 4, y: 4, w: 46, h: 46 }, moduloForma: 'cuadrado-triple' },
  { slug: 'iphone-15', nombre: 'iPhone 15', generacion: '15', altoMm: 150.6, anchoMm: 74.6, cam: { x: 4, y: 4, w: 37, h: 37 }, moduloForma: 'cuadrado-diagonal' },
  { slug: 'iphone-15-plus', nombre: 'iPhone 15 Plus', generacion: '15', altoMm: 163.9, anchoMm: 80.8, cam: { x: 4, y: 4, w: 39, h: 39 }, moduloForma: 'cuadrado-diagonal' },
  { slug: 'iphone-15-pro', nombre: 'iPhone 15 Pro', generacion: '15', altoMm: 149.6, anchoMm: 73.6, cam: { x: 4, y: 4, w: 45, h: 45 }, moduloForma: 'cuadrado-triple' },
  { slug: 'iphone-15-pro-max', nombre: 'iPhone 15 Pro Max', generacion: '15', altoMm: 162.9, anchoMm: 79.7, cam: { x: 4, y: 4, w: 46, h: 46 }, moduloForma: 'cuadrado-triple' },
  { slug: 'iphone-16', nombre: 'iPhone 16', generacion: '16', altoMm: 150.6, anchoMm: 74.6, cam: { x: 4, y: 4, w: 26, h: 40 }, moduloForma: 'vertical' },
  { slug: 'iphone-16-plus', nombre: 'iPhone 16 Plus', generacion: '16', altoMm: 163.9, anchoMm: 80.8, cam: { x: 4, y: 4, w: 27, h: 42 }, moduloForma: 'vertical' },
  { slug: 'iphone-16-pro', nombre: 'iPhone 16 Pro', generacion: '16', altoMm: 152.6, anchoMm: 74.5, cam: { x: 4, y: 4, w: 46, h: 46 }, moduloForma: 'cuadrado-triple' },
  { slug: 'iphone-16-pro-max', nombre: 'iPhone 16 Pro Max', generacion: '16', altoMm: 166.0, anchoMm: 80.6, cam: { x: 4, y: 4, w: 47, h: 47 }, moduloForma: 'cuadrado-triple' },
  { slug: 'iphone-16e', nombre: 'iPhone 16e', generacion: '16', altoMm: 149.7, anchoMm: 74.5, cam: { x: 4, y: 4, w: 22, h: 30 }, moduloForma: 'camara-unica-vertical' },
  { slug: 'iphone-17', nombre: 'iPhone 17', generacion: '17', altoMm: 152.6, anchoMm: 74.5, cam: { x: 4, y: 4, w: 38, h: 38 }, moduloForma: 'vertical-doble' },
  { slug: 'iphone-17-air', nombre: 'iPhone 17 Air', generacion: '17', altoMm: 159.2, anchoMm: 77.7, cam: { x: 4, y: 4, w: 68, h: 26 }, moduloForma: 'barra-horizontal' },
  { slug: 'iphone-17-pro', nombre: 'iPhone 17 Pro', generacion: '17', altoMm: 153.0, anchoMm: 74.9, cam: { x: 4, y: 4, w: 68, h: 34 }, moduloForma: 'barra-horizontal' },
  { slug: 'iphone-17-pro-max', nombre: 'iPhone 17 Pro Max', generacion: '17', altoMm: 166.4, anchoMm: 81.0, cam: { x: 4, y: 4, w: 72, h: 34 }, moduloForma: 'barra-horizontal' },
];

const radioEsquina = (gen: string): number => (['16', '17'].includes(gen) ? 12 : 11);

const camPolygon = (c: { x: number; y: number; w: number; h: number }) => [
  { x: c.x, y: c.y },
  { x: c.x + c.w, y: c.y },
  { x: c.x + c.w, y: c.y + c.h },
  { x: c.x, y: c.y + c.h },
];

// ---------- SS11.2 Fundas (6) y variantes (19) ----------

interface CaseSeed {
  slug: string;
  nombre: string;
  material: string;
  descripcion: string;
  destacada: boolean;
  variantes: { colorNombre: string; colorHex: string; precioCentimos: number }[];
}

const CASES: CaseSeed[] = [
  {
    slug: 'silicona-soft', nombre: 'Silicona Soft', material: 'silicona', destacada: true,
    descripcion: 'Tacto suave y agarre firme para el dia a dia. Protege sin sumar peso y las piezas se asientan sobre ella como si siempre hubieran estado ahi.',
    variantes: [
      { colorNombre: 'Rosa', colorHex: '#F3D3DB', precioCentimos: 1995 },
      { colorNombre: 'Lavanda', colorHex: '#C3B1E1', precioCentimos: 1995 },
      { colorNombre: 'Crema', colorHex: '#F5EBDD', precioCentimos: 1995 },
      { colorNombre: 'Negro', colorHex: '#1E1E1E', precioCentimos: 1995 },
    ],
  },
  {
    slug: 'silicona-vivid', nombre: 'Silicona Vivid', material: 'silicona', destacada: true,
    descripcion: 'Los colores mas intensos del catalogo en la misma silicona de tacto sedoso. Para disenos que se ven desde la otra punta de la clase.',
    variantes: [
      { colorNombre: 'Fucsia', colorHex: '#E84393', precioCentimos: 2195 },
      { colorNombre: 'Coral', colorHex: '#F0705A', precioCentimos: 2195 },
      { colorNombre: 'Menta', colorHex: '#9FD8C9', precioCentimos: 2195 },
    ],
  },
  {
    slug: 'crystal-clear', nombre: 'Crystal Clear', material: 'transparente', destacada: true,
    descripcion: 'Transparencia total que deja el iPhone a la vista. Tus piezas parecen flotar sobre el propio telefono.',
    variantes: [
      { colorNombre: 'Transparente', colorHex: '#FFFFFF', precioCentimos: 1795 },
      { colorNombre: 'Transparente rosado', colorHex: '#F9D9E7', precioCentimos: 1895 },
    ],
  },
  {
    slug: 'matte-shield', nombre: 'Matte Shield', material: 'rigida', destacada: false,
    descripcion: 'Carcasa rigida de acabado mate que repele huellas. La opcion sobria para quien quiere que hablen las piezas.',
    variantes: [
      { colorNombre: 'Rosa palo', colorHex: '#E8B4C8', precioCentimos: 2295 },
      { colorNombre: 'Blanco', colorHex: '#FAFAFA', precioCentimos: 2295 },
      { colorNombre: 'Grafito', colorHex: '#3A3A3C', precioCentimos: 2295 },
    ],
  },
  {
    slug: 'glossy-pearl', nombre: 'Glossy Pearl', material: 'rigida-perlada', destacada: false,
    descripcion: 'Brillo nacarado con reflejos iridiscentes que cambian con la luz. El lienzo mas fotogenico de la coleccion.',
    variantes: [
      { colorNombre: 'Perla', colorHex: '#F6EFF2', precioCentimos: 2495 },
      { colorNombre: 'Rosa perla', colorHex: '#F2C9DC', precioCentimos: 2495 },
    ],
  },
  {
    slug: 'bumper-air', nombre: 'Bumper Air', material: 'silicona', destacada: false,
    descripcion: 'La mas ligera de la familia, con bordes reforzados donde importa. Precio pequeno, personalizacion completa.',
    variantes: [
      { colorNombre: 'Rosa', colorHex: '#F4A7C3', precioCentimos: 1695 },
      { colorNombre: 'Transparente', colorHex: '#FFFFFF', precioCentimos: 1695 },
      { colorNombre: 'Negro', colorHex: '#1E1E1E', precioCentimos: 1695 },
      { colorNombre: 'Lila', colorHex: '#D7C5EE', precioCentimos: 1695 },
      { colorNombre: 'Blanco', colorHex: '#FAFAFA', precioCentimos: 1695 },
    ],
  },
];

// ---------- SS11.3 Elementos ----------

interface ElementSeed {
  slug: string;
  nombre: string;
  tipo: 'charm3d' | 'plano';
  categoria: string;
  w: number;
  h: number;
  prof?: number;
  precio: number; // centimos
  acabado: string;
  colores: string[];
  recipe: string;
  params?: Record<string, unknown>;
  hitboxOverride?: Hitbox;
  seasonSlug?: string;
  letraChar?: string;
  esNuevo?: boolean;
}

const E = (
  slug: string, nombre: string, tipo: 'charm3d' | 'plano', categoria: string,
  w: number, h: number, precio: number, acabado: string, colores: string[],
  recipe: string, extra?: Partial<ElementSeed>,
): ElementSeed => ({ slug, nombre, tipo, categoria, w, h, precio, acabado, colores, recipe, ...extra });

const ELEMENTS: ElementSeed[] = [
  // Corazones (8)
  E('corazon-clasico', 'Corazon clasico', 'charm3d', 'corazones', 12, 11, 350, 'esmalte', ['#E84393'], 'heart-extrude', { prof: 3 }),
  E('corazon-oro', 'Corazon oro', 'charm3d', 'corazones', 10, 9, 450, 'metal-oro', ['#D4AF37'], 'heart-extrude', { prof: 2.5 }),
  E('corazon-plata', 'Corazon plata', 'charm3d', 'corazones', 10, 9, 450, 'metal-plata', ['#C0C0C0'], 'heart-extrude', { prof: 2.5 }),
  E('corazon-cristal', 'Corazon cristal', 'charm3d', 'corazones', 14, 13, 550, 'cristal', ['#F9D9E7'], 'heart-extrude', { prof: 4 }),
  E('mini-corazon', 'Mini corazon', 'charm3d', 'corazones', 7, 6.5, 250, 'esmalte', ['#E84393'], 'heart-extrude', { prof: 2 }),
  E('corazon-doble', 'Corazon doble', 'charm3d', 'corazones', 16, 10, 495, 'esmalte', ['#F4A7C3', '#FFFFFF'], 'heart-extrude', { prof: 2.5, params: { doble: true } }),
  E('sticker-corazon', 'Sticker corazon', 'plano', 'corazones', 15, 14, 195, 'vinilo', ['#F4A7C3'], 'heart-flat'),
  E('sticker-corazon-contorno', 'Sticker corazon contorno', 'plano', 'corazones', 15, 14, 195, 'vinilo', ['#E84393'], 'heart-outline-flat'),
  // Lazos (6)
  E('lazo-coqueta', 'Lazo coqueta', 'charm3d', 'lazos', 18, 12, 495, 'esmalte', ['#E8B4C8'], 'bow-3d', { prof: 4 }),
  E('lazo-saten', 'Lazo saten', 'charm3d', 'lazos', 20, 14, 595, 'esmalte', ['#D64570'], 'bow-3d', { prof: 5 }),
  E('lazo-oro', 'Lazo oro', 'charm3d', 'lazos', 14, 10, 550, 'metal-oro', ['#D4AF37'], 'bow-3d', { prof: 3.5 }),
  E('mini-lazo', 'Mini lazo', 'charm3d', 'lazos', 10, 7, 350, 'esmalte', ['#C3B1E1'], 'bow-3d', { prof: 2.5 }),
  E('sticker-lazo', 'Sticker lazo', 'plano', 'lazos', 18, 13, 195, 'vinilo', ['#F4A7C3'], 'bow-flat'),
  E('sticker-lazo-trazo', 'Sticker lazo trazo', 'plano', 'lazos', 16, 12, 195, 'vinilo', ['#1E1E1E'], 'bow-outline-flat'),
  // Flores (8)
  E('margarita', 'Margarita', 'charm3d', 'flores', 13, 13, 395, 'esmalte', ['#FFFFFF', '#F0B429'], 'flower-3d', { prof: 3.5, params: { petalos: 8 } }),
  E('flor-rosa', 'Flor rosa', 'charm3d', 'flores', 13, 13, 395, 'esmalte', ['#F4A7C3', '#D4AF37'], 'flower-3d', { prof: 3.5, params: { petalos: 6 } }),
  E('flor-cerezo', 'Flor de cerezo', 'charm3d', 'flores', 11, 11, 395, 'esmalte', ['#F9CFE0'], 'flower-3d', { prof: 3, params: { petalos: 5 } }),
  E('tulipan', 'Tulipan', 'charm3d', 'flores', 9, 14, 395, 'esmalte', ['#F0705A', '#5B8C5A'], 'tulip-3d', { prof: 4 }),
  E('girasol', 'Girasol', 'charm3d', 'flores', 14, 14, 450, 'esmalte', ['#F0B429', '#6B4226'], 'flower-3d', { prof: 3.5, params: { petalos: 12 } }),
  E('sticker-margarita', 'Sticker margarita', 'plano', 'flores', 16, 16, 195, 'vinilo', ['#FFFFFF', '#F0B429'], 'flower-flat'),
  E('sticker-flor-retro', 'Sticker flor retro', 'plano', 'flores', 15, 15, 195, 'vinilo', ['#F0705A', '#F4A7C3'], 'flower-flat'),
  E('sticker-ramillete', 'Sticker ramillete', 'plano', 'flores', 20, 24, 250, 'vinilo', ['#F4A7C3', '#9FD8C9', '#F0B429'], 'bouquet-flat'),
  // Frutas (7)
  E('cereza', 'Cereza', 'charm3d', 'frutas', 12, 14, 450, 'esmalte', ['#D7263D', '#5B8C5A'], 'cherry-3d', { prof: 4.5 }),
  E('fresa', 'Fresa', 'charm3d', 'frutas', 11, 13, 450, 'esmalte', ['#D7263D', '#F5D547'], 'strawberry-3d', { prof: 4.5 }),
  E('limon', 'Limon', 'charm3d', 'frutas', 12, 9, 395, 'esmalte', ['#F5D547'], 'lemon-3d', { prof: 4 }),
  E('manzana', 'Manzana', 'charm3d', 'frutas', 11, 11, 395, 'esmalte', ['#7BB661'], 'apple-3d', { prof: 4.5 }),
  E('platano', 'Platano', 'charm3d', 'frutas', 6, 15, 395, 'esmalte', ['#F5D547'], 'banana-3d', { prof: 3 }),
  E('sticker-sandia', 'Sticker sandia', 'plano', 'frutas', 15, 12, 195, 'vinilo', ['#D7263D', '#5B8C5A'], 'watermelon-flat'),
  E('sticker-pina', 'Sticker pina', 'plano', 'frutas', 12, 18, 195, 'vinilo', ['#F0B429', '#5B8C5A'], 'pineapple-flat'),
  // Animales (8)
  E('osito', 'Osito', 'charm3d', 'animales', 13, 15, 550, 'esmalte', ['#D7B899'], 'bear-3d', { prof: 5 }),
  E('mariposa', 'Mariposa', 'charm3d', 'animales', 16, 12, 495, 'cristal', ['#C3B1E1'], 'butterfly-3d', { prof: 3 }),
  E('gatito', 'Gatito', 'charm3d', 'animales', 12, 13, 550, 'esmalte', ['#FFFFFF', '#F4A7C3'], 'cat-3d', { prof: 4.5 }),
  E('abeja', 'Abeja', 'charm3d', 'animales', 11, 9, 450, 'esmalte', ['#F5D547', '#1E1E1E'], 'bee-3d', { prof: 4 }),
  E('conejo', 'Conejo', 'charm3d', 'animales', 10, 16, 550, 'esmalte', ['#FFFFFF'], 'bunny-3d', { prof: 4.5 }),
  E('sticker-mariposa', 'Sticker mariposa', 'plano', 'animales', 18, 14, 195, 'vinilo', ['#C3B1E1'], 'butterfly-flat'),
  E('sticker-huella', 'Sticker huella', 'plano', 'animales', 8, 8, 150, 'vinilo', ['#F4A7C3'], 'paw-flat'),
  E('sticker-carita-gato', 'Sticker carita de gato', 'plano', 'animales', 14, 12, 195, 'vinilo', ['#1E1E1E'], 'catface-flat'),
  // Estrellas (6)
  E('estrella-oro', 'Estrella oro', 'charm3d', 'estrellas', 11, 11, 395, 'metal-oro', ['#D4AF37'], 'star-extrude', { prof: 3 }),
  E('estrella-plata', 'Estrella plata', 'charm3d', 'estrellas', 11, 11, 395, 'metal-plata', ['#C0C0C0'], 'star-extrude', { prof: 3 }),
  E('estrella-fugaz', 'Estrella fugaz', 'charm3d', 'estrellas', 18, 10, 495, 'metal-oro', ['#D4AF37', '#F4A7C3'], 'shooting-star-3d', { prof: 3 }),
  E('luna-creciente', 'Luna creciente', 'charm3d', 'estrellas', 10, 12, 395, 'metal-oro', ['#D4AF37'], 'moon-extrude', { prof: 3 }),
  E('sticker-estrella', 'Sticker estrella', 'plano', 'estrellas', 13, 13, 150, 'vinilo', ['#F5D547'], 'star-flat'),
  E('sticker-constelacion', 'Sticker constelacion', 'plano', 'estrellas', 24, 18, 250, 'vinilo', ['#D4AF37'], 'constellation-flat'),
  // Cadenas (5) — hitbox rectangular por diseno (SS11.6)
  E('cadena-curb-corta', 'Cadena curb corta', 'charm3d', 'cadenas', 8, 34, 695, 'metal-oro', ['#D4AF37'], 'chain-segment', { prof: 3, params: { eslabones: 6 }, hitboxOverride: rectHitbox(8, 34) }),
  E('cadena-curb-larga', 'Cadena curb larga', 'charm3d', 'cadenas', 8, 52, 895, 'metal-oro', ['#D4AF37'], 'chain-segment', { prof: 3, params: { eslabones: 9 }, hitboxOverride: rectHitbox(8, 52) }),
  E('cadena-perlas', 'Cadena de perlas', 'charm3d', 'cadenas', 7, 40, 795, 'nacar', ['#F6EFF2'], 'pearl-strand', { prof: 3.2, params: { perlas: 11 }, hitboxOverride: rectHitbox(7, 40) }),
  E('cadena-plata-corta', 'Cadena plata corta', 'charm3d', 'cadenas', 8, 34, 695, 'metal-plata', ['#C0C0C0'], 'chain-segment', { prof: 3, params: { eslabones: 6 }, hitboxOverride: rectHitbox(8, 34) }),
  E('sticker-cadena', 'Sticker cadena', 'plano', 'cadenas', 6, 40, 250, 'vinilo', ['#D4AF37'], 'chain-flat', { hitboxOverride: rectHitbox(6, 40) }),
  // Temporada "Verano" (5)
  E('sombrilla', 'Sombrilla', 'charm3d', 'temporada', 14, 16, 495, 'esmalte', ['#F4A7C3', '#FFFFFF'], 'umbrella-3d', { prof: 5, seasonSlug: 'verano' }),
  E('helado', 'Helado', 'charm3d', 'temporada', 10, 16, 450, 'esmalte', ['#F5EBDD', '#F4A7C3'], 'icecream-3d', { prof: 4.5, seasonSlug: 'verano' }),
  E('concha', 'Concha', 'charm3d', 'temporada', 13, 12, 450, 'nacar', ['#F6EFF2'], 'shell-3d', { prof: 4, seasonSlug: 'verano' }),
  E('sol', 'Sol', 'charm3d', 'temporada', 13, 13, 395, 'metal-oro', ['#D4AF37'], 'sun-extrude', { prof: 3, seasonSlug: 'verano' }),
  E('sticker-ola', 'Sticker ola', 'plano', 'temporada', 20, 10, 195, 'vinilo', ['#7EB6D9'], 'wave-flat', { seasonSlug: 'verano' }),
];

// Letras (SS11.3): dos juegos, un elemento por caracter
function letterElements(): ElementSeed[] {
  const out: ElementSeed[] = [];
  for (const ch of VALID_LETTER_CHARS) {
    const safe = ch === 'Ñ' ? 'nn' : ch.toLowerCase();
    const wOro = glyphWidthMm(ch, 12);
    out.push({
      slug: `letra-oro-${safe}`, nombre: 'Letra oro', tipo: 'charm3d', categoria: 'letras',
      w: wOro, h: 12, prof: 2.5, precio: 195, acabado: 'metal-oro', colores: ['#D4AF37'],
      recipe: 'letter-extrude', params: { juego: 'letras-oro' },
      hitboxOverride: rectHitbox(wOro, 12), letraChar: ch,
    });
    const wSt = glyphWidthMm(ch, 14);
    out.push({
      slug: `letra-sticker-${safe}`, nombre: 'Letra sticker', tipo: 'plano', categoria: 'letras',
      w: wSt, h: 14, precio: 95, acabado: 'vinilo', colores: ['#1E1E1E'],
      recipe: 'letter-flat', params: { juego: 'letras-sticker' },
      hitboxOverride: rectHitbox(wSt, 14), letraChar: ch,
    });
  }
  return out;
}

// ---------- SS11.4 Preestablecidos (4) ----------
// Coordenadas provisionales ajustadas para validar contra iPhone 15 Pro
// (camara 45x45 + 1 mm de inflado: zona prohibida hasta x=50, y=50).

interface PresetSeed {
  slug: string;
  nombre: string;
  precio: number;
  items: { el: string; x: number; y: number; rot: number }[];
}

const PRESETS: PresetSeed[] = [
  {
    slug: 'golden-hour', nombre: 'Golden Hour', precio: 2995,
    items: [
      { el: 'estrella-oro', x: 24, y: 62, rot: 15 },
      { el: 'luna-creciente', x: 52, y: 60, rot: 350 },
      { el: 'corazon-oro', x: 20, y: 88, rot: 20 },
      { el: 'corazon-oro', x: 36, y: 102, rot: 0 },
      { el: 'corazon-oro', x: 52, y: 116, rot: 340 },
    ],
  },
  {
    slug: 'jardin', nombre: 'Jardin', precio: 3495,
    items: [
      { el: 'flor-cerezo', x: 22, y: 64, rot: 0 },
      { el: 'margarita', x: 50, y: 58, rot: 0 },
      { el: 'mariposa', x: 40, y: 96, rot: 25 },
      { el: 'sticker-ramillete', x: 30, y: 126, rot: 0 },
    ],
  },
  {
    slug: 'coquette', nombre: 'Coquette', precio: 3295,
    items: [
      { el: 'lazo-saten', x: 37, y: 60, rot: 0 },
      { el: 'cadena-perlas', x: 62, y: 100, rot: 0 },
      { el: 'mini-lazo', x: 22, y: 120, rot: 15 },
    ],
  },
  {
    slug: 'frutal', nombre: 'Frutal', precio: 3195,
    items: [
      { el: 'cereza', x: 24, y: 60, rot: 10 },
      { el: 'fresa', x: 50, y: 72, rot: 350 },
      { el: 'limon', x: 32, y: 92, rot: 80 },
      { el: 'sticker-sandia', x: 46, y: 116, rot: 0 },
    ],
  },
];

// ---------- main ----------

function elementHitbox(e: ElementSeed): Hitbox {
  return e.hitboxOverride ?? recipeHitbox(e.recipe, e.w, e.h);
}

async function main() {
  console.log(`Seed v4 (demo=${DEMO})`);

  // Settings singleton
  await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

  // Dispositivos
  for (const d of DEVICES) {
    await prisma.deviceModel.upsert({
      where: { slug: d.slug },
      create: {
        slug: d.slug, nombre: d.nombre, generacion: d.generacion,
        anchoMm: d.anchoMm, altoMm: d.altoMm, radioEsquinaMm: radioEsquina(d.generacion),
        grosorMm: 2.5, cameraZone: camPolygon(d.cam), moduloForma: d.moduloForma, activo: true,
      },
      update: {
        nombre: d.nombre, generacion: d.generacion, anchoMm: d.anchoMm, altoMm: d.altoMm,
        radioEsquinaMm: radioEsquina(d.generacion), cameraZone: camPolygon(d.cam),
        moduloForma: d.moduloForma, activo: true,
      },
    });
  }
  console.log(`  dispositivos: ${DEVICES.length}`);

  // Fundas + variantes + compatibilidad total (molde parametrico SS9.4)
  const allDevices = await prisma.deviceModel.findMany({ select: { id: true } });
  for (const c of CASES) {
    const base = await prisma.caseBase.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug, nombre: c.nombre, descripcion: c.descripcion, material: c.material,
        fotos: [`/renders/cases/${c.slug}.webp`], activo: true, destacada: c.destacada,
      },
      update: { nombre: c.nombre, descripcion: c.descripcion, material: c.material, activo: true, destacada: c.destacada },
    });
    await prisma.caseCompatibility.deleteMany({ where: { caseId: base.id } });
    await prisma.caseCompatibility.createMany({
      data: allDevices.map((d) => ({ caseId: base.id, deviceId: d.id })),
    });
    // Variantes: upsert por (caseBaseId, colorNombre)
    for (const v of c.variantes) {
      const existing = await prisma.caseVariant.findFirst({
        where: { caseBaseId: base.id, colorNombre: v.colorNombre },
      });
      if (existing) {
        await prisma.caseVariant.update({
          where: { id: existing.id },
          data: { colorHex: v.colorHex, precioCentimos: v.precioCentimos, disponible: true },
        });
      } else {
        await prisma.caseVariant.create({
          data: { caseBaseId: base.id, ...v, disponible: true },
        });
      }
    }
  }
  console.log(`  fundas: ${CASES.length} (variantes: ${CASES.reduce((a, c) => a + c.variantes.length, 0)})`);

  // Temporada "Verano" (activa en seed: 2026-06-01 -> 2026-09-15)
  const season = await prisma.seasonCollection.upsert({
    where: { slug: 'verano' },
    create: {
      slug: 'verano', nombre: 'Verano',
      fechaInicio: new Date('2026-06-01T00:00:00Z'),
      fechaFin: new Date('2026-09-15T23:59:59Z'),
      activo: true,
    },
    update: { activo: true },
  });

  // Elementos (+ letras)
  const allElements = [...ELEMENTS, ...letterElements()];
  let orden = 0;
  for (const e of allElements) {
    const hitbox = elementHitbox(e);
    await prisma.element.upsert({
      where: { slug: e.slug },
      create: {
        slug: e.slug, nombre: e.nombre, tipo: e.tipo, categoria: e.categoria,
        precioCentimos: e.precio, anchoMm: e.w, altoMm: e.h, profundidadMm: e.prof ?? null,
        recipe: e.recipe, recipeParams: (e.params ?? undefined) as object | undefined,
        hitbox: hitbox as unknown as object, acabado: e.acabado, colores: e.colores,
        letraChar: e.letraChar ?? null, esNuevo: e.esNuevo ?? false, orden: orden++,
        activo: true, seasonId: e.seasonSlug ? season.id : null,
      },
      update: {
        nombre: e.nombre, tipo: e.tipo, categoria: e.categoria, precioCentimos: e.precio,
        anchoMm: e.w, altoMm: e.h, profundidadMm: e.prof ?? null, recipe: e.recipe,
        recipeParams: (e.params ?? undefined) as object | undefined,
        hitbox: hitbox as unknown as object, acabado: e.acabado, colores: e.colores,
        letraChar: e.letraChar ?? null, activo: true,
        seasonId: e.seasonSlug ? season.id : null,
      },
    });
  }
  console.log(`  elementos: ${allElements.length} (incluye ${letterElements().length} glifos)`);

  // Preestablecidos: VALIDACION OBLIGATORIA con el motor (SS11.4)
  const ref = DEVICES.find((d) => d.slug === 'iphone-15-pro')!;
  const refSpec: DeviceSpec = {
    anchoMm: ref.anchoMm, altoMm: ref.altoMm,
    radioEsquinaMm: radioEsquina(ref.generacion), cameraZone: camPolygon(ref.cam),
  };
  const shapes = new Map<string, ElementShape>();
  for (const e of allElements) {
    shapes.set(e.slug, { hitbox: elementHitbox(e), anchoMm: e.w, altoMm: e.h });
  }
  const siliconaRosa = await prisma.caseVariant.findFirstOrThrow({
    where: { colorNombre: 'Rosa', caseBase: { slug: 'silicona-soft' } },
  });

  for (const p of PRESETS) {
    const items: PlacedItem[] = p.items.map((it, i) => ({
      instanceId: `${p.slug}-${i}`, elementId: it.el, xMm: it.x, yMm: it.y, rotationDeg: it.rot,
    }));
    const results = validarEscena(items, shapes, refSpec);
    const invalid = [...results.entries()].filter(([, r]) => !r.valida);
    if (invalid.length > 0) {
      const detail = invalid
        .map(([id, r]) => `${id}: ${r.motivo}${r.refs ? ` (${r.refs.join(',')})` : ''}`)
        .join('; ');
      throw new Error(`Preset "${p.nombre}" invalido: ${detail}. El seed aborta (SS11.4).`);
    }
    const elementIdMap = new Map<string, string>();
    for (const it of p.items) {
      if (!elementIdMap.has(it.el)) {
        const el = await prisma.element.findUniqueOrThrow({ where: { slug: it.el } });
        elementIdMap.set(it.el, el.id);
      }
    }
    await prisma.presetDesign.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug, nombre: p.nombre, precioCentimos: p.precio,
        designData: {
          caseSlug: 'silicona-soft', caseVariantId: siliconaRosa.id,
          referenceDeviceSlug: 'iphone-15-pro',
          elementos: p.items.map((it, i) => ({
            instanceId: `${p.slug}-${i}`, elementId: elementIdMap.get(it.el),
            elementSlug: it.el, xMm: it.x, yMm: it.y, rotationDeg: it.rot,
          })),
        },
        fotos: [`/renders/presets/${p.slug}.webp`],
        publicado: true, orden: PRESETS.indexOf(p),
      },
      update: {
        nombre: p.nombre, precioCentimos: p.precio, publicado: true, orden: PRESETS.indexOf(p),
      },
    });
  }
  console.log(`  preestablecidos: ${PRESETS.length} (validados contra ${ref.nombre})`);

  // ---------- SS11.7 Contenido de demostracion ----------
  if (DEMO) {
    const { hash } = await import('@node-rs/argon2');
    const passwordHash = await hash(process.env.SEED_ADMIN_PASSWORD ?? 'cutecases-dev');
    const admin = await prisma.user.upsert({
      where: { email: 'admin@cutecases.dev' },
      create: { email: 'admin@cutecases.dev', nombre: 'Equipo Cute Cases', provider: 'credentials', passwordHash, rol: 'admin', emailVerificado: true },
      update: { rol: 'admin' },
    });
    const demo = await prisma.user.upsert({
      where: { email: 'demo@cutecases.dev' },
      create: { email: 'demo@cutecases.dev', nombre: 'Vega', provider: 'credentials', passwordHash, emailVerificado: true },
      update: {},
    });
    const estudio = await prisma.user.upsert({
      where: { email: 'estudio@cutecases.dev' },
      create: { email: 'estudio@cutecases.dev', nombre: 'Estudio Cute Cases', provider: 'credentials', passwordHash, emailVerificado: true },
      update: {},
    });

    const iphone15pro = await prisma.deviceModel.findUniqueOrThrow({ where: { slug: 'iphone-15-pro' } });
    const el = async (slug: string) => (await prisma.element.findUniqueOrThrow({ where: { slug } })).id;

    // 6 disenos publicados en galeria (autor Estudio) + 2 guardados de demo
    const galleryDesigns: { nombre: string; likes: number; items: { el: string; x: number; y: number; rot: number }[] }[] = [
      { nombre: 'Atardecer', likes: 48, items: [{ el: 'sol', x: 30, y: 64, rot: 0 }, { el: 'sticker-ola', x: 38, y: 96, rot: 0 }, { el: 'concha', x: 50, y: 120, rot: 20 }] },
      { nombre: 'Cielo nocturno', likes: 37, items: [{ el: 'luna-creciente', x: 24, y: 62, rot: 340 }, { el: 'estrella-oro', x: 46, y: 78, rot: 15 }, { el: 'sticker-constelacion', x: 36, y: 112, rot: 0 }] },
      { nombre: 'Merienda', likes: 29, items: [{ el: 'fresa', x: 26, y: 66, rot: 10 }, { el: 'cereza', x: 48, y: 80, rot: 350 }, { el: 'helado', x: 34, y: 110, rot: 0 }] },
      { nombre: 'Mininos', likes: 21, items: [{ el: 'gatito', x: 30, y: 68, rot: 0 }, { el: 'sticker-huella', x: 46, y: 88, rot: 25 }, { el: 'sticker-carita-gato', x: 38, y: 116, rot: 0 }] },
      { nombre: 'Lacitos', likes: 16, items: [{ el: 'lazo-coqueta', x: 36, y: 62, rot: 0 }, { el: 'mini-lazo', x: 22, y: 90, rot: 15 }, { el: 'sticker-lazo', x: 46, y: 116, rot: 345 }] },
      { nombre: 'Prado', likes: 12, items: [{ el: 'margarita', x: 26, y: 64, rot: 0 }, { el: 'abeja', x: 48, y: 82, rot: 30 }, { el: 'sticker-margarita', x: 36, y: 114, rot: 0 }] },
    ];

    const { randomBytes } = await import('node:crypto');
    for (const [i, g] of galleryDesigns.entries()) {
      const items: PlacedItem[] = g.items.map((it, j) => ({
        instanceId: `g${i}-${j}`, elementId: it.el, xMm: it.x, yMm: it.y, rotationDeg: it.rot,
      }));
      const results = validarEscena(items, shapes, refSpec);
      if ([...results.values()].some((r) => !r.valida)) {
        throw new Error(`Diseno demo "${g.nombre}" invalido; ajustar coordenadas.`);
      }
      const elementos = [];
      for (const [j, it] of g.items.entries()) {
        elementos.push({ instanceId: `g${i}-${j}`, elementId: await el(it.el), xMm: it.x, yMm: it.y, rotationDeg: it.rot });
      }
      const precio = siliconaRosa.precioCentimos +
        (await Promise.all(g.items.map(async (it) => (await prisma.element.findUniqueOrThrow({ where: { slug: it.el } })).precioCentimos))).reduce((a, b) => a + b, 0);
      // Miniaturas pregeneradas con /dev/renders (SS10.5)
      const thumbSlug = g.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
      const thumbnailUrl = `/renders/demo/${thumbSlug}.webp`;
      const existing = await prisma.design.findFirst({ where: { userId: estudio.id, nombre: g.nombre } });
      if (!existing) {
        await prisma.design.create({
          data: {
            userId: estudio.id, nombre: g.nombre, deviceId: iphone15pro.id,
            caseVariantId: siliconaRosa.id, elementos, thumbnailUrl,
            precioTotalCache: precio, shareToken: randomBytes(20).toString('base64url'),
            publicadoGaleria: true, autorVisible: true, likesCount: g.likes,
          },
        });
      } else if (!existing.thumbnailUrl) {
        await prisma.design.update({ where: { id: existing.id }, data: { thumbnailUrl } });
      }
    }

    // Likes reales de admin/demo sobre los 2 primeros (para el orden "semana")
    const top = await prisma.design.findMany({ where: { userId: estudio.id }, orderBy: { likesCount: 'desc' }, take: 2 });
    for (const d of top) {
      for (const u of [admin.id, demo.id]) {
        await prisma.like.upsert({
          where: { userId_designId: { userId: u, designId: d.id } },
          create: { userId: u, designId: d.id },
          update: {},
        });
      }
    }

    // 2 disenos guardados del usuario demo
    const demoDesigns = [
      { nombre: 'Mi funda', items: [{ el: 'corazon-clasico', x: 30, y: 70, rot: 0 }, { el: 'sticker-estrella', x: 48, y: 96, rot: 20 }] },
      { nombre: 'Para el insti', items: [{ el: 'mariposa', x: 36, y: 66, rot: 0 }, { el: 'sticker-flor-retro', x: 30, y: 100, rot: 0 }, { el: 'mini-corazon', x: 52, y: 118, rot: 15 }] },
    ];
    for (const [i, g] of demoDesigns.entries()) {
      const existing = await prisma.design.findFirst({ where: { userId: demo.id, nombre: g.nombre } });
      if (existing) continue;
      const elementos = [];
      for (const [j, it] of g.items.entries()) {
        elementos.push({ instanceId: `d${i}-${j}`, elementId: await el(it.el), xMm: it.x, yMm: it.y, rotationDeg: it.rot });
      }
      const precio = siliconaRosa.precioCentimos +
        (await Promise.all(g.items.map(async (it) => (await prisma.element.findUniqueOrThrow({ where: { slug: it.el } })).precioCentimos))).reduce((a, b) => a + b, 0);
      await prisma.design.create({
        data: {
          userId: demo.id, nombre: g.nombre, deviceId: iphone15pro.id,
          caseVariantId: siliconaRosa.id, elementos, precioTotalCache: precio,
          shareToken: randomBytes(20).toString('base64url'),
        },
      });
    }
    console.log('  demo: usuarios admin/demo/estudio, 6 en galeria, 2 guardados');
  }

  console.log('Seed v4 completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
