import { z } from 'zod';

/** Validacion Zod en todos los limites (SS13, SS14.1 paso 1). */

export const placedItemSchema = z.object({
  instanceId: z.string().min(1).max(64),
  elementId: z.string().min(1).max(64),
  xMm: z.number().finite(),
  yMm: z.number().finite(),
  rotationDeg: z
    .number()
    .finite()
    .transform((v) => {
      // Rotaciones normalizadas a [0, 360) (SS14.1)
      let r = v % 360;
      if (r < 0) r += 360;
      return r;
    }),
  letterChar: z
    .string()
    .regex(/^[A-ZÑ0-9]$/)
    .nullish()
    .transform((v) => v ?? undefined),
});

export const designPayloadSchema = z.object({
  nombre: z.string().trim().min(1).max(40).optional(),
  deviceId: z.string().min(1),
  caseVariantId: z.string().min(1),
  elementos: z.array(placedItemSchema).max(200),
  /** Para el control de concurrencia T-19 (SS7.10). */
  updatedAt: z.string().datetime().optional(),
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
  nombre: z.string().trim().max(40).optional(),
});

export const galleryToggleSchema = z.object({
  publicado: z.boolean().optional(),
  autorVisible: z.boolean().optional(),
});

export const shareNameSchema = z.object({
  shareNombre: z.string().trim().max(30).nullable().optional(),
});

export const renameSchema = z.object({
  nombre: z.string().trim().min(1).max(40).optional(),
  shareNombre: z.string().trim().max(30).nullable().optional(),
});

export const reportSchema = z.object({
  motivo: z.string().trim().max(200).optional(),
});

export const lettersExpandSchema = z.object({
  texto: z.string().max(60),
  juego: z.enum(['letras-oro', 'letras-sticker']).default('letras-oro'),
});

export const cartAddSchema = z
  .object({
    designId: z.string().optional(),
    presetId: z.string().optional(),
    deviceId: z.string().optional(),
    cantidad: z.number().int().min(1).max(99).default(1),
  })
  .refine((d) => Boolean(d.designId) !== Boolean(d.presetId), {
    message: 'Exactamente uno de designId o presetId',
  });

export const cartUpdateSchema = z.object({
  cantidad: z.number().int().min(1).max(99),
});

export const thumbnailConfirmSchema = z.object({
  publicUrl: z.string().url().max(500),
});

export const meUpdateSchema = z.object({
  nombre: z.string().trim().max(40).nullable().optional(),
  deviceId: z.string().nullable().optional(),
  autorVisible: z.boolean().optional(),
  /** Favoritos del panel de elementos (N8): ids de Element. */
  favoritos: z.array(z.string().max(64)).max(200).optional(),
});
