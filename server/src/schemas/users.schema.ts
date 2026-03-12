import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export const updateUserSchema = z.object({
  fullName: z.string().optional(),
  role: z.enum(['admin', 'member', 'viewer']).optional(),
  active: z.boolean().optional(),
});
