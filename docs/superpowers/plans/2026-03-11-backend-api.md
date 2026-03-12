# RenewFlow Backend API Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Fastify + TypeScript API service for RenewFlow, hosted on Railway, using Supabase for database access with RLS.

**Architecture:** Route (validation + auth) → Service (business logic) → Repository (Supabase client)

**Tech Stack:** Fastify, TypeScript, Node.js 20+, Zod, Supabase JS client, SheetJS (xlsx)

---

## File Structure

```
server/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                        # Fastify entry point
│   ├── config.ts                       # Environment config
│   ├── supabase.ts                     # Supabase client factory
│   ├── plugins/
│   │   ├── auth.ts                     # JWT auth plugin
│   │   └── error-handler.ts           # Global error handling
│   ├── lib/
│   │   ├── pagination.ts              # Cursor-based pagination
│   │   ├── errors.ts                  # Custom error classes
│   │   └── role-guard.ts             # Role-based access control
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── assets.routes.ts
│   │   ├── quotes.routes.ts
│   │   ├── price-lists.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── support.routes.ts
│   │   ├── notifications.routes.ts
│   │   ├── orgs.routes.ts
│   │   ├── users.routes.ts
│   │   └── chat.routes.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── assets.service.ts
│   │   ├── quotes.service.ts
│   │   ├── price-lists.service.ts
│   │   ├── orders.service.ts
│   │   ├── support.service.ts
│   │   ├── notifications.service.ts
│   │   ├── orgs.service.ts
│   │   ├── users.service.ts
│   │   └── chat.service.ts
│   ├── repositories/
│   │   ├── base.repository.ts
│   │   ├── assets.repository.ts
│   │   ├── quotes.repository.ts
│   │   ├── price-lists.repository.ts
│   │   ├── orders.repository.ts
│   │   ├── support.repository.ts
│   │   ├── notifications.repository.ts
│   │   ├── orgs.repository.ts
│   │   └── users.repository.ts
│   └── schemas/                        # Zod validation schemas
│       ├── auth.schema.ts
│       ├── assets.schema.ts
│       ├── quotes.schema.ts
│       ├── price-lists.schema.ts
│       ├── orders.schema.ts
│       ├── support.schema.ts
│       ├── notifications.schema.ts
│       ├── orgs.schema.ts
│       ├── users.schema.ts
│       └── common.schema.ts
└── tests/
    ├── unit/
    │   ├── quotes.service.test.ts
    │   ├── orders.service.test.ts
    │   └── assets.service.test.ts
    └── integration/
        ├── quote-lifecycle.test.ts
        └── order-lifecycle.test.ts
```

---

## Chunk 1: Project Setup & Core Infrastructure (Tasks 1–7)

### Task 1: Initialize Fastify project

**Files:** Create `server/package.json`, `server/tsconfig.json`, `server/.env.example`

- [ ] **Step 1: Create package.json**

```json
// server/package.json
{
  "name": "renewflo-api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "fastify": "^5.2.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/multipart": "^9.0.0",
    "zod": "^3.23.0",
    "xlsx": "^0.18.5",
    "anthropic": "^0.39.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
// server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create .env.example**

```env
# server/.env.example
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### Task 2: Config & Supabase client

**Files:** Create `server/src/config.ts`, `server/src/supabase.ts`

- [ ] **Step 1: Write config.ts**

```typescript
// server/src/config.ts
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
```

- [ ] **Step 2: Write supabase.ts**

```typescript
// server/src/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Anon client — respects RLS, used with user JWT
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// Service role client — bypasses RLS, for cross-org operator queries
export const adminClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY
);
```

### Task 3: Error classes

**Files:** Create `server/src/lib/errors.ts`

- [ ] **Step 1: Write error classes**

```typescript
// server/src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, id ? `${resource} ${id} not found` : `${resource} not found`, 'NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, 'BAD_REQUEST');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string, entity: string) {
    super(409, `Cannot transition ${entity} from '${from}' to '${to}'`, 'INVALID_TRANSITION');
  }
}
```

### Task 4: Error handler plugin

**Files:** Create `server/src/plugins/error-handler.ts`

- [ ] **Step 1: Write error handler**

```typescript
// server/src/plugins/error-handler.ts
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: Error, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });
}
```

### Task 5: Auth plugin (JWT extraction)

**Files:** Create `server/src/plugins/auth.ts`

- [ ] **Step 1: Write auth plugin**

```typescript
// server/src/plugins/auth.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { adminClient } from '../supabase.js';
import { ForbiddenError } from '../lib/errors.js';

export interface AuthUser {
  id: string;        // auth.users.id
  orgId: string;     // org_id from core_user
  orgType: string;   // 'var' | 'operator' | 'delivery_partner'
  role: string;      // 'admin' | 'member' | 'viewer'
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

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for public routes
    const publicPaths = ['/api/v1/auth/signup', '/api/v1/auth/login', '/api/v1/auth/forgot-password'];
    if (publicPaths.some((p) => request.url.startsWith(p))) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ForbiddenError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    // Verify JWT with Supabase
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (error || !user) {
      throw new ForbiddenError('Invalid or expired token');
    }

    // Fetch user profile with org info
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
```

### Task 6: Role guard & pagination utilities

**Files:** Create `server/src/lib/role-guard.ts`, `server/src/lib/pagination.ts`

- [ ] **Step 1: Write role guard**

```typescript
// server/src/lib/role-guard.ts
import { FastifyRequest } from 'fastify';
import { ForbiddenError } from './errors.js';

type OrgType = 'var' | 'operator' | 'delivery_partner';
type Role = 'admin' | 'member' | 'viewer';

export function requireOrgType(...allowed: OrgType[]) {
  return (request: FastifyRequest) => {
    if (!allowed.includes(request.user.orgType as OrgType)) {
      throw new ForbiddenError(`Access denied for org type '${request.user.orgType}'`);
    }
  };
}

export function requireRole(...allowed: Role[]) {
  return (request: FastifyRequest) => {
    if (!allowed.includes(request.user.role as Role)) {
      throw new ForbiddenError(`Access denied for role '${request.user.role}'`);
    }
  };
}
```

- [ ] **Step 2: Write pagination utility**

```typescript
// server/src/lib/pagination.ts
import { z } from 'zod';
import { SupabaseClient, PostgrestFilterBuilder } from '@supabase/supabase-js';

export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function paginate<T extends { id: string; created_at: string }>(
  query: PostgrestFilterBuilder<any, any, T[]>,
  params: PaginationParams
): Promise<PaginatedResult<T>> {
  const { cursor, limit, order } = params;

  let q = query.order('created_at', { ascending: order === 'asc' });

  if (cursor) {
    // Fetch the cursor row's created_at to use for range query
    q = order === 'desc'
      ? q.lt('id', cursor)
      : q.gt('id', cursor);
  }

  const { data, error } = await q.limit(limit + 1);
  if (error) throw error;

  const items = data ?? [];
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;

  return {
    data: page as T[],
    nextCursor: hasMore ? page[page.length - 1].id : null,
    hasMore,
  };
}
```

### Task 7: Fastify entry point

**Files:** Create `server/src/index.ts`

- [ ] **Step 1: Write entry point**

```typescript
// server/src/index.ts
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

// Plugins
await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
await app.register(errorHandler);
await app.register(authPlugin);

// Routes — all under /api/v1
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

// Health check
app.get('/health', async () => ({ status: 'ok' }));

// Start
const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

- [ ] **Step 2: Install dependencies & verify build**

```bash
cd server && npm install && npm run type-check
```

- [ ] **Step 3: Commit Chunk 1**

```bash
git add server/
git commit -m "feat(api): scaffold Fastify project with auth, error handling, pagination"
```

---

## Chunk 2: Auth Routes (Tasks 8–10)

### Task 8: Auth schemas

**Files:** Create `server/src/schemas/auth.schema.ts`

- [ ] **Step 1: Write Zod schemas**

```typescript
// server/src/schemas/auth.schema.ts
import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  orgName: z.string().min(1),
  orgType: z.enum(['var', 'delivery_partner']),
  country: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

