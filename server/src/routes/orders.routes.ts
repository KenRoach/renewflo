import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { requireOrgType } from '../lib/role-guard.js';
import { ordersService } from '../services/orders.service.js';
import { createOrderSchema, listOrdersQuery, verifyEntitlementSchema } from '../schemas/orders.schema.js';
import { uuidParam } from '../schemas/common.schema.js';

export async function orderRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    requireOrgType('var')(request);
    const body = createOrderSchema.parse(request.body);
    return reply.status(201).send(await ordersService.create(createUserClient(request.user.accessToken), request.user.orgId, request.user.id, body));
  });
  app.get('/', async (request, reply) => {
    requireOrgType('var', 'operator', 'delivery_partner')(request);
    const params = listOrdersQuery.parse(request.query);
    return reply.send(await ordersService.list(createUserClient(request.user.accessToken), params));
  });
  app.get('/:id', async (request, reply) => {
    requireOrgType('var', 'operator', 'delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await ordersService.getById(createUserClient(request.user.accessToken), id));
  });
  app.post('/:id/review', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await ordersService.transition(createUserClient(request.user.accessToken), id, request.user.id, 'under_review', { reviewed_by: request.user.id, reviewed_at: new Date().toISOString() }));
  });
  app.post('/:id/approve', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await ordersService.transition(createUserClient(request.user.accessToken), id, request.user.id, 'approved'));
  });
  app.post('/:id/route', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await ordersService.transition(createUserClient(request.user.accessToken), id, request.user.id, 'routed', { routed_at: new Date().toISOString() }));
  });
  app.post('/:id/acknowledge', async (request, reply) => {
    requireOrgType('delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await ordersService.transition(createUserClient(request.user.accessToken), id, request.user.id, 'acknowledged'));
  });
  app.post('/:id/verify-entitlement', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const body = verifyEntitlementSchema.parse(request.body);
    return reply.send(await ordersService.verifyEntitlement(createUserClient(request.user.accessToken), id, request.user.id, body));
  });
  app.post('/:id/complete', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await ordersService.transition(createUserClient(request.user.accessToken), id, request.user.id, 'completed'));
  });
  app.post('/:id/cancel', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await ordersService.transition(createUserClient(request.user.accessToken), id, request.user.id, 'cancelled'));
  });
}
