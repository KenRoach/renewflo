import { z } from 'zod';

export const uuidParam = z.object({
  id: z.string().uuid(),
});

export const paginationQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  order: z.enum(['asc', 'desc']).default('desc'),
});
