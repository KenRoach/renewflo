import { z } from 'zod';

export const listNotificationsQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unreadOnly: z.coerce.boolean().default(false),
});