### Task 9: Auth service

**Files:** Create `server/src/services/auth.service.ts`

- [ ] **Step 1: Write auth service**

```typescript
// server/src/services/auth.service.ts
import { adminClient } from '../supabase.js';
import { BadRequestError } from '../lib/errors.js';
import type { SignupInput, LoginInput } from '../schemas/auth.schema.js';

export const authService = {
  async signup(input: SignupInput) {
    // 1. Create org
    const { data: org, error: orgError } = await adminClient
      .from('core_organization')
      .insert({
        name: input.orgName,
        type: input.orgType,
        country: input.country ?? null,
      })
      .select()
      .single();

    if (orgError) throw new BadRequestError(`Failed to create organization: ${orgError.message}`);

    // 2. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { org_id: org.id, full_name: input.fullName },
    });

    if (authError) {
      // Rollback org creation
      await adminClient.from('core_organization').delete().eq('id', org.id);
      throw new BadRequestError(`Failed to create user: ${authError.message}`);
    }

    // 3. Create core_user profile
    const { error: profileError } = await adminClient
      .from('core_user')
      .insert({
        id: authData.user.id,
        org_id: org.id,
        email: input.email,
        full_name: input.fullName,
        role: 'admin', // First user in org is admin
      });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from('core_organization').delete().eq('id', org.id);
      throw new BadRequestError(`Failed to create profile: ${profileError.message}`);
    }

    // 4. Sign in to get session
    const { data: session, error: signInError } = await adminClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (signInError) throw new BadRequestError('Account created but login failed');

    return {
      user: { id: authData.user.id, email: input.email, fullName: input.fullName },
      org: { id: org.id, name: org.name, type: org.type },
      session: {
        accessToken: session.session!.access_token,
        refreshToken: session.session!.refresh_token,
      },
    };
  },

  async login(input: LoginInput) {
    const { data, error } = await adminClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) throw new BadRequestError('Invalid email or password');

    const { data: profile } = await adminClient
      .from('core_user')
      .select('org_id, role, full_name, core_organization!inner(name, type)')
      .eq('id', data.user.id)
      .single();

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        fullName: profile?.full_name,
        role: profile?.role,
      },
      org: {
        id: profile?.org_id,
        name: (profile as any)?.core_organization?.name,
        type: (profile as any)?.core_organization?.type,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    };
  },

  async forgotPassword(email: string) {
    const { error } = await adminClient.auth.resetPasswordForEmail(email);
    if (error) throw new BadRequestError(error.message);
    return { message: 'Password reset email sent' };
  },
};
```

### Task 10: Auth routes

**Files:** Create `server/src/routes/auth.routes.ts`

- [ ] **Step 1: Write auth routes**

```typescript
// server/src/routes/auth.routes.ts
import { FastifyInstance } from 'fastify';
import { signupSchema, loginSchema, forgotPasswordSchema } from '../schemas/auth.schema.js';
import { authService } from '../services/auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/signup', async (request, reply) => {
    const body = signupSchema.parse(request.body);
    const result = await authService.signup(body);
    return reply.status(201).send(result);
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body);
    return reply.send(result);
  });

  app.post('/forgot-password', async (request, reply) => {
    const body = forgotPasswordSchema.parse(request.body);
    const result = await authService.forgotPassword(body.email);
    return reply.send(result);
  });
}
```

- [ ] **Step 2: Commit Chunk 2**

```bash
git add server/src/schemas/auth.schema.ts server/src/services/auth.service.ts server/src/routes/auth.routes.ts
git commit -m "feat(api): add auth routes (signup, login, forgot-password)"
```

---

## Chunk 3: Asset Routes (Tasks 11–15)

### Task 11: Common schemas

**Files:** Create `server/src/schemas/common.schema.ts`

- [ ] **Step 1: Write common schemas**

```typescript
// server/src/schemas/common.schema.ts
import { z } from 'zod';

export const uuidParam = z.object({
  id: z.string().uuid(),
});

export const paginationQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  order: z.enum(['asc', 'desc']).default('desc'),
});
```

### Task 12: Asset schemas

**Files:** Create `server/src/schemas/assets.schema.ts`

- [ ] **Step 1: Write asset schemas**

```typescript
// server/src/schemas/assets.schema.ts
import { z } from 'zod';

export const assetTier = z.enum(['critical', 'standard', 'low-use', 'eol']);

export const assetStatus = z.enum([
  'discovered', 'alerted-90', 'alerted-60', 'alerted-30', 'alerted-14', 'alerted-7',
  'quoted', 'tpm-approved', 'oem-approved', 'fulfilled', 'lost', 'lapsed',
]);

export const listAssetsQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: assetStatus.optional(),
  tier: assetTier.optional(),
  brand: z.string().optional(),
  search: z.string().optional(),
});

export const updateAssetSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  device_type: z.string().optional(),
  tier: assetTier.optional(),
  warranty_end: z.string().date().optional(),
  purchase_date: z.string().date().optional(),
  status: assetStatus.optional(),
});

export type ListAssetsQuery = z.infer<typeof listAssetsQuery>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
```

### Task 13: Asset repository

**Files:** Create `server/src/repositories/assets.repository.ts`

- [ ] **Step 1: Write asset repository**

```typescript
// server/src/repositories/assets.repository.ts
import { SupabaseClient } from '@supabase/supabase-js';
import type { ListAssetsQuery, UpdateAssetInput } from '../schemas/assets.schema.js';
import type { PaginatedResult } from '../lib/pagination.js';

export const assetsRepository = {
  async list(client: SupabaseClient, params: ListAssetsQuery): Promise<PaginatedResult<any>> {
    let query = client.from('asset_item').select('*');

    if (params.status) query = query.eq('status', params.status);
    if (params.tier) query = query.eq('tier', params.tier);
    if (params.brand) query = query.ilike('brand', `%${params.brand}%`);
    if (params.search) {
      query = query.or(`serial.ilike.%${params.search}%,model.ilike.%${params.search}%`);
    }

    query = query.order('created_at', { ascending: false });

    if (params.cursor) query = query.lt('id', params.cursor);

    const limit = params.limit ?? 50;
    const { data, error } = await query.limit(limit + 1);
    if (error) throw error;

    const items = data ?? [];
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;

    return {
      data: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore,
    };
  },

  async getById(client: SupabaseClient, id: string) {
    const { data, error } = await client
      .from('asset_item')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async update(client: SupabaseClient, id: string, input: UpdateAssetInput) {
    const { data, error } = await client
      .from('asset_item')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(client: SupabaseClient, id: string) {
    const { error } = await client.from('asset_item').delete().eq('id', id);
    if (error) throw error;
  },

  async bulkInsert(client: SupabaseClient, orgId: string, batchId: string, rows: any[]) {
    const records = rows.map((row) => ({
      org_id: orgId,
      import_batch_id: batchId,
      brand: row.brand,
      model: row.model,
      serial: row.serial,
      device_type: row.device_type ?? null,
      tier: row.tier ?? 'standard',
      warranty_end: row.warranty_end,
      purchase_date: row.purchase_date ?? null,
      status: 'discovered',
    }));

    const { data, error } = await client
      .from('asset_item')
      .upsert(records, { onConflict: 'org_id,serial', ignoreDuplicates: false })
      .select();

    if (error) throw error;
    return data;
  },

  async createBatch(client: SupabaseClient, orgId: string, userId: string, fileName: string) {
    const { data, error } = await client
      .from('asset_import_batch')
      .insert({ org_id: orgId, uploaded_by: userId, file_name: fileName, status: 'processing' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateBatch(client: SupabaseClient, batchId: string, update: Record<string, any>) {
    const { error } = await client
      .from('asset_import_batch')
      .update(update)
      .eq('id', batchId);
    if (error) throw error;
  },
};
```

### Task 14: Asset service

**Files:** Create `server/src/services/assets.service.ts`

- [ ] **Step 1: Write asset service**

