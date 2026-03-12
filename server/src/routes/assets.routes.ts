import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { requireOrgType } from '../lib/role-guard.js';
import { assetsService } from '../services/assets.service.js';
import { listAssetsQuery, updateAssetSchema } from '../schemas/assets.schema.js';
import { uuidParam } from '../schemas/common.schema.js';

export async function assetRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const params = listAssetsQuery.parse(request.query);
    return reply.send(await assetsService.list(createUserClient(request.user.accessToken), params));
  });
  app.get('/:id', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const { id } = uuidParam.parse(request.params);
    return reply.send(await assetsService.getById(createUserClient(request.user.accessToken), id));
  });
  app.patch('/:id', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const { id } = uuidParam.parse(request.params);
    const body = updateAssetSchema.parse(request.body);
    return reply.send(await assetsService.update(createUserClient(request.user.accessToken), id, body));
  });
  app.delete('/:id', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const { id } = uuidParam.parse(request.params);
    await assetsService.remove(createUserClient(request.user.accessToken), id);
    return reply.status(204).send();
  });
  app.post('/import', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const file = await request.file();
    if (!file) return reply.status(400).send({ error: 'No file uploaded' });
    const buffer = await file.toBuffer();
    const result = await assetsService.importCsv(createUserClient(request.user.accessToken), request.user.orgId, request.user.id, file.filename, buffer);
    return reply.status(201).send(result);
  });
}
