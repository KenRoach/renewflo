import { FastifyInstance } from 'fastify';
import { signupSchema, loginSchema, forgotPasswordSchema } from '../schemas/auth.schema.js';
import { authService } from '../services/auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/signup', async (request, reply) => {
    const body = signupSchema.parse(request.body);
    return reply.status(201).send(await authService.signup(body));
  });
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    return reply.send(await authService.login(body));
  });
  app.post('/forgot-password', async (request, reply) => {
    const body = forgotPasswordSchema.parse(request.body);
    return reply.send(await authService.forgotPassword(body.email));
  });
}