```typescript
// server/src/services/assets.service.ts
import { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { assetsRepository } from '../repositories/assets.repository.js';
import { NotFoundError, BadRequestError } from '../lib/errors.js';
import type { ListAssetsQuery, UpdateAssetInput } from '../schemas/assets.schema.js';

function addDaysLeft(asset: any) {
  if (!asset) return asset;
  const warrantyEnd = new Date(asset.warranty_end);
  const now = new Date();
  const diffMs = warrantyEnd.getTime() - now.getTime();
  return { ...asset, daysLeft: Math.ceil(diffMs / (1000 * 60 * 60 * 24)) };
}

export const assetsService = {
  async list(client: SupabaseClient, params: ListAssetsQuery) {
    const result = await assetsRepository.list(client, params);
    return {
      ...result,
      data: result.data.map(addDaysLeft),
    };
  },

  async getById(client: SupabaseClient, id: string) {
    const asset = await assetsRepository.getById(client, id);
    if (!asset) throw new NotFoundError('Asset', id);
    return addDaysLeft(asset);
  },

  async update(client: SupabaseClient, id: string, input: UpdateAssetInput) {
    const existing = await assetsRepository.getById(client, id);
    if (!existing) throw new NotFoundError('Asset', id);
    return addDaysLeft(await assetsRepository.update(client, id, input));
  },

  async remove(client: SupabaseClient, id: string) {
    const existing = await assetsRepository.getById(client, id);
    if (!existing) throw new NotFoundError('Asset', id);
    await assetsRepository.remove(client, id);
  },

  async importCsv(client: SupabaseClient, orgId: string, userId: string, fileName: string, buffer: Buffer) {
    const batch = await assetsRepository.createBatch(client, orgId, userId, fileName);

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) throw new BadRequestError('CSV file is empty');

      // Validate required fields
      const errors: string[] = [];
      const validRows = rows.map((row, i) => {
        if (!row.brand) errors.push(`Row ${i + 1}: missing brand`);
        if (!row.model) errors.push(`Row ${i + 1}: missing model`);
        if (!row.serial) errors.push(`Row ${i + 1}: missing serial`);
        if (!row.warranty_end) errors.push(`Row ${i + 1}: missing warranty_end`);
        return row;
      });

      if (errors.length > 0) {
        await assetsRepository.updateBatch(client, batch.id, {
          status: 'failed',
          row_count: rows.length,
          error_summary: { errors: errors.slice(0, 50) },
        });
        throw new BadRequestError(`Validation failed: ${errors.length} error(s). First: ${errors[0]}`);
      }

      const inserted = await assetsRepository.bulkInsert(client, orgId, batch.id, validRows);

      await assetsRepository.updateBatch(client, batch.id, {
        status: 'completed',
        row_count: inserted?.length ?? rows.length,
      });

      return { batchId: batch.id, imported: inserted?.length ?? rows.length, total: rows.length };
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
      await assetsRepository.updateBatch(client, batch.id, {
        status: 'failed',
        error_summary: { error: (err as Error).message },
      });
      throw err;
    }
  },
};
```

### Task 15: Asset routes

**Files:** Create `server/src/routes/assets.routes.ts`

- [ ] **Step 1: Write asset routes**

```typescript
// server/src/routes/assets.routes.ts
import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { requireOrgType } from '../lib/role-guard.js';
import { assetsService } from '../services/assets.service.js';
import { listAssetsQuery, updateAssetSchema } from '../schemas/assets.schema.js';
import { uuidParam } from '../schemas/common.schema.js';

export async function assetRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const client = createUserClient(request.user.accessToken);
    const params = listAssetsQuery.parse(request.query);
    const result = await assetsService.list(client, params);
    return reply.send(result);
  });

  app.get('/:id', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    const asset = await assetsService.getById(client, id);
    return reply.send(asset);
  });

  app.patch('/:id', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const { id } = uuidParam.parse(request.params);
    const body = updateAssetSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    const asset = await assetsService.update(client, id, body);
    return reply.send(asset);
  });

  app.delete('/:id', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    await assetsService.remove(client, id);
    return reply.status(204).send();
  });

  app.post('/import', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const file = await request.file();
    if (!file) return reply.status(400).send({ error: 'No file uploaded' });

    const buffer = await file.toBuffer();
    const client = createUserClient(request.user.accessToken);
    const result = await assetsService.importCsv(
      client,
      request.user.orgId,
      request.user.id,
      file.filename,
      buffer
    );
    return reply.status(201).send(result);
  });
}
```

- [ ] **Step 2: Commit Chunk 3**

```bash
git add server/src/schemas/ server/src/repositories/assets.repository.ts \
  server/src/services/assets.service.ts server/src/routes/assets.routes.ts
git commit -m "feat(api): add asset CRUD + CSV import endpoints"
```

---

## Chunk 4: Quote Routes (Tasks 16–20)

### Task 16: Quote schemas

**Files:** Create `server/src/schemas/quotes.schema.ts`

- [ ] **Step 1: Write quote schemas**

```typescript
// server/src/schemas/quotes.schema.ts
import { z } from 'zod';

export const quoteStatus = z.enum([
  'draft', 'pending', 'pricing', 'rfq_pending', 'priced',
  'accepted', 'requote', 'expired', 'rejected',
]);

export const createQuoteSchema = z.object({
  lineItems: z.array(z.object({
    assetId: z.string().uuid(),
    coverageType: z.enum(['tpm', 'oem']),
    durationMonths: z.number().int().min(1),
    quantity: z.number().int().min(1).default(1),
  })).min(1),
});

export const listQuotesQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: quoteStatus.optional(),
});

export const rfqRespondSchema = z.object({
  lineItems: z.array(z.object({
    lineItemId: z.string().uuid(),
    unitPrice: z.number().positive(),
  })),
  notes: z.string().optional(),
});

export const rfqSendSchema = z.object({
  partnerIds: z.array(z.string().uuid()).min(1),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type RfqRespondInput = z.infer<typeof rfqRespondSchema>;
```

### Task 17: Quote repository

**Files:** Create `server/src/repositories/quotes.repository.ts`

- [ ] **Step 1: Write quote repository**

```typescript
// server/src/repositories/quotes.repository.ts
import { SupabaseClient } from '@supabase/supabase-js';

export const quotesRepository = {
  async create(client: SupabaseClient, orgId: string, userId: string) {
    const { data, error } = await client
      .from('quote_request')
      .insert({ org_id: orgId, requested_by: userId, status: 'draft', version: 1 })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getById(client: SupabaseClient, id: string) {
    const { data, error } = await client
      .from('quote_request')
      .select('*, quote_line_item(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async list(client: SupabaseClient, params: { cursor?: string; limit: number; status?: string }) {
    let query = client.from('quote_request').select('*');
    if (params.status) query = query.eq('status', params.status);
    query = query.order('created_at', { ascending: false });
    if (params.cursor) query = query.lt('id', params.cursor);

    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;

    const items = data ?? [];
    const hasMore = items.length > params.limit;
    const page = hasMore ? items.slice(0, params.limit) : items;

    return {
      data: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore,
    };
  },

  async updateStatus(client: SupabaseClient, id: string, status: string, extra?: Record<string, any>) {
    const { data, error } = await client
      .from('quote_request')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addLineItems(client: SupabaseClient, quoteId: string, orgId: string, version: number, items: any[]) {
    const records = items.map((item) => ({
      quote_id: quoteId,
      org_id: orgId,
      asset_id: item.assetId,
      coverage_type: item.coverageType,
      duration_months: item.durationMonths,
      quantity: item.quantity ?? 1,
      source: 'rfq',
      version,
    }));

    const { data, error } = await client
      .from('quote_line_item')
      .insert(records)
      .select();
    if (error) throw error;
    return data;
  },

  async createRfq(client: SupabaseClient, quoteId: string, partnerId: string) {
    const { data, error } = await client
      .from('quote_rfq')
      .insert({
        quote_id: quoteId,
        partner_id: partnerId,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRfq(client: SupabaseClient, rfqId: string, update: Record<string, any>) {
    const { data, error } = await client
      .from('quote_rfq')
      .update(update)
      .eq('id', rfqId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getRfqByQuoteAndPartner(client: SupabaseClient, quoteId: string, partnerId: string) {
    const { data, error } = await client
      .from('quote_rfq')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('partner_id', partnerId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateLineItemPricing(client: SupabaseClient, lineItemId: string, unitPrice: number, partnerId: string) {
    const { error } = await client
      .from('quote_line_item')
      .update({ unit_price: unitPrice, partner_id: partnerId, source: 'rfq', updated_at: new Date().toISOString() })
      .eq('id', lineItemId);
    if (error) throw error;
  },

  async incrementVersion(client: SupabaseClient, id: string, currentVersion: number) {
    const { data, error } = await client
      .from('quote_request')
      .update({
        version: currentVersion + 1,
        status: 'pricing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
```

