/**
 * SEEDS DE DESARROLLO de Cute Cases (F1 §19).
 *
 * ⚠️ AVISO IMPORTANTE (§4.1): las dimensiones y zonas de cámara de este seed son
 * APROXIMACIONES para desarrollo. Antes de activar un modelo en PRODUCCIÓN, el
 * admin debe introducir las medidas reales verificadas desde el panel. El código
 * de la aplicación NO lleva dimensiones hardcodeadas: todo sale de la BD.
 *
 * Assets: al no existir aún los GLB/PNG del proveedor, se usa el esquema
 * `procedural://<forma>` que el visor 3D renderiza con geometría procedural.
 * El admin puede sustituirlos por GLB/PNG reales sin tocar código.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Pt = { x: number; y: number };

// ---------- Helpers de hitbox (polígonos en mm, origen = centro) ----------

function rectHitbox(w: number, h: number): Pt[] {
  return [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 },
  ];
}

function circleHitbox(diameter: number, sides = 12): Pt[] {
  const r = diameter / 2;
  return Array.from({ length: sides }, (_, i) => {
    const a = (i / sides) * 2 * Math.PI;
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
}

/** Corazón simplificado de 12 vértices (§6.6: hitbox de corazón, no bounding box). */
function heartHitbox(w: number, h: number): Pt[] {
  const pts: Pt[] = [
    { x: 0, y: 0.45 },
    { x: -0.35, y: 0.1 },
    { x: -0.5, y: -0.15 },
    { x: -0.45, y: -0.35 },
    { x: -0.25, y: -0.45 },
    { x: -0.1, y: -0.38 },
    { x: 0, y: -0.25 },
    { x: 0.1, y: -0.38 },
    { x: 0.25, y: -0.45 },
    { x: 0.45, y: -0.35 },
    { x: 0.5, y: -0.15 },
    { x: 0.35, y: 0.1 },
  ];
  return pts.map((p) => ({ x: p.x * w, y: p.y * h }));
}

/** Estrella de 5 puntas (cóncava, 10 vértices). */
function starHitbox(size: number): Pt[] {
  const outer = size / 2;
  const inner = outer * 0.45;
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * 2 * Math.PI - Math.PI / 2;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return pts;
}

/** Lazo: dos lóbulos + nudo (octógono ancho simplificado). */
function bowHitbox(w: number, h: number): Pt[] {
  const pts: Pt[] = [
    { x: -0.5, y: -0.3 },
    { x: -0.15, y: -0.12 },
    { x: 0.15, y: -0.12 },
    { x: 0.5, y: -0.3 },
    { x: 0.5, y: 0.3 },
    { x: 0.15, y: 0.12 },
    { x: -0.15, y: 0.12 },
    { x: -0.5, y: 0.3 },
  ];
  return pts.map((p) => ({ x: p.x * w, y: p.y * h }));
}

// ---------- Zonas de cámara (aprox. desarrollo; origen esq. sup. izq.) ----------

/** Módulo cuadrado (diagonal) arriba-izquierda: iPhone 13/14/15/16 estándar y Pro. */
function squareCam(size: number): Pt[] {
  const m = 5; // margen desde el borde
  return [
    { x: m, y: m },
    { x: m + size, y: m },
    { x: m + size, y: m + size },
    { x: m, y: m + size },
  ];
}

/** Módulo vertical (pastilla): iPhone 16 / 16e / 17 / 17 Air aprox. */
function verticalCam(w: number, h: number): Pt[] {
  const m = 5;
  return [
    { x: m, y: m },
    { x: m + w, y: m },
    { x: m + w, y: m + h },
    { x: m, y: m + h },
  ];
}

/** Barra horizontal completa: iPhone 17 Pro / Pro Max. */
function barCam(caseWidth: number, h: number): Pt[] {
  const m = 5;
  return [
    { x: m, y: m },
    { x: caseWidth - m, y: m },
    { x: caseWidth - m, y: m + h },
    { x: m, y: m + h },
  ];
}

