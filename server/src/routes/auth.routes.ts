import { FastifyInstance } from 'fastify';
import { signupSchema, loginSchema, forgotPasswordSchema } from '../schemas/auth.schema.js';
import { authService } from '../services/auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  const authRateLimit = { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } };

  app.post('/signup', { ...authRateLimit }, async (request, reply) => {
    const body = signupSchema.parse(request.body);
    return reply.status(201).send(await authService.signup(body));
  });
  app.post('/login', { ...authRateLimit }, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    return reply.send(await authService.login(body));
  });
  app.post('/forgot-password', { ...authRateLimit }, async (request, reply) => {
    const body = forgotPasswordSchema.parse(request.body);
    return reply.send(await authService.forgotPassword(body.email));
  });
}