### Task 18: Quote service (status machine)

**Files:** Create `server/src/services/quotes.service.ts`

- [ ] **Step 1: Write quote service with status transitions**

```typescript
// server/src/services/quotes.service.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { quotesRepository } from '../repositories/quotes.repository.js';
import { NotFoundError, InvalidTransitionError, ForbiddenError } from '../lib/errors.js';
import { adminClient } from '../supabase.js';
import type { CreateQuoteInput, RfqRespondInput } from '../schemas/quotes.schema.js';

// Valid status transitions for quote_request
const QUOTE_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending'],
  pending: ['pricing'],
  pricing: ['rfq_pending', 'priced'],
  rfq_pending: ['priced'],
  priced: ['accepted', 'requote', 'rejected'],
  requote: ['pricing'],
  // Terminal: accepted, expired, rejected
};

function assertTransition(from: string, to: string) {
  const allowed = QUOTE_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError(from, to, 'quote');
  }
}

async function auditStatusChange(userId: string, recordId: string, oldStatus: string, newStatus: string) {
  await adminClient.from('audit_status_change').insert({
    table_name: 'quote_request',
    record_id: recordId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: userId,
  });
}

export const quotesService = {
  async create(client: SupabaseClient, orgId: string, userId: string, input: CreateQuoteInput) {
    const quote = await quotesRepository.create(client, orgId, userId);
    await quotesRepository.addLineItems(client, quote.id, orgId, 1, input.lineItems);

    // Mark included assets as 'quoted'
    for (const item of input.lineItems) {
      await client
        .from('asset_item')
        .update({ status: 'quoted', updated_at: new Date().toISOString() })
        .eq('id', item.assetId);
    }

    return quotesRepository.getById(client, quote.id);
  },

  async list(client: SupabaseClient, params: { cursor?: string; limit: number; status?: string }) {
    return quotesRepository.list(client, params);
  },

  async getById(client: SupabaseClient, id: string) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    return quote;
  },

  async submit(client: SupabaseClient, id: string, userId: string) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    assertTransition(quote.status, 'pending');
    await auditStatusChange(userId, id, quote.status, 'pending');
    return quotesRepository.updateStatus(client, id, 'pending');
  },

  async requote(client: SupabaseClient, id: string, userId: string) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    assertTransition(quote.status, 'requote');
    await auditStatusChange(userId, id, quote.status, 'requote');
    // Requote transitions to pricing with version++
    return quotesRepository.incrementVersion(client, id, quote.version);
  },

  async accept(client: SupabaseClient, id: string, userId: string) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    assertTransition(quote.status, 'accepted');
    await auditStatusChange(userId, id, quote.status, 'accepted');

    // Update asset statuses based on coverage_type
    if (quote.quote_line_item) {
      for (const li of quote.quote_line_item) {
        const newStatus = li.coverage_type === 'oem' ? 'oem-approved' : 'tpm-approved';
        await client
          .from('asset_item')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', li.asset_id);
      }
    }

    return quotesRepository.updateStatus(client, id, 'accepted');
  },

  async reject(client: SupabaseClient, id: string, userId: string) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);
    assertTransition(quote.status, 'rejected');
    await auditStatusChange(userId, id, quote.status, 'rejected');
    return quotesRepository.updateStatus(client, id, 'rejected');
  },

  async sendRfq(client: SupabaseClient, id: string, userId: string, partnerIds: string[]) {
    const quote = await quotesRepository.getById(client, id);
    if (!quote) throw new NotFoundError('Quote', id);

    // Move to pricing first if pending
    if (quote.status === 'pending') {
      assertTransition(quote.status, 'pricing');
      await quotesRepository.updateStatus(client, id, 'pricing');
    }

    // Now move to rfq_pending
    assertTransition('pricing', 'rfq_pending');
    await auditStatusChange(userId, id, quote.status, 'rfq_pending');
    await quotesRepository.updateStatus(client, id, 'rfq_pending');

    // Create RFQ records for each partner
    const rfqs = [];
    for (const partnerId of partnerIds) {
      const rfq = await quotesRepository.createRfq(client, id, partnerId);
      rfqs.push(rfq);
    }

    return { quote: await quotesRepository.getById(client, id), rfqs };
  },

  async respondRfq(client: SupabaseClient, quoteId: string, partnerId: string, input: RfqRespondInput) {
    const rfq = await quotesRepository.getRfqByQuoteAndPartner(client, quoteId, partnerId);
    if (!rfq) throw new NotFoundError('RFQ');
    if (rfq.status !== 'sent') throw new ForbiddenError('RFQ already responded to or expired');

    // Update line item pricing
    for (const item of input.lineItems) {
      await quotesRepository.updateLineItemPricing(client, item.lineItemId, item.unitPrice, partnerId);
    }

    // Update RFQ status
    await quotesRepository.updateRfq(client, rfq.id, {
      status: 'responded',
      responded_at: new Date().toISOString(),
      notes: input.notes ?? null,
    });

    // Check if all RFQs for this quote have been responded
    const { data: allRfqs } = await client
      .from('quote_rfq')
      .select('status')
      .eq('quote_id', quoteId);

    const allResponded = allRfqs?.every((r) => r.status !== 'sent');
    if (allResponded) {
      const quote = await quotesRepository.getById(client, quoteId);
      if (quote?.status === 'rfq_pending') {
        await quotesRepository.updateStatus(client, quoteId, 'priced');
      }
    }

    return { success: true };
  },
};
```

### Task 19: Quote routes

**Files:** Create `server/src/routes/quotes.routes.ts`

- [ ] **Step 1: Write quote routes**

```typescript
// server/src/routes/quotes.routes.ts
import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { requireOrgType } from '../lib/role-guard.js';
import { quotesService } from '../services/quotes.service.js';
import { createQuoteSchema, listQuotesQuery, rfqSendSchema, rfqRespondSchema } from '../schemas/quotes.schema.js';
import { uuidParam } from '../schemas/common.schema.js';

export async function quoteRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    requireOrgType('var')(request);
    const body = createQuoteSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    const quote = await quotesService.create(client, request.user.orgId, request.user.id, body);
    return reply.status(201).send(quote);
  });

  app.get('/', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const params = listQuotesQuery.parse(request.query);
    const client = createUserClient(request.user.accessToken);
    const result = await quotesService.list(client, params);
    return reply.send(result);
  });

  app.get('/:id', async (request, reply) => {
    requireOrgType('var', 'operator', 'delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    const quote = await quotesService.getById(client, id);
    return reply.send(quote);
  });

  app.post('/:id/submit', async (request, reply) => {
    requireOrgType('var')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    const quote = await quotesService.submit(client, id, request.user.id);
    return reply.send(quote);
  });

  app.post('/:id/requote', async (request, reply) => {
    requireOrgType('var')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    const quote = await quotesService.requote(client, id, request.user.id);
    return reply.send(quote);
  });

  app.post('/:id/accept', async (request, reply) => {
    requireOrgType('var')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    const quote = await quotesService.accept(client, id, request.user.id);
    return reply.send(quote);
  });

  app.post('/:id/reject', async (request, reply) => {
    requireOrgType('var')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    const quote = await quotesService.reject(client, id, request.user.id);
    return reply.send(quote);
  });

  app.post('/:id/rfq/send', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const body = rfqSendSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    const result = await quotesService.sendRfq(client, id, request.user.id, body.partnerIds);
    return reply.send(result);
  });

  app.post('/:id/rfq/respond', async (request, reply) => {
    requireOrgType('delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    const body = rfqRespondSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    const result = await quotesService.respondRfq(client, id, request.user.orgId, body);
    return reply.send(result);
  });
}
```

