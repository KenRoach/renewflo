import { z } from 'zod';

export const quoteStatus = z.enum([
  'draft', 'pending', 'pricing', 'rfq_pending', 'priced',
  'accepted', 'requote', 'expired', 'rejected',
]);

export const createQuoteSchema = z.object({
  lineItems: z.array(z.object({
    assetId: z.string().uuid(),
    coverageType: z.enum(['tpm', 'oem']),
    durationMonths: z.number().int().min(1),
    quantity: z.number().int().min(1).default(1),
  })).min(1),
});

export const listQuotesQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: quoteStatus.optional(),
});

export const rfqRespondSchema = z.object({
  lineItems: z.array(z.object({
    lineItemId: z.string().uuid(),
    unitPrice: z.number().positive(),
  })),
  notes: z.string().optional(),
});

export const rfqSendSchema = z.object({
  partnerIds: z.array(z.string().uuid()).min(1),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type RfqRespondInput = z.infer<typeof rfqRespondSchema>;
