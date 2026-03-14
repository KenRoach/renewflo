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
  app.patch('/reset-password', { ...authRateLimit }, async (request, reply) => {
    const { password } = request.body as { password: string };
    if (!password || password.length < 8) {
      return reply.status(400).send({ code: 'VALIDATION', message: 'Password must be at least 8 characters' });
    }
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Missing authorization header' });
    }
    const token = authHeader.slice(7);
    return reply.send(await authService.resetPassword(token, password));
  });
}