- [ ] **Step 3: Commit Chunk 4**

```bash
git add server/src/schemas/quotes.schema.ts server/src/repositories/quotes.repository.ts \
  server/src/services/quotes.service.ts server/src/routes/quotes.routes.ts
git commit -m "feat(api): add quote lifecycle endpoints with RFQ flow"
```

---

## Chunk 5: Price List Routes (Tasks 20–22)

### Task 20: Price list schemas

**Files:** Create `server/src/schemas/price-lists.schema.ts`

- [ ] **Step 1: Write schemas**

```typescript
// server/src/schemas/price-lists.schema.ts
import { z } from 'zod';

export const createPriceListSchema = z.object({
  brand: z.string().min(1),
  modelPattern: z.string().min(1),
  coverageType: z.enum(['tpm', 'oem']),
  durationMonths: z.number().int().min(1),
  unitPrice: z.number().positive(),
  validFrom: z.string().date(),
  validUntil: z.string().date(),
});

export const updatePriceListSchema = createPriceListSchema.partial();

export const lookupSchema = z.object({
  assets: z.array(z.object({
    assetId: z.string().uuid(),
    brand: z.string(),
    model: z.string(),
    coverageType: z.enum(['tpm', 'oem']),
    durationMonths: z.number().int(),
  })),
});

export type CreatePriceListInput = z.infer<typeof createPriceListSchema>;
export type LookupInput = z.infer<typeof lookupSchema>;
```

### Task 21: Price list service & repository

**Files:** Create `server/src/repositories/price-lists.repository.ts`, `server/src/services/price-lists.service.ts`

- [ ] **Step 1: Write repository**

```typescript
// server/src/repositories/price-lists.repository.ts
import { SupabaseClient } from '@supabase/supabase-js';

export const priceListsRepository = {
  async list(client: SupabaseClient, params: { cursor?: string; limit: number }) {
    let query = client.from('quote_price_list').select('*').order('created_at', { ascending: false });
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return {
      data: hasMore ? items.slice(0, params.limit) : items,
      nextCursor: hasMore ? items[params.limit - 1].id : null,
      hasMore,
    };
  },

  async create(client: SupabaseClient, partnerId: string, input: any) {
    const { data, error } = await client
      .from('quote_price_list')
      .insert({
        partner_id: partnerId,
        brand: input.brand,
        model_pattern: input.modelPattern,
        coverage_type: input.coverageType,
        duration_months: input.durationMonths,
        unit_price: input.unitPrice,
        valid_from: input.validFrom,
        valid_until: input.validUntil,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(client: SupabaseClient, id: string, input: any) {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.brand) updateData.brand = input.brand;
    if (input.modelPattern) updateData.model_pattern = input.modelPattern;
    if (input.coverageType) updateData.coverage_type = input.coverageType;
    if (input.durationMonths) updateData.duration_months = input.durationMonths;
    if (input.unitPrice) updateData.unit_price = input.unitPrice;
    if (input.validFrom) updateData.valid_from = input.validFrom;
    if (input.validUntil) updateData.valid_until = input.validUntil;

    const { data, error } = await client
      .from('quote_price_list')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(client: SupabaseClient, id: string) {
    const { error } = await client.from('quote_price_list').delete().eq('id', id);
    if (error) throw error;
  },

  async lookup(client: SupabaseClient, brand: string, model: string, coverageType: string, durationMonths: number) {
    // Use SQL LIKE matching for model_pattern
    const { data, error } = await client
      .from('quote_price_list')
      .select('*')
      .eq('brand', brand)
      .eq('coverage_type', coverageType)
      .eq('duration_months', durationMonths)
      .lte('valid_from', new Date().toISOString().split('T')[0])
      .gte('valid_until', new Date().toISOString().split('T')[0]);

    if (error) throw error;

    // Filter by model_pattern (convert SQL wildcards to regex)
    return (data ?? []).filter((entry) => {
      const pattern = entry.model_pattern.replace(/%/g, '.*').replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`, 'i').test(model);
    });
  },
};
```

- [ ] **Step 2: Write service**

```typescript
// server/src/services/price-lists.service.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { priceListsRepository } from '../repositories/price-lists.repository.js';
import type { CreatePriceListInput, LookupInput } from '../schemas/price-lists.schema.js';

export const priceListsService = {
  async list(client: SupabaseClient, params: { cursor?: string; limit: number }) {
    return priceListsRepository.list(client, params);
  },

  async create(client: SupabaseClient, partnerId: string, input: CreatePriceListInput) {
    return priceListsRepository.create(client, partnerId, input);
  },

  async update(client: SupabaseClient, id: string, input: Partial<CreatePriceListInput>) {
    return priceListsRepository.update(client, id, input);
  },

  async remove(client: SupabaseClient, id: string) {
    return priceListsRepository.remove(client, id);
  },

  async lookup(client: SupabaseClient, input: LookupInput) {
    const results = [];
    for (const asset of input.assets) {
      const matches = await priceListsRepository.lookup(
        client, asset.brand, asset.model, asset.coverageType, asset.durationMonths
      );
      results.push({
        assetId: asset.assetId,
        matched: matches.length > 0,
        source: matches.length > 0 ? 'price_list' : 'rfq',
        bestPrice: matches.length > 0
          ? Math.min(...matches.map((m) => parseFloat(m.unit_price)))
          : null,
        partnerId: matches.length > 0 ? matches[0].partner_id : null,
        allMatches: matches,
      });
    }
    return results;
  },
};
```

### Task 22: Price list routes

**Files:** Create `server/src/routes/price-lists.routes.ts`

- [ ] **Step 1: Write routes**

```typescript
// server/src/routes/price-lists.routes.ts
import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { requireOrgType } from '../lib/role-guard.js';
import { priceListsService } from '../services/price-lists.service.js';
import { createPriceListSchema, updatePriceListSchema, lookupSchema } from '../schemas/price-lists.schema.js';
import { uuidParam, paginationQuery } from '../schemas/common.schema.js';

export async function priceListRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    requireOrgType('delivery_partner', 'operator')(request);
    const params = paginationQuery.parse(request.query);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await priceListsService.list(client, params));
  });

  app.post('/', async (request, reply) => {
    requireOrgType('delivery_partner')(request);
    const body = createPriceListSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    const entry = await priceListsService.create(client, request.user.orgId, body);
    return reply.status(201).send(entry);
  });

  app.patch('/:id', async (request, reply) => {
    requireOrgType('delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    const body = updatePriceListSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await priceListsService.update(client, id, body));
  });

  app.delete('/:id', async (request, reply) => {
    requireOrgType('delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    await priceListsService.remove(client, id);
    return reply.status(204).send();
  });

  app.post('/lookup', async (request, reply) => {
    requireOrgType('operator')(request);
    const body = lookupSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await priceListsService.lookup(client, body));
  });
}
```

- [ ] **Step 2: Commit Chunk 5**

```bash
git add server/src/schemas/price-lists.schema.ts server/src/repositories/price-lists.repository.ts \
  server/src/services/price-lists.service.ts server/src/routes/price-lists.routes.ts
git commit -m "feat(api): add price list CRUD + lookup endpoints"
```

---

## Chunk 6: Order Routes (Tasks 23–26)

### Task 23: Order schemas

**Files:** Create `server/src/schemas/orders.schema.ts`

- [ ] **Step 1: Write schemas**

```typescript
// server/src/schemas/orders.schema.ts
import { z } from 'zod';

export const orderStatus = z.enum([
  'submitted', 'under_review', 'approved', 'routed',
  'acknowledged', 'entitlement_verified', 'completed', 'cancelled',
]);

export const createOrderSchema = z.object({
  quoteId: z.string().uuid(),
});

export const listOrdersQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: orderStatus.optional(),
});

