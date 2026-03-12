import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { supportRepository } from '../repositories/support.repository.js';
import { createTicketSchema, updateTicketSchema, listTicketsQuery } from '../schemas/support.schema.js';
import { uuidParam } from '../schemas/common.schema.js';
import { NotFoundError } from '../lib/errors.js';

export async function supportRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const params = listTicketsQuery.parse(request.query);
    return reply.send(await supportRepository.list(createUserClient(request.user.accessToken), params));
  });
  app.post('/', async (request, reply) => {
    const body = createTicketSchema.parse(request.body);
    const ticket = await supportRepository.create(createUserClient(request.user.accessToken), {
      org_id: request.user.orgId, reported_by: request.user.id, subject: body.subject,
      description: body.description, asset_id: body.assetId ?? null, po_id: body.poId ?? null, priority: body.priority, status: 'open',
    });
    return reply.status(201).send(ticket);
  });
  app.get('/:id', async (request, reply) => {
    const { id } = uuidParam.parse(request.params);
    const ticket = await supportRepository.getById(createUserClient(request.user.accessToken), id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    return reply.send(ticket);
  });
  app.patch('/:id', async (request, reply) => {
    const { id } = uuidParam.parse(request.params);
    const body = updateTicketSchema.parse(request.body);
    return reply.send(await supportRepository.update(createUserClient(request.user.accessToken), id, body));
  });
  app.post('/:id/escalate', async (request, reply) => {
    const { id } = uuidParam.parse(request.params);
    return reply.send(await supportRepository.update(createUserClient(request.user.accessToken), id, { status: 'escalated' }));
  });
}