// ---------- Dispositivos (21 modelos, §4.1) ----------

interface DeviceSeed {
  nombre: string;
  generacion: string;
  anchoMm: number;
  altoMm: number;
  radioEsquinaMm: number;
  cameraZone: Pt[];
  orden: number;
}

const devices: DeviceSeed[] = [
  // iPhone 13
  { nombre: 'iPhone 13 mini', generacion: '13', anchoMm: 66.2, altoMm: 133.5, radioEsquinaMm: 9, cameraZone: squareCam(30), orden: 1 },
  { nombre: 'iPhone 13', generacion: '13', anchoMm: 73.5, altoMm: 148.7, radioEsquinaMm: 9, cameraZone: squareCam(32), orden: 2 },
  { nombre: 'iPhone 13 Pro', generacion: '13', anchoMm: 73.5, altoMm: 148.7, radioEsquinaMm: 9, cameraZone: squareCam(37), orden: 3 },
  { nombre: 'iPhone 13 Pro Max', generacion: '13', anchoMm: 80.1, altoMm: 162.8, radioEsquinaMm: 9, cameraZone: squareCam(39), orden: 4 },
  // iPhone 14
  { nombre: 'iPhone 14', generacion: '14', anchoMm: 73.5, altoMm: 148.7, radioEsquinaMm: 9, cameraZone: squareCam(32), orden: 1 },
  { nombre: 'iPhone 14 Plus', generacion: '14', anchoMm: 80.1, altoMm: 162.8, radioEsquinaMm: 9, cameraZone: squareCam(34), orden: 2 },
  { nombre: 'iPhone 14 Pro', generacion: '14', anchoMm: 73.5, altoMm: 149.5, radioEsquinaMm: 9, cameraZone: squareCam(40), orden: 3 },
  { nombre: 'iPhone 14 Pro Max', generacion: '14', anchoMm: 79.6, altoMm: 162.7, radioEsquinaMm: 9, cameraZone: squareCam(42), orden: 4 },
  // iPhone 15
  { nombre: 'iPhone 15', generacion: '15', anchoMm: 73.6, altoMm: 149.6, radioEsquinaMm: 10, cameraZone: squareCam(33), orden: 1 },
  { nombre: 'iPhone 15 Plus', generacion: '15', anchoMm: 79.8, altoMm: 162.9, radioEsquinaMm: 10, cameraZone: squareCam(35), orden: 2 },
  { nombre: 'iPhone 15 Pro', generacion: '15', anchoMm: 72.6, altoMm: 148.6, radioEsquinaMm: 10, cameraZone: squareCam(40), orden: 3 },
  { nombre: 'iPhone 15 Pro Max', generacion: '15', anchoMm: 78.7, altoMm: 161.9, radioEsquinaMm: 10, cameraZone: squareCam(42), orden: 4 },
  // iPhone 16
  { nombre: 'iPhone 16', generacion: '16', anchoMm: 73.6, altoMm: 149.6, radioEsquinaMm: 10, cameraZone: verticalCam(16, 36), orden: 1 },
  { nombre: 'iPhone 16 Plus', generacion: '16', anchoMm: 79.8, altoMm: 162.9, radioEsquinaMm: 10, cameraZone: verticalCam(17, 38), orden: 2 },
  { nombre: 'iPhone 16 Pro', generacion: '16', anchoMm: 73.5, altoMm: 151.6, radioEsquinaMm: 10, cameraZone: squareCam(42), orden: 3 },
  { nombre: 'iPhone 16 Pro Max', generacion: '16', anchoMm: 79.6, altoMm: 165.0, radioEsquinaMm: 10, cameraZone: squareCam(44), orden: 4 },
  { nombre: 'iPhone 16e', generacion: '16', anchoMm: 73.5, altoMm: 148.7, radioEsquinaMm: 9, cameraZone: verticalCam(14, 26), orden: 5 },
  // iPhone 17
  { nombre: 'iPhone 17', generacion: '17', anchoMm: 73.6, altoMm: 151.6, radioEsquinaMm: 10, cameraZone: verticalCam(17, 38), orden: 1 },
  { nombre: 'iPhone 17 Air', generacion: '17', anchoMm: 76.8, altoMm: 158.2, radioEsquinaMm: 10, cameraZone: barCam(76.8, 22), orden: 2 },
  { nombre: 'iPhone 17 Pro', generacion: '17', anchoMm: 74.0, altoMm: 152.0, radioEsquinaMm: 10, cameraZone: barCam(74.0, 34), orden: 3 },
  { nombre: 'iPhone 17 Pro Max', generacion: '17', anchoMm: 80.0, altoMm: 165.5, radioEsquinaMm: 10, cameraZone: barCam(80.0, 36), orden: 4 },
];

