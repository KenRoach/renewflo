import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().optional(),
  assetId: z.string().uuid().optional(),
  poId: z.string().uuid().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
});

export const updateTicketSchema = z.object({
  subject: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'escalated', 'resolved']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assignee: z.string().uuid().nullable().optional(),
});

export const listTicketsQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(['open', 'in_progress', 'escalated', 'resolved']).optional(),
});
