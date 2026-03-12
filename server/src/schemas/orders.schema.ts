import { z } from 'zod';

export const orderStatus = z.enum([
  'submitted', 'under_review', 'approved', 'routed',
  'acknowledged', 'entitlement_verified', 'completed', 'cancelled',
]);

export const createOrderSchema = z.object({
  quoteId: z.string().uuid(),
});

export const listOrdersQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: orderStatus.optional(),
});

export const verifyEntitlementSchema = z.object({
  entitlements: z.array(z.object({
    assetId: z.string().uuid(),
    entitlementId: z.string().min(1),
    coverageStart: z.string().date(),
    coverageEnd: z.string().date(),
  })),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyEntitlementInput = z.infer<typeof verifyEntitlementSchema>;