export const verifyEntitlementSchema = z.object({
  entitlements: z.array(z.object({
    assetId: z.string().uuid(),
    entitlementId: z.string().min(1),
    coverageStart: z.string().date(),
    coverageEnd: z.string().date(),
  })),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyEntitlementInput = z.infer<typeof verifyEntitlementSchema>;
```

### Task 24: Order repository

**Files:** Create `server/src/repositories/orders.repository.ts`

- [ ] **Step 1: Write repository**

```typescript
// server/src/repositories/orders.repository.ts
import { SupabaseClient } from '@supabase/supabase-js';

export const ordersRepository = {
  async create(client: SupabaseClient, data: Record<string, any>) {
    const { data: order, error } = await client
      .from('order_po')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return order;
  },

  async getById(client: SupabaseClient, id: string) {
    const { data, error } = await client
      .from('order_po')
      .select('*, order_line_item(*), order_entitlement(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async list(client: SupabaseClient, params: { cursor?: string; limit: number; status?: string }) {
    let query = client.from('order_po').select('*').order('created_at', { ascending: false });
    if (params.status) query = query.eq('status', params.status);
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return {
      data: hasMore ? items.slice(0, params.limit) : items,
      nextCursor: hasMore ? items[params.limit - 1].id : null,
      hasMore,
    };
  },

  async updateStatus(client: SupabaseClient, id: string, status: string, extra?: Record<string, any>) {
    const { data, error } = await client
      .from('order_po')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addLineItems(client: SupabaseClient, items: Record<string, any>[]) {
    const { data, error } = await client.from('order_line_item').insert(items).select();
    if (error) throw error;
    return data;
  },

  async addEntitlements(client: SupabaseClient, items: Record<string, any>[]) {
    const { data, error } = await client.from('order_entitlement').insert(items).select();
    if (error) throw error;
    return data;
  },
};
```

### Task 25: Order service (status machine)

**Files:** Create `server/src/services/orders.service.ts`

- [ ] **Step 1: Write order service**

```typescript
// server/src/services/orders.service.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { ordersRepository } from '../repositories/orders.repository.js';
import { quotesRepository } from '../repositories/quotes.repository.js';
import { NotFoundError, InvalidTransitionError, BadRequestError } from '../lib/errors.js';
import { adminClient } from '../supabase.js';
import type { CreateOrderInput, VerifyEntitlementInput } from '../schemas/orders.schema.js';

const ORDER_TRANSITIONS: Record<string, string[]> = {
  submitted: ['under_review', 'cancelled'],
  under_review: ['approved', 'cancelled'],
  approved: ['routed', 'cancelled'],
  routed: ['acknowledged', 'cancelled'],
  acknowledged: ['entitlement_verified', 'cancelled'],
  entitlement_verified: ['completed'],
  // Terminal: completed, cancelled
};

function assertOrderTransition(from: string, to: string) {
  const allowed = ORDER_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError(from, to, 'order');
  }
}

async function auditStatusChange(userId: string, recordId: string, oldStatus: string, newStatus: string) {
  await adminClient.from('audit_status_change').insert({
    table_name: 'order_po',
    record_id: recordId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: userId,
  });
}

export const ordersService = {
  async create(client: SupabaseClient, orgId: string, userId: string, input: CreateOrderInput) {
    // Get the accepted quote
    const quote = await quotesRepository.getById(client, input.quoteId);
    if (!quote) throw new NotFoundError('Quote', input.quoteId);
    if (quote.status !== 'accepted') throw new BadRequestError('Quote must be accepted to create PO');

    // Calculate total from line items
    const lineItems = quote.quote_line_item ?? [];
    const total = lineItems.reduce((sum: number, li: any) => {
      return sum + (parseFloat(li.unit_price ?? 0) * (li.quantity ?? 1));
    }, 0);

    // Determine partner (from first line item with partner_id)
    const partnerId = lineItems.find((li: any) => li.partner_id)?.partner_id;
    if (!partnerId) throw new BadRequestError('No delivery partner assigned to quote line items');

    const order = await ordersRepository.create(client, {
      org_id: orgId,
      quote_id: input.quoteId,
      submitted_by: userId,
      partner_id: partnerId,
      status: 'submitted',
      total,
    });

    // Copy line items to order
    const orderLineItems = lineItems.map((li: any) => ({
      po_id: order.id,
      org_id: orgId,
      partner_id: partnerId,
      asset_id: li.asset_id,
      coverage_type: li.coverage_type,
      duration_months: li.duration_months,
      unit_price: li.unit_price,
      quantity: li.quantity,
    }));

    await ordersRepository.addLineItems(client, orderLineItems);
    return ordersRepository.getById(client, order.id);
  },

  async list(client: SupabaseClient, params: { cursor?: string; limit: number; status?: string }) {
    return ordersRepository.list(client, params);
  },

  async getById(client: SupabaseClient, id: string) {
    const order = await ordersRepository.getById(client, id);
    if (!order) throw new NotFoundError('Order', id);
    return order;
  },

  async transition(client: SupabaseClient, id: string, userId: string, targetStatus: string, extra?: Record<string, any>) {
    const order = await ordersRepository.getById(client, id);
    if (!order) throw new NotFoundError('Order', id);
    assertOrderTransition(order.status, targetStatus);
    await auditStatusChange(userId, id, order.status, targetStatus);

    // On completion, update asset statuses to 'fulfilled'
    if (targetStatus === 'completed' && order.order_line_item) {
      for (const li of order.order_line_item) {
        await client
          .from('asset_item')
          .update({ status: 'fulfilled', updated_at: new Date().toISOString() })
          .eq('id', li.asset_id);
      }
    }

    return ordersRepository.updateStatus(client, id, targetStatus, extra);
  },

  async verifyEntitlement(client: SupabaseClient, orderId: string, userId: string, input: VerifyEntitlementInput) {
    const order = await ordersRepository.getById(client, orderId);
    if (!order) throw new NotFoundError('Order', orderId);

    const entitlements = input.entitlements.map((e) => ({
      po_id: orderId,
      org_id: order.org_id,
      partner_id: order.partner_id,
      asset_id: e.assetId,
      entitlement_id: e.entitlementId,
      coverage_start: e.coverageStart,
      coverage_end: e.coverageEnd,
      verified_by: userId,
      verified_at: new Date().toISOString(),
    }));

    await ordersRepository.addEntitlements(client, entitlements);
    return this.transition(client, orderId, userId, 'entitlement_verified');
  },
};
```

### Task 26: Order routes

**Files:** Create `server/src/routes/orders.routes.ts`

- [ ] **Step 1: Write routes**

```typescript
// server/src/routes/orders.routes.ts
import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { requireOrgType } from '../lib/role-guard.js';
import { ordersService } from '../services/orders.service.js';
import { createOrderSchema, listOrdersQuery, verifyEntitlementSchema } from '../schemas/orders.schema.js';
import { uuidParam } from '../schemas/common.schema.js';

export async function orderRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    requireOrgType('var')(request);
    const body = createOrderSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    const order = await ordersService.create(client, request.user.orgId, request.user.id, body);
    return reply.status(201).send(order);
  });

  app.get('/', async (request, reply) => {
    requireOrgType('var', 'operator', 'delivery_partner')(request);
    const params = listOrdersQuery.parse(request.query);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await ordersService.list(client, params));
  });

  app.get('/:id', async (request, reply) => {
    requireOrgType('var', 'operator', 'delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await ordersService.getById(client, id));
  });

  // Operator transitions
  app.post('/:id/review', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await ordersService.transition(client, id, request.user.id, 'under_review', {
      reviewed_by: request.user.id,
      reviewed_at: new Date().toISOString(),
    }));
  });

  app.post('/:id/approve', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await ordersService.transition(client, id, request.user.id, 'approved'));
  });

  app.post('/:id/route', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await ordersService.transition(client, id, request.user.id, 'routed', {
      routed_at: new Date().toISOString(),
    }));
  });

  // Partner transition
  app.post('/:id/acknowledge', async (request, reply) => {
    requireOrgType('delivery_partner')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await ordersService.transition(client, id, request.user.id, 'acknowledged'));
  });

  // Operator entitlement verification
  app.post('/:id/verify-entitlement', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const body = verifyEntitlementSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await ordersService.verifyEntitlement(client, id, request.user.id, body));
  });

  app.post('/:id/complete', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await ordersService.transition(client, id, request.user.id, 'completed'));
  });

  app.post('/:id/cancel', async (request, reply) => {
    requireOrgType('operator')(request);
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await ordersService.transition(client, id, request.user.id, 'cancelled'));
  });
}
```

- [ ] **Step 2: Commit Chunk 6**

```bash
git add server/src/schemas/orders.schema.ts server/src/repositories/orders.repository.ts \
  server/src/services/orders.service.ts server/src/routes/orders.routes.ts
