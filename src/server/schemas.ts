import { z } from 'zod';

/** Validación Zod en todos los límites (§12.1). */

export const elementInstanceSchema = z.object({
  instanceId: z.string().min(1).max(64),
  elementId: z.string().min(1).max(64),
  xMm: z.number().finite(),
  yMm: z.number().finite(),
  rotacionGrados: z.number().finite().min(0).max(360),
  letraChar: z.string().regex(/^[A-ZÑ0-9]$/).optional(),
});

export const designPayloadSchema = z.object({
  nombre: z.string().trim().min(1).max(60).optional(),
  deviceId: z.string().min(1),
  caseVariantId: z.string().min(1),
  elementos: z.array(elementInstanceSchema).max(200),
  // Nota §12.5: cualquier precio enviado por el cliente se IGNORA.
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(200),
  nombre: z.string().trim().max(60).optional(),
});

export const galleryToggleSchema = z.object({
  publicadoGaleria: z.boolean().optional(),
  autorVisible: z.boolean().optional(),
});

export const shareNameSchema = z.object({
  shareNombre: z.string().trim().max(40).nullable().optional(),
});

export const renameSchema = z.object({
  nombre: z.string().trim().min(1).max(60),
});

export const reportSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
});

export const lettersExpandSchema = z.object({
  texto: z.string().max(50),
});

export const cartAddSchema = z
  .object({
    designId: z.string().optional(),
    presetId: z.string().optional(),
    cantidad: z.number().int().min(1).max(99).default(1),
  })
  .refine((d) => Boolean(d.designId) !== Boolean(d.presetId), {
    message: 'Exactamente uno de designId o presetId',
  });

export const cartUpdateSchema = z.object({
  cantidad: z.number().int().min(1).max(99),
});

export const thumbnailSchema = z.object({
  /** WebP en base64 (sin prefijo data:). Máx ~1 MB decodificado. */
  imageBase64: z.string().max(1_500_000),
});
