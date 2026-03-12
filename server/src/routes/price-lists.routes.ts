import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { requireOrgType } from '../lib/role-guard.js';
import { priceListsService } from '../services/price-lists.service.js';
import { createPriceListSchema, updatePriceListSchema, lookupSchema } from '../schemas/price-lists.schema.js';
import { uuidParam, paginationQuery } from '../schemas/common.schema.js';

export async function priceListRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    requireOrgType('delivery_partner', 'operator')(request);
    const params = paginationQuery.parse(request.query);
    return reply.send(await priceListsService.list(createUserClient(request.user.accessToken), params));
  });
  app.post('/', async (request, reply) => {
    requireOrgType('delivery_partner')(request);
    const body = createPriceListSchema.parse(request.body);
    return reply.status(201).send(await priceListsService.create(createUserClient(request.user.accessToken), request.user.orgId, body));
  });
  app.patch('/:id', async (request, reply) => {
    requireOrgType('delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    const body = updatePriceListSchema.parse(request.body);
    return reply.send(await priceListsService.update(createUserClient(request.user.accessToken), id, body));
  });
  app.delete('/:id', async (request, reply) => {
    requireOrgType('delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    await priceListsService.remove(createUserClient(request.user.accessToken), id);
    return reply.status(204).send();
  });
  app.post('/lookup', async (request, reply) => {
    requireOrgType('operator')(request);
    const body = lookupSchema.parse(request.body);
    return reply.send(await priceListsService.lookup(createUserClient(request.user.accessToken), body));
  });
}