git commit -m "feat(api): add order PO lifecycle endpoints with status machine"
```

---

## Chunk 7: Support, Notifications, Admin & Chat (Tasks 27–34)

### Task 27: Support schemas, service & routes

**Files:** Create `server/src/schemas/support.schema.ts`, `server/src/repositories/support.repository.ts`, `server/src/services/support.service.ts`, `server/src/routes/support.routes.ts`

- [ ] **Step 1: Write support schema**

```typescript
// server/src/schemas/support.schema.ts
import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().optional(),
  assetId: z.string().uuid().optional(),
  poId: z.string().uuid().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
});

export const updateTicketSchema = z.object({
  subject: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'escalated', 'resolved']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assignee: z.string().uuid().nullable().optional(),
});

export const listTicketsQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(['open', 'in_progress', 'escalated', 'resolved']).optional(),
});
```

- [ ] **Step 2: Write support repository**

```typescript
// server/src/repositories/support.repository.ts
import { SupabaseClient } from '@supabase/supabase-js';

export const supportRepository = {
  async list(client: SupabaseClient, params: { cursor?: string; limit: number; status?: string }) {
    let query = client.from('support_ticket').select('*').order('created_at', { ascending: false });
    if (params.status) query = query.eq('status', params.status);
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return { data: hasMore ? items.slice(0, params.limit) : items, nextCursor: hasMore ? items[params.limit - 1].id : null, hasMore };
  },

  async getById(client: SupabaseClient, id: string) {
    const { data, error } = await client.from('support_ticket').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create(client: SupabaseClient, data: Record<string, any>) {
    const { data: ticket, error } = await client.from('support_ticket').insert(data).select().single();
    if (error) throw error;
    return ticket;
  },

  async update(client: SupabaseClient, id: string, data: Record<string, any>) {
    const { data: ticket, error } = await client.from('support_ticket').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return ticket;
  },
};
```

- [ ] **Step 3: Write support routes**

```typescript
// server/src/routes/support.routes.ts
import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { supportRepository } from '../repositories/support.repository.js';
import { createTicketSchema, updateTicketSchema, listTicketsQuery } from '../schemas/support.schema.js';
import { uuidParam } from '../schemas/common.schema.js';
import { NotFoundError } from '../lib/errors.js';

export async function supportRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const params = listTicketsQuery.parse(request.query);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await supportRepository.list(client, params));
  });

  app.post('/', async (request, reply) => {
    const body = createTicketSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    const ticket = await supportRepository.create(client, {
      org_id: request.user.orgId,
      reported_by: request.user.id,
      subject: body.subject,
      description: body.description,
      asset_id: body.assetId ?? null,
      po_id: body.poId ?? null,
      priority: body.priority,
      status: 'open',
    });
    return reply.status(201).send(ticket);
  });

  app.get('/:id', async (request, reply) => {
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    const ticket = await supportRepository.getById(client, id);
    if (!ticket) throw new NotFoundError('Ticket', id);
    return reply.send(ticket);
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = uuidParam.parse(request.params);
    const body = updateTicketSchema.parse(request.body);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await supportRepository.update(client, id, body));
  });

  app.post('/:id/escalate', async (request, reply) => {
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await supportRepository.update(client, id, { status: 'escalated' }));
  });
}
```

### Task 28: Notification routes

**Files:** Create `server/src/schemas/notifications.schema.ts`, `server/src/repositories/notifications.repository.ts`, `server/src/routes/notifications.routes.ts`

- [ ] **Step 1: Write notification schemas & repository**

```typescript
// server/src/schemas/notifications.schema.ts
import { z } from 'zod';

export const listNotificationsQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unreadOnly: z.coerce.boolean().default(false),
});
```

```typescript
// server/src/repositories/notifications.repository.ts
import { SupabaseClient } from '@supabase/supabase-js';

export const notificationsRepository = {
  async list(client: SupabaseClient, params: { cursor?: string; limit: number; unreadOnly: boolean }) {
    let query = client.from('notif_alert').select('*').order('created_at', { ascending: false });
    if (params.unreadOnly) query = query.eq('read', false);
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return { data: hasMore ? items.slice(0, params.limit) : items, nextCursor: hasMore ? items[params.limit - 1].id : null, hasMore };
  },

  async markRead(client: SupabaseClient, id: string) {
    const { error } = await client.from('notif_alert').update({ read: true, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async markAllRead(client: SupabaseClient, orgId: string) {
    const { error } = await client.from('notif_alert').update({ read: true, updated_at: new Date().toISOString() }).eq('org_id', orgId).eq('read', false);
    if (error) throw error;
  },
};
```

- [ ] **Step 2: Write notification routes**

```typescript
// server/src/routes/notifications.routes.ts
import { FastifyInstance } from 'fastify';
import { createUserClient } from '../supabase.js';
import { notificationsRepository } from '../repositories/notifications.repository.js';
import { listNotificationsQuery } from '../schemas/notifications.schema.js';
import { uuidParam } from '../schemas/common.schema.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const params = listNotificationsQuery.parse(request.query);
    const client = createUserClient(request.user.accessToken);
    return reply.send(await notificationsRepository.list(client, params));
  });

  app.patch('/:id/read', async (request, reply) => {
    const { id } = uuidParam.parse(request.params);
    const client = createUserClient(request.user.accessToken);
    await notificationsRepository.markRead(client, id);
    return reply.send({ success: true });
  });

  app.post('/mark-all-read', async (request, reply) => {
    const client = createUserClient(request.user.accessToken);
    await notificationsRepository.markAllRead(client, request.user.orgId);
    return reply.send({ success: true });
  });
}
```

### Task 29: Org management routes (operator only)

**Files:** Create `server/src/schemas/orgs.schema.ts`, `server/src/repositories/orgs.repository.ts`, `server/src/routes/orgs.routes.ts`

- [ ] **Step 1: Write org schemas, repository & routes**

```typescript
// server/src/schemas/orgs.schema.ts
import { z } from 'zod';

export const updateOrgSchema = z.object({
  name: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  billing_email: z.string().email().optional(),
});
```

```typescript
// server/src/repositories/orgs.repository.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from '../supabase.js';

