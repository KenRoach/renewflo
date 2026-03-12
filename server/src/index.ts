import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from './config.js';
import authPlugin from './plugins/auth.js';
import { errorHandler } from './plugins/error-handler.js';
import { authRoutes } from './routes/auth.routes.js';
import { assetRoutes } from './routes/assets.routes.js';
import { quoteRoutes } from './routes/quotes.routes.js';
import { priceListRoutes } from './routes/price-lists.routes.js';
import { orderRoutes } from './routes/orders.routes.js';
import { supportRoutes } from './routes/support.routes.js';
import { notificationRoutes } from './routes/notifications.routes.js';
import { orgRoutes } from './routes/orgs.routes.js';
import { userRoutes } from './routes/users.routes.js';
import { chatRoutes } from './routes/chat.routes.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
await app.register(errorHandler);
await app.register(authPlugin);

await app.register(
  async (api) => {
    await api.register(authRoutes, { prefix: '/auth' });
    await api.register(assetRoutes, { prefix: '/assets' });
    await api.register(quoteRoutes, { prefix: '/quotes' });
    await api.register(priceListRoutes, { prefix: '/price-lists' });
    await api.register(orderRoutes, { prefix: '/orders' });
    await api.register(supportRoutes, { prefix: '/support' });
    await api.register(notificationRoutes, { prefix: '/notifications' });
    await api.register(orgRoutes, { prefix: '/orgs' });
    await api.register(userRoutes, { prefix: '/users' });
    await api.register(chatRoutes, { prefix: '/chat' });
  },
  { prefix: '/api/v1' }
);

app.get('/health', async () => ({ status: 'ok' }));

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
