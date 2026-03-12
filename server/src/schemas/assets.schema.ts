import { z } from 'zod';

export const assetTier = z.enum(['critical', 'standard', 'low-use', 'eol']);
export const assetStatus = z.enum([
  'discovered', 'alerted-90', 'alerted-60', 'alerted-30', 'alerted-14', 'alerted-7',
  'quoted', 'tpm-approved', 'oem-approved', 'fulfilled', 'lost', 'lapsed',
]);

export const listAssetsQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: assetStatus.optional(),
  tier: assetTier.optional(),
  brand: z.string().optional(),
  search: z.string().optional(),
});

export const updateAssetSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  device_type: z.string().optional(),
  tier: assetTier.optional(),
  warranty_end: z.string().date().optional(),
  purchase_date: z.string().date().optional(),
  status: assetStatus.optional(),
});

export type ListAssetsQuery = z.infer<typeof listAssetsQuery>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