export const orgsRepository = {
  async list(params: { cursor?: string; limit: number }) {
    let query = adminClient.from('core_organization').select('*').order('created_at', { ascending: false });
    if (params.cursor) query = query.lt('id', params.cursor);
    const { data, error } = await query.limit(params.limit + 1);
    if (error) throw error;
    const items = data ?? [];
    const hasMore = items.length > params.limit;
    return { data: hasMore ? items.slice(0, params.limit) : items, nextCursor: hasMore ? items[params.limit - 1].id : null, hasMore };
  },

  async getById(id: string) {
    const { data, error } = await adminClient.from('core_organization').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async update(id: string, data: Record<string, any>) {
    const { data: org, error } = await adminClient.from('core_organization').update(data).eq('id', id).select().single();
    if (error) throw error;
    return org;
  },
};
```

```typescript
// server/src/routes/orgs.routes.ts
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
```

### Task 30: User management routes

**Files:** Create `server/src/schemas/users.schema.ts`, `server/src/repositories/users.repository.ts`, `server/src/routes/users.routes.ts`

- [ ] **Step 1: Write user schemas, repository & routes**

```typescript
// server/src/schemas/users.schema.ts
import { z } from 'zod';

export const inviteUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export const updateUserSchema = z.object({
  fullName: z.string().optional(),
  role: z.enum(['admin', 'member', 'viewer']).optional(),
  active: z.boolean().optional(),
});
```

```typescript
// server/src/repositories/users.repository.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from '../supabase.js';

export const usersRepository = {
  async listByOrg(orgId: string) {
    const { data, error } = await adminClient.from('core_user').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async listAll() {
    const { data, error } = await adminClient.from('core_user').select('*, core_organization(name, type)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async update(id: string, data: Record<string, any>) {
    const { data: user, error } = await adminClient.from('core_user').update(data).eq('id', id).select().single();
    if (error) throw error;
    return user;
  },

  async deactivate(id: string) {
    return usersRepository.update(id, { active: false });
  },
};
```

```typescript
// server/src/routes/users.routes.ts
import { FastifyInstance } from 'fastify';
import { requireRole, requireOrgType } from '../lib/role-guard.js';
import { usersRepository } from '../repositories/users.repository.js';
import { inviteUserSchema, updateUserSchema } from '../schemas/users.schema.js';
import { uuidParam } from '../schemas/common.schema.js';
import { adminClient } from '../supabase.js';
import { BadRequestError } from '../lib/errors.js';

export async function userRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    requireRole('admin')(request);
    if (request.user.orgType === 'operator') {
      return reply.send(await usersRepository.listAll());
    }
    return reply.send(await usersRepository.listByOrg(request.user.orgId));
  });

  app.post('/invite', async (request, reply) => {
    requireRole('admin')(request);
    const body = inviteUserSchema.parse(request.body);

    // Create auth user with invite
    const { data: authData, error } = await adminClient.auth.admin.createUser({
      email: body.email,
      email_confirm: false, // They'll need to confirm
      user_metadata: { org_id: request.user.orgId, full_name: body.fullName },
    });

    if (error) throw new BadRequestError(error.message);

    // Create core_user profile
    await adminClient.from('core_user').insert({
      id: authData.user.id,
      org_id: request.user.orgId,
      email: body.email,
      full_name: body.fullName,
      role: body.role,
    });

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
```

### Task 31: Chat proxy route

**Files:** Create `server/src/routes/chat.routes.ts`

- [ ] **Step 1: Write chat route**

```typescript
// server/src/routes/chat.routes.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Anthropic from 'anthropic';
import { config } from '../config.js';
import { requireOrgType } from '../lib/role-guard.js';

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  system: z.string().optional(),
});

export async function chatRoutes(app: FastifyInstance) {
  const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

  app.post('/message', async (request, reply) => {
    requireOrgType('var', 'operator')(request);
    const body = chatSchema.parse(request.body);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: body.system ?? 'You are a helpful warranty renewal assistant for IT resellers in Latin America.',
      messages: body.messages,
    });

    return reply.send({
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      usage: response.usage,
    });
  });
}
```

- [ ] **Step 2: Commit Chunk 7**

```bash
git add server/src/schemas/ server/src/repositories/ server/src/services/ server/src/routes/
git commit -m "feat(api): add support, notifications, org/user management, and chat proxy"
```

---

## Chunk 8: Tests (Tasks 32–34)

### Task 32: Quote service unit tests

**Files:** Create `server/tests/unit/quotes.service.test.ts`

- [ ] **Step 1: Write quote status machine tests**

```typescript
// server/tests/unit/quotes.service.test.ts
import { describe, it, expect } from 'vitest';

// Test the transition map directly
const QUOTE_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending'],
  pending: ['pricing'],
  pricing: ['rfq_pending', 'priced'],
  rfq_pending: ['priced'],
  priced: ['accepted', 'requote', 'rejected'],
  requote: ['pricing'],
};

function isValidTransition(from: string, to: string): boolean {
  const allowed = QUOTE_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

describe('Quote Status Machine', () => {
  it('allows draft → pending', () => {
    expect(isValidTransition('draft', 'pending')).toBe(true);
  });

  it('blocks draft → accepted (must go through pipeline)', () => {
    expect(isValidTransition('draft', 'accepted')).toBe(false);
  });

  it('allows full happy path: draft → pending → pricing → priced → accepted', () => {
    expect(isValidTransition('draft', 'pending')).toBe(true);
    expect(isValidTransition('pending', 'pricing')).toBe(true);
    expect(isValidTransition('pricing', 'priced')).toBe(true);
    expect(isValidTransition('priced', 'accepted')).toBe(true);
  });

  it('allows RFQ path: pricing → rfq_pending → priced', () => {
    expect(isValidTransition('pricing', 'rfq_pending')).toBe(true);
    expect(isValidTransition('rfq_pending', 'priced')).toBe(true);
  });

  it('allows requote: priced → requote → pricing', () => {
    expect(isValidTransition('priced', 'requote')).toBe(true);
    expect(isValidTransition('requote', 'pricing')).toBe(true);
  });

  it('allows rejection from priced', () => {
    expect(isValidTransition('priced', 'rejected')).toBe(true);
  });

  it('blocks transitions from terminal states', () => {
    expect(isValidTransition('accepted', 'draft')).toBe(false);
    expect(isValidTransition('rejected', 'pending')).toBe(false);
    expect(isValidTransition('expired', 'pricing')).toBe(false);
  });
});
```

### Task 33: Order service unit tests

**Files:** Create `server/tests/unit/orders.service.test.ts`

- [ ] **Step 1: Write order status machine tests**

```typescript
// server/tests/unit/orders.service.test.ts
import { describe, it, expect } from 'vitest';

const ORDER_TRANSITIONS: Record<string, string[]> = {
  submitted: ['under_review', 'cancelled'],
  under_review: ['approved', 'cancelled'],
  approved: ['routed', 'cancelled'],
  routed: ['acknowledged', 'cancelled'],
  acknowledged: ['entitlement_verified', 'cancelled'],
  entitlement_verified: ['completed'],
};

function isValidTransition(from: string, to: string): boolean {
  const allowed = ORDER_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

describe('Order Status Machine', () => {
  it('follows linear happy path', () => {
    const path = ['submitted', 'under_review', 'approved', 'routed', 'acknowledged', 'entitlement_verified', 'completed'];
    for (let i = 0; i < path.length - 1; i++) {
      expect(isValidTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it('allows cancellation from any pre-completed state', () => {
    const cancellable = ['submitted', 'under_review', 'approved', 'routed', 'acknowledged'];
    for (const status of cancellable) {
      expect(isValidTransition(status, 'cancelled')).toBe(true);
    }
  });

  it('blocks cancellation of completed orders', () => {
    expect(isValidTransition('completed', 'cancelled')).toBe(false);
  });

  it('blocks skipping steps', () => {
    expect(isValidTransition('submitted', 'approved')).toBe(false);
    expect(isValidTransition('submitted', 'routed')).toBe(false);
    expect(isValidTransition('approved', 'acknowledged')).toBe(false);
  });

  it('blocks backward transitions', () => {
    expect(isValidTransition('approved', 'under_review')).toBe(false);
    expect(isValidTransition('completed', 'submitted')).toBe(false);
  });
});
```

### Task 34: Final verification

- [ ] **Step 1: Run type check**

```bash
cd server && npm run type-check
```

- [ ] **Step 2: Run tests**

```bash
cd server && npm test
```

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "test(api): add unit tests for quote and order status machines"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | 1–7 | Project scaffold, auth plugin, error handling, pagination, Supabase client |
| 2 | 8–10 | Auth routes (signup, login, forgot-password) |
| 3 | 11–15 | Asset CRUD + CSV import |
| 4 | 16–19 | Quote lifecycle + RFQ flow |
| 5 | 20–22 | Price list CRUD + lookup |
| 6 | 23–26 | Order PO lifecycle with status machine |
| 7 | 27–31 | Support tickets, notifications, org/user management, chat proxy |
| 8 | 32–34 | Unit tests for status machines |

**Total: 34 tasks across 8 chunks**

**Key patterns throughout:**
- Every route: Zod validates → role guard checks → service processes → repository queries
- Status transitions enforced in services with audit trail
- All list endpoints use cursor-based pagination (default 50)
- User JWT creates RLS-respecting Supabase client; service role for cross-org ops
- All routes prefixed under `/api/v1`
