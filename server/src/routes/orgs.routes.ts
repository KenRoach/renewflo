import { FastifyInstance } from 'fastify';
import { requireOrgType } from '../lib/role-guard.js';
import { orgsRepository } from '../repositories/orgs.repository.js';
import { updateOrgSchema } from '../schemas/orgs.schema.js';
import { uuidParam, paginationQuery } from '../schemas/common.schema.js';
import { NotFoundError } from '../lib/errors.js';

export async function orgRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    requireOrgType('operator')(request);
    const params = paginationQuery.parse(request.query);
    return reply.send(await orgsRepository.list(params));
  });
  app.get('/:id', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const org = await orgsRepository.getById(id);
    if (!org) throw new NotFoundError('Organization', id);
    return reply.send(org);
  });
  app.patch('/:id', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const body = updateOrgSchema.parse(request.body);
    return reply.send(await orgsRepository.update(id, body));
  });
}
