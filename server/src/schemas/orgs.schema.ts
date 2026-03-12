import { z } from 'zod';

export const updateOrgSchema = z.object({
  name: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  billing_email: z.string().email().optional(),
});
