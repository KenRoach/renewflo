import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createUserClient } from '../supabase.js';
import { requireOrgType } from '../lib/role-guard.js';
import { quotesService } from '../services/quotes.service.js';
import { createQuoteSchema, listQuotesQuery, rfqSendSchema, rfqRespondSchema } from '../schemas/quotes.schema.js';
import { uuidParam } from '../schemas/common.schema.js';

export async function quoteRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    requireOrgType('var')(request);
    const body = createQuoteSchema.parse(request.body);
    return reply.status(201).send(await quotesService.create(createUserClient(request.user.accessToken), request.user.orgId, request.user.id, body));
  });
  app.get('/', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const params = listQuotesQuery.parse(request.query);
    return reply.send(await quotesService.list(createUserClient(request.user.accessToken), params));
  });
  app.get('/:id', async (request, reply) => {
    requireOrgType('var', 'operator', 'delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await quotesService.getById(createUserClient(request.user.accessToken), id));
  });
  app.post('/:id/submit', async (request, reply) => {
    requireOrgType('var')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await quotesService.submit(createUserClient(request.user.accessToken), id, request.user.id));
  });
  app.post('/:id/requote', async (request, reply) => {
    requireOrgType('var')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await quotesService.requote(createUserClient(request.user.accessToken), id, request.user.id));
  });
  app.post('/:id/accept', async (request, reply) => {
    requireOrgType('var')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await quotesService.accept(createUserClient(request.user.accessToken), id, request.user.id));
  });
  app.post('/:id/reject', async (request, reply) => {
    requireOrgType('var')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await quotesService.reject(createUserClient(request.user.accessToken), id, request.user.id));
  });
  app.post('/:id/rfq/send', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const body = rfqSendSchema.parse(request.body);
    return reply.send(await quotesService.sendRfq(createUserClient(request.user.accessToken), id, request.user.id, body.partnerIds));
  });
  app.post('/:id/rfq/respond', async (request, reply) => {
    requireOrgType('delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    const body = rfqRespondSchema.parse(request.body);
    return reply.send(await quotesService.respondRfq(createUserClient(request.user.accessToken), id, request.user.orgId, body));
  });
  app.post('/:id/email', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { id } = uuidParam.parse(request.params);
    const { recipients } = z.object({ recipients: z.array(z.string().email()).min(1).max(10) }).parse(request.body);

    const quote = await quotesService.getById(createUserClient(request.user.accessToken), id);

    const { emailService } = await import('../services/email.service.js');
    const result = await emailService.sendQuoteEmail(recipients, {
      quoteId: quote.id,
      status: quote.status,
      totalAmount: quote.total_amount,
      currency: quote.currency,
      lineItems: quote.line_items ?? [],
      senderName: request.user.email,
    });

    return reply.send(result);
  });
}
