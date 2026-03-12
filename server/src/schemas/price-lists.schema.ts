import { z } from 'zod';

export const createPriceListSchema = z.object({
  brand: z.string().min(1),
  modelPattern: z.string().min(1),
  coverageType: z.enum(['tpm', 'oem']),
  durationMonths: z.number().int().min(1),
  unitPrice: z.number().positive(),
  validFrom: z.string().date(),
  validUntil: z.string().date(),
});

export const updatePriceListSchema = createPriceListSchema.partial();

export const lookupSchema = z.object({
  assets: z.array(z.object({
    assetId: z.string().uuid(),
    brand: z.string(),
    model: z.string(),
    coverageType: z.enum(['tpm', 'oem']),
    durationMonths: z.number().int(),
  })),
});

export type CreatePriceListInput = z.infer<typeof createPriceListSchema>;
export type LookupInput = z.infer<typeof lookupSchema>;
