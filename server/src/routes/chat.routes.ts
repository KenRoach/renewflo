import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { requireOrgType } from '../lib/role-guard.js';

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  system: z.string().optional(),
});

export async function chatRoutes(app: FastifyInstance) {
  const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

  app.post('/message', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const body = chatSchema.parse(request.body);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: body.system ?? 'You are a helpful warranty renewal assistant for IT resellers in Latin America.',
      messages: body.messages,
    });
    return reply.send({
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      usage: response.usage,
    });
  });
}
