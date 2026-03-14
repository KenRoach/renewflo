import { FastifyInstance } from 'fastify';
import { requireOrgType } from '../lib/role-guard.js';

export async function entitlementRoutes(app: FastifyInstance) {
  // Stub: list entitlements for the org (future implementation)
  app.get('/', async (request, reply) => {
    requireOrgType('delivery_partner', 'operator')(request);
    return reply.send({ data: [], nextCursor: null, hasMore: false });
  });

  // Stub: create entitlement
  app.post('/', async (request, reply) => {
    requireOrgType('operator')(request);
    return reply.status(501).send({ code: 'NOT_IMPLEMENTED', message: 'Entitlement creation not yet available' });
  });
}
