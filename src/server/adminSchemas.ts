import { z } from 'zod';

/** Esquemas Zod del panel de administracion (SS17). */

const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
const polygonSchema = z.array(pointSchema).min(3).max(64);

export const deviceSchema = z.object({
  tipo: z.string().default('iphone'),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .max(60),
  nombre: z.string().trim().min(1).max(60),
  generacion: z.string().trim().min(1).max(10),
  anchoMm: z.number().positive().max(500),
  altoMm: z.number().positive().max(500),
  radioEsquinaMm: z.number().min(0).max(50),
  grosorMm: z.number().positive().max(10).default(2.5),
  cameraZone: polygonSchema,
  moduloForma: z.string().trim().min(1).max(40),
  asset3dUrl: z.string().nullable().optional(),
  activo: z.boolean().default(false),
});

export const caseSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  nombre: z.string().trim().min(1).max(80),
  descripcion: z.string().trim().max(600),
  material: z.enum(['silicona', 'transparente', 'rigida', 'rigida-perlada']),
  fotos: z.array(z.string()).max(12).default([]),
  asset3dUrl: z.string().nullable().optional(),
  activo: z.boolean().default(false),
  destacada: z.boolean().default(false),
  deviceIds: z.array(z.string()).default([]),
});

export const variantSchema = z.object({
  colorNombre: z.string().trim().min(1).max(40),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  foto: z.string().nullable().optional(),
  precioCentimos: z.number().int().min(0),
  disponible: z.boolean().default(true),
});

export const elementSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  nombre: z.string().trim().min(1).max(80),
  tipo: z.enum(['charm3d', 'plano']),
  categoria: z.enum([
    'letras',
    'corazones',
    'lazos',
    'flores',
    'frutas',
    'animales',
    'estrellas',
    'cadenas',
    'temporada',
  ]),
  precioCentimos: z.number().int().min(0),
  anchoMm: z.number().positive().max(200),
  altoMm: z.number().positive().max(200),
  profundidadMm: z.number().positive().max(50).nullable().optional(),
  recipe: z.string().max(60).nullable().optional(),
  recipeParams: z.record(z.unknown()).nullable().optional(),
  assetUrl: z.string().nullable().optional(),
  hitbox: z.array(polygonSchema).min(1).max(8),
  acabado: z.enum(['metal-oro', 'metal-plata', 'esmalte', 'cristal', 'nacar', 'vinilo']),
  colores: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(6).default([]),
  letraChar: z
    .string()
    .regex(/^[A-ZÑ0-9]$/)
    .nullable()
    .optional(),
  esNuevo: z.boolean().default(false),
  orden: z.number().int().default(0),
  activo: z.boolean().default(false),
  seasonId: z.string().nullable().optional(),
});

export const seasonSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .max(60),
  nombre: z.string().trim().min(1).max(60),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  activo: z.boolean().default(true),
});

export const presetSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  nombre: z.string().trim().min(1).max(80),
  precioCentimos: z.number().int().min(0),
  designData: z.object({
    caseSlug: z.string(),
    caseVariantId: z.string(),
    elementos: z.array(
      z.object({
        instanceId: z.string().optional(),
        elementId: z.string(),
        xMm: z.number().finite(),
        yMm: z.number().finite(),
        rotationDeg: z.number().finite(),
        letterChar: z.string().nullish(),
      }),
    ),
  }),
  fotos: z.array(z.string()).max(12).default([]),
  publicado: z.boolean().default(false),
  orden: z.number().int().default(0),
});

export const settingsSchema = z.object({
  collisionMarginMm: z.number().min(0).max(5).optional(),
  heroClaim: z.string().trim().max(120).optional(),
  gridDefault: z.boolean().optional(),
});