// ---------- Elementos decorativos (§4.3) ----------

interface ElementSeed {
  nombre: string;
  tipo: 'charm3d' | 'plano';
  categoria: string;
  precioCentimos: number;
  anchoMm: number;
  altoMm: number;
  profundidadMm?: number;
  assetUrl: string;
  hitbox: Pt[];
  esNuevo?: boolean;
  orden: number;
  letraChar?: string;
  season?: boolean;
}

function buildElements(): ElementSeed[] {
  const els: ElementSeed[] = [];

  // Corazones
  const heartColors = ['rosa', 'fucsia', 'rojo', 'perlado'];
  heartColors.forEach((color, i) => {
    els.push({
      nombre: `Corazón ${color}`,
      tipo: 'charm3d',
      categoria: 'corazones',
      precioCentimos: 250,
      anchoMm: 12,
      altoMm: 11,
      profundidadMm: 4,
      assetUrl: `procedural://heart?color=${color}`,
      hitbox: heartHitbox(12, 11),
      orden: i,
    });
  });
  els.push({
    nombre: 'Corazón grande brillante',
    tipo: 'charm3d',
    categoria: 'corazones',
    precioCentimos: 390,
    anchoMm: 18,
    altoMm: 16,
    profundidadMm: 5,
    assetUrl: 'procedural://heart?color=glitter',
    hitbox: heartHitbox(18, 16),
    esNuevo: true,
    orden: 4,
  });
  els.push({
    nombre: 'Mini corazón sticker',
    tipo: 'plano',
    categoria: 'corazones',
    precioCentimos: 120,
    anchoMm: 8,
    altoMm: 7,
    assetUrl: 'procedural://heart-flat?color=rosa',
    hitbox: heartHitbox(8, 7),
    orden: 5,
  });

  // Lazos
  ['rosa', 'blanco', 'fucsia'].forEach((color, i) => {
    els.push({
      nombre: `Lazo ${color}`,
      tipo: 'charm3d',
      categoria: 'lazos',
      precioCentimos: 320,
      anchoMm: 16,
      altoMm: 10,
      profundidadMm: 5,
      assetUrl: `procedural://bow?color=${color}`,
      hitbox: bowHitbox(16, 10),
      orden: i,
    });
  });
  els.push({
    nombre: 'Lazo coqueta XL',
    tipo: 'charm3d',
    categoria: 'lazos',
    precioCentimos: 450,
    anchoMm: 24,
    altoMm: 15,
    profundidadMm: 6,
    assetUrl: 'procedural://bow?color=coqueta',
    hitbox: bowHitbox(24, 15),
    esNuevo: true,
    orden: 3,
  });

  // Flores
  ['margarita', 'rosa', 'lavanda', 'girasol'].forEach((flor, i) => {
    els.push({
      nombre: `Flor ${flor}`,
      tipo: 'charm3d',
      categoria: 'flores',
      precioCentimos: 280,
      anchoMm: 13,
      altoMm: 13,
      profundidadMm: 4,
      assetUrl: `procedural://flower?tipo=${flor}`,
      hitbox: circleHitbox(13),
      orden: i,
    });
  });
  els.push({
    nombre: 'Florecitas sticker',
    tipo: 'plano',
    categoria: 'flores',
    precioCentimos: 150,
    anchoMm: 10,
    altoMm: 10,
    assetUrl: 'procedural://flower-flat',
    hitbox: circleHitbox(10),
    orden: 4,
  });

  // Frutas
  ['fresa', 'cereza', 'limón', 'sandía', 'melocotón'].forEach((fruta, i) => {
    els.push({
      nombre: `Fruta ${fruta}`,
      tipo: 'charm3d',
      categoria: 'frutas',
      precioCentimos: 300,
      anchoMm: 12,
      altoMm: 12,
      profundidadMm: 5,
      assetUrl: `procedural://fruit?tipo=${fruta}`,
      hitbox: circleHitbox(12),
      orden: i,
    });
  });

  // Animales
  ['gatito', 'osito', 'conejito', 'patito', 'mariposa'].forEach((animal, i) => {
    els.push({
      nombre: `Animalito ${animal}`,
      tipo: 'charm3d',
      categoria: 'animales',
      precioCentimos: 350,
      anchoMm: 15,
      altoMm: 15,
      profundidadMm: 6,
      assetUrl: `procedural://animal?tipo=${animal}`,
      hitbox: circleHitbox(15),
      orden: i,
    });
  });
  els.push({
    nombre: 'Mariposa sticker',
    tipo: 'plano',
    categoria: 'animales',
    precioCentimos: 160,
    anchoMm: 12,
    altoMm: 10,
    assetUrl: 'procedural://butterfly-flat',
    hitbox: rectHitbox(12, 10),
    orden: 5,
  });

  // Estrellas
  ['dorada', 'plateada', 'rosa'].forEach((color, i) => {
    els.push({
      nombre: `Estrella ${color}`,
      tipo: 'charm3d',
      categoria: 'estrellas',
      precioCentimos: 260,
      anchoMm: 12,
      altoMm: 12,
      profundidadMm: 4,
      assetUrl: `procedural://star?color=${color}`,
      hitbox: starHitbox(12),
      orden: i,
    });
  });
  els.push({
    nombre: 'Lluvia de estrellitas sticker',
    tipo: 'plano',
    categoria: 'estrellas',
    precioCentimos: 140,
    anchoMm: 9,
    altoMm: 9,
    assetUrl: 'procedural://star-flat',
    hitbox: starHitbox(9),
    orden: 3,
  });

  // Cadenas
  ['dorada', 'plateada', 'perlas'].forEach((tipo, i) => {
    els.push({
      nombre: `Cadena ${tipo}`,
      tipo: 'charm3d',
      categoria: 'cadenas',
      precioCentimos: 480,
      anchoMm: 40,
      altoMm: 8,
      profundidadMm: 4,
      assetUrl: `procedural://chain?tipo=${tipo}`,
      hitbox: rectHitbox(40, 8),
      orden: i,
    });
  });

  // Letras (§4.4): un Element por carácter A–Z, Ñ, 0–9
  const chars = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789';
  [...chars].forEach((ch, i) => {
    els.push({
      nombre: 'Letra dorada',
      tipo: 'charm3d',
      categoria: 'letras',
      precioCentimos: 150,
      anchoMm: 9,
      altoMm: 11,
      profundidadMm: 3,
      assetUrl: `procedural://letter?char=${encodeURIComponent(ch)}`,
      hitbox: rectHitbox(9, 11),
      orden: i,
      letraChar: ch,
    });
  });

  // Temporada 🎄 (colección navideña de ejemplo)
  ['arbolito', 'copo de nieve', 'bastón de caramelo', 'gorro'].forEach((item, i) => {
    els.push({
      nombre: `Navidad: ${item}`,
      tipo: 'charm3d',
      categoria: 'temporada',
      precioCentimos: 340,
      anchoMm: 13,
      altoMm: 13,
      profundidadMm: 5,
      assetUrl: `procedural://xmas?tipo=${encodeURIComponent(item)}`,
      hitbox: circleHitbox(13),
      orden: i,
      season: true,
    });
  });

  return els;
}

