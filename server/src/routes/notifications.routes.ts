import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { notificationsRepository } from '../repositories/notifications.repository.js';
import { listNotificationsQuery } from '../schemas/notifications.schema.js';
import { uuidParam } from '../schemas/common.schema.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const params = listNotificationsQuery.parse(request.query);
    return reply.send(await notificationsRepository.list(createUserClient(request.user.accessToken), params));
  });
  app.patch('/:id/read', async (request, reply) => {
    const { id } = uuidParam.parse(request.params);
    await notificationsRepository.markRead(createUserClient(request.user.accessToken), id);
    return reply.send({ success: true });
  });
  app.post('/mark-all-read', async (request, reply) => {
    await notificationsRepository.markAllRead(createUserClient(request.user.accessToken), request.user.orgId);
    return reply.send({ success: true });
  });
}
