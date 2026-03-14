import { FastifyInstance } from 'fastify';

export async function entitlementRoutes(app: FastifyInstance) {
  // Stub: list entitlements for the org (future implementation)
  app.get('/', async (_request, reply) => {
    return reply.send({ data: [], nextCursor: null, hasMore: false });
  });

  // Stub: create entitlement
  app.post('/', async (_request, reply) => {
    return reply.status(501).send({ code: 'NOT_IMPLEMENTED', message: 'Entitlement creation not yet available' });
  });
}
