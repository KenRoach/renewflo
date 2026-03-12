import { FastifyInstance } from 'fastify';
import { requireRole } from '../lib/role-guard.js';
import { usersRepository } from '../repositories/users.repository.js';
import { inviteUserSchema, updateUserSchema } from '../schemas/users.schema.js';
import { uuidParam } from '../schemas/common.schema.js';
import { adminClient } from '../supabase.js';
import { BadRequestError } from '../lib/errors.js';

export async function userRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    requireRole('admin')(request);
    if (request.user.orgType === 'operator') return reply.send(await usersRepository.listAll());
    return reply.send(await usersRepository.listByOrg(request.user.orgId));
  });
  app.post('/invite', async (request, reply) => {
    requireRole('admin')(request);
    const body = inviteUserSchema.parse(request.body);
    const { data: authData, error } = await adminClient.auth.admin.createUser({
      email: body.email, email_confirm: false, user_metadata: { org_id: request.user.orgId, full_name: body.fullName },
    });
    if (error) throw new BadRequestError(error.message);
    await adminClient.from('core_user').insert({ id: authData.user.id, org_id: request.user.orgId, email: body.email, full_name: body.fullName, role: body.role });
    return reply.status(201).send({ userId: authData.user.id, email: body.email });
  });
  app.patch('/:id', async (request, reply) => {
    requireRole('admin')(request);
    const { id } = uuidParam.parse(request.params);
    const body = updateUserSchema.parse(request.body);
    const update: Record<string, any> = {};
    if (body.fullName) update.full_name = body.fullName;
    if (body.role) update.role = body.role;
    if (body.active !== undefined) update.active = body.active;
    return reply.send(await usersRepository.update(id, update));
  });
  app.delete('/:id', async (request, reply) => {
    requireRole('admin')(request);
    const { id } = uuidParam.parse(request.params);
    await usersRepository.deactivate(id);
    return reply.status(204).send();
  });
}