// ---------- Main ----------

async function main() {
  console.log('🌱 Sembrando datos de desarrollo de Cute Cases…');

  // Limpieza idempotente (solo desarrollo)
  await prisma.adminAudit.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.report.deleteMany();
  await prisma.like.deleteMany();
  await prisma.design.deleteMany();
  await prisma.presetDesign.deleteMany();
  await prisma.element.deleteMany();
  await prisma.seasonCollection.deleteMany();
  await prisma.caseVariant.deleteMany();
  await prisma.caseCompatibility.deleteMany();
  await prisma.caseBase.deleteMany();
  await prisma.user.deleteMany();
  await prisma.deviceModel.deleteMany();
  await prisma.appSetting.deleteMany();

  // Dispositivos
  const deviceIds: Record<string, string> = {};
  for (const d of devices) {
    const created = await prisma.deviceModel.create({
      data: {
        tipo: 'iphone',
        nombre: d.nombre,
        generacion: d.generacion,
        anchoMm: d.anchoMm,
        altoMm: d.altoMm,
        radioEsquinaMm: d.radioEsquinaMm,
        cameraZone: d.cameraZone,
        asset3dUrl: 'procedural://case',
        activo: true, // ⚠️ solo en seed de DESARROLLO (medidas sin verificar)
        orden: d.orden,
      },
    });
    deviceIds[d.nombre] = created.id;
  }
  console.log(`  📱 ${devices.length} modelos de iPhone`);

  // Fundas base + variantes + compatibilidad
  const allDeviceIds = Object.values(deviceIds);
  const casesData = [
    {
      slug: 'silicona-soft',
      nombre: 'Silicona Soft',
      descripcion: 'Suave, con tacto de melocotón y protección total. La favorita de la casa 💖',
      material: 'silicona',
      destacada: true,
      variantes: [
        { colorNombre: 'Rosa bebé', colorHex: '#FFC9E3', precioCentimos: 1990 },
        { colorNombre: 'Fucsia', colorHex: '#F5259C', precioCentimos: 1990 },
        { colorNombre: 'Lila', colorHex: '#C9A7EB', precioCentimos: 2190 },
        { colorNombre: 'Blanco nube', colorHex: '#FFF7FB', precioCentimos: 1990 },
      ],
    },
    {
      slug: 'transparente-crystal',
      nombre: 'Transparente Crystal',
      descripcion: 'Deja ver tu iPhone y luce tus charms como en una vitrina ✨',
      material: 'transparente',
      destacada: true,
      variantes: [
        { colorNombre: 'Cristal', colorHex: '#F3F3F7', precioCentimos: 1790 },
        { colorNombre: 'Cristal rosado', colorHex: '#FFE4F1', precioCentimos: 1890 },
      ],
    },
    {
      slug: 'rigida-glam',
      nombre: 'Rígida Glam',
      descripcion: 'Acabado brillante tipo espejo con protección extra en las esquinas.',
      material: 'rigida',
      destacada: false,
      variantes: [
        { colorNombre: 'Rosa espejo', colorHex: '#FFA1CF', precioCentimos: 2490 },
        { colorNombre: 'Perla', colorHex: '#F5EDF2', precioCentimos: 2490 },
        { colorNombre: 'Cereza', colorHex: '#D42A5B', precioCentimos: 2690, disponible: false },
      ],
    },
  ];

  const caseVariantIds: Record<string, string[]> = {};
  for (const c of casesData) {
    const base = await prisma.caseBase.create({
      data: {
        slug: c.slug,
        nombre: c.nombre,
        descripcion: c.descripcion,
        material: c.material,
        fotos: [
          `/img/cases/${c.slug}-1.webp`,
          `/img/cases/${c.slug}-2.webp`,
          `/img/cases/${c.slug}-3.webp`,
        ],
        asset3dUrl: 'procedural://case',
        activo: true,
        destacada: c.destacada,
        compat: { create: allDeviceIds.map((deviceId) => ({ deviceId })) },
        variantes: { create: c.variantes },
      },
      include: { variantes: true },
    });
    caseVariantIds[c.slug] = base.variantes.map((v) => v.id);
  }
  console.log(`  🎀 ${casesData.length} fundas base con variantes`);

  // Colección de temporada activa (ventana amplia para desarrollo)
  const season = await prisma.seasonCollection.create({
    data: {
      nombre: 'Navidad Cute',
      emoji: '🎄',
      fechaInicio: new Date('2026-01-01T00:00:00Z'),
      fechaFin: new Date('2026-12-31T23:59:59Z'),
      activo: true,
    },
  });

  // Elementos
  const elements = buildElements();
  const elementIds: string[] = [];
  for (const e of elements) {
    const created = await prisma.element.create({
      data: {
        nombre: e.nombre,
        tipo: e.tipo,
        categoria: e.categoria,
        precioCentimos: e.precioCentimos,
        anchoMm: e.anchoMm,
        altoMm: e.altoMm,
        profundidadMm: e.profundidadMm ?? null,
        assetUrl: e.assetUrl,
        hitbox: e.hitbox,
        activo: true,
        esNuevo: e.esNuevo ?? false,
        orden: e.orden,
        seasonId: e.season ? season.id : null,
        letraChar: e.letraChar ?? null,
      },
    });
    elementIds.push(created.id);
  }
  console.log(`  💎 ${elements.length} elementos decorativos (incluye ${37} letras)`);

  // Usuarios: admin + demo (contraseña en dev: "cutecases123")
  const { hash } = await import('@node-rs/argon2');
  const passwordHash = await hash('cutecases123');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@cutecases.dev',
      nombre: 'Equipo Cute Cases',
      provider: 'credentials',
      passwordHash,
      rol: 'admin',
      emailVerificado: true,
    },
  });
  await prisma.user.create({
    data: {
      email: 'demo@cutecases.dev',
      nombre: 'Vega',
      provider: 'credentials',
      passwordHash,
      rol: 'user',
      deviceId: deviceIds['iPhone 15 Pro'],
      emailVerificado: true,
    },
  });
  console.log('  👤 usuarios admin@cutecases.dev y demo@cutecases.dev (pass: cutecases123)');

  // Preestablecido de ejemplo (§4.6)
  const heart = await prisma.element.findFirst({ where: { categoria: 'corazones' } });
  const bow = await prisma.element.findFirst({ where: { categoria: 'lazos' } });
  const star = await prisma.element.findFirst({ where: { categoria: 'estrellas' } });
  const siliconaVariants = caseVariantIds['silicona-soft'] ?? [];
  if (heart && bow && star && siliconaVariants.length > 0) {
    await prisma.presetDesign.create({
      data: {
        slug: 'sueno-rosa',
        nombre: 'Sueño Rosa',
        precioCentimos: 2990,
        designData: {
          caseSlug: 'silicona-soft',
          caseVariantId: siliconaVariants[0],
          elementos: [
            { elementId: heart.id, xMm: 36, yMm: 75, rotacionGrados: 0 },
            { elementId: bow.id, xMm: 36, yMm: 100, rotacionGrados: 12 },
            { elementId: star.id, xMm: 52, yMm: 120, rotacionGrados: 340 },
          ],
        },
        fotos: ['/img/presets/sueno-rosa.webp'],
        publicado: true,
        orden: 0,
      },
    });
    console.log('  🌟 1 diseño preestablecido publicado');
  }

  // Ajustes globales (§11 Ajustes)
  await prisma.appSetting.createMany({
    data: [
      { key: 'collisionMarginMm', value: 0.5 },
      { key: 'heroClaim', value: 'Tu funda, tu rollo ✨' },
      { key: 'gridDefaultOn', value: false },
    ],
  });

  console.log(`✅ Seed completado (admin: ${admin.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
