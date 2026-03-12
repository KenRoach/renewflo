import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { adminClient } from '../supabase.js';
import { ForbiddenError } from '../lib/errors.js';

export interface AuthUser {
  id: string;
  orgId: string;
  orgType: string;
  role: string;
  email: string;
  accessToken: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    const publicPaths = ['/api/v1/auth/signup', '/api/v1/auth/login', '/api/v1/auth/forgot-password', '/health'];
    if (publicPaths.some((p) => request.url.startsWith(p))) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ForbiddenError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (error || !user) {
      throw new ForbiddenError('Invalid or expired token');
    }

    const { data: profile } = await adminClient
      .from('core_user')
      .select('org_id, role, core_organization!inner(type)')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new ForbiddenError('User profile not found');
    }

    request.user = {
      id: user.id,
      orgId: profile.org_id,
      orgType: (profile as any).core_organization.type,
      role: profile.role,
      email: user.email!,
      accessToken: token,
    };
  });
}

export default fp(authPlugin);
