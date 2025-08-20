# 1. Fix the API Layer

## Problem Statement
The current API implementation uses a Vite middleware hack that intercepts `/api/*` routes during development. This approach is fragile, doesn't properly handle environment variables, and differs from production behavior.

## Current Issues
- Environment variables (especially non-VITE prefixed) require dotenv workarounds
- API routes are inconsistently handled between dev and production
- No proper request/response typing
- No API versioning or documentation
- Error handling is inconsistent

## Proposed Solution: Implement tRPC

### Why tRPC?
- End-to-end type safety between client and server
- Works seamlessly with TypeScript
- No code generation required
- Supports both SSR and client-side rendering
- Built-in error handling and validation

## Implementation Steps

### Step 1: Install Dependencies
```bash
npm install @trpc/server @trpc/client @trpc/react-query
npm install -D @types/cors
```

### Step 2: Create tRPC Router Structure
```
src/
  server/
    trpc.ts           # tRPC initialization
    routers/
      app.ts          # Main router
      settings.ts     # Settings procedures
      email.ts        # Email procedures
      admin.ts        # Admin procedures
    context.ts        # Request context
```

### Step 3: Initialize tRPC Server
Create `src/server/trpc.ts`:
```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
export const adminProcedure = t.procedure.use(adminMiddleware);
```

### Step 4: Create Context
Create `src/server/context.ts`:
```typescript
import { supabase } from '@/lib/supabase';
import type { User } from '@clerk/clerk-react';

export interface Context {
  user?: User;
  supabase: typeof supabase;
}

export const createContext = async (req: Request): Promise<Context> => {
  // Extract user from Clerk session
  const user = await getUserFromRequest(req);
  
  return {
    user,
    supabase,
  };
};
```

### Step 5: Migrate Existing APIs
Convert each API endpoint to a tRPC procedure:

**Before (app-settings.ts):**
```typescript
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, settings } = req.body;
    // ... logic
  }
}
```

**After (settings.router.ts):**
```typescript
export const settingsRouter = router({
  get: publicProcedure
    .query(async ({ ctx }) => {
      // Get settings logic
    }),
    
  update: adminProcedure
    .input(z.object({
      settings: z.record(z.string())
    }))
    .mutation(async ({ ctx, input }) => {
      // Update settings logic
    }),
});
```

### Step 6: Setup Client Integration
Create `src/lib/trpc.ts`:
```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/app';

export const trpc = createTRPCReact<AppRouter>();
```

### Step 7: Update Components
Replace fetch calls with tRPC hooks:

**Before:**
```typescript
const response = await fetch('/api/app-settings', {
  method: 'POST',
  body: JSON.stringify({ action: 'update', settings })
});
```

**After:**
```typescript
const mutation = trpc.settings.update.useMutation();
await mutation.mutateAsync({ settings });
```

### Step 8: Production Setup
For production, use a separate API server or edge functions:
```typescript
// api/trpc/[trpc].ts (Vercel)
import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '@/server/routers/app';
import { createContext } from '@/server/context';

export default createNextApiHandler({
  router: appRouter,
  createContext,
});
```

## Alternative Solution: Hono (Lighter Weight)

If tRPC feels too heavy, use Hono for a simpler REST API:

### Setup Hono
```bash
npm install hono @hono/node-server
```

### Create API Structure
```typescript
// src/server/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/*', cors());

// Route definitions
app.post('/api/settings', settingsHandler);
app.post('/api/email/send', emailHandler);

export default app;
```

### Development Server
```typescript
// vite.config.ts
import { createServer } from '@hono/node-server';

// In plugin
configureServer(server) {
  const api = createServer({ fetch: app.fetch });
  server.middlewares.use('/api', api);
}
```

## Testing the New API Layer

### Unit Tests
```typescript
// src/server/routers/__tests__/settings.test.ts
import { describe, it, expect } from 'vitest';
import { settingsRouter } from '../settings';

describe('Settings Router', () => {
  it('should update settings', async () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
// tests/api/settings.test.ts
import { createTestClient } from '@/tests/utils';

describe('Settings API', () => {
  it('should handle full update flow', async () => {
    const client = createTestClient();
    const result = await client.settings.update.mutate({
      settings: { app_name: 'Test' }
    });
    expect(result.success).toBe(true);
  });
});
```

## Migration Checklist
- [ ] Install tRPC or Hono dependencies
- [ ] Create server folder structure
- [ ] Setup tRPC router or Hono app
- [ ] Migrate app-settings API
- [ ] Migrate send-email API
- [ ] Migrate clerk-admin API
- [ ] Update all client-side API calls
- [ ] Remove old API files from `/api` folder
- [ ] Update vite.config.ts to remove API plugin
- [ ] Test all API endpoints
- [ ] Update documentation
- [ ] Add API versioning strategy

## Benefits After Implementation
- Type-safe API calls with autocompletion
- Consistent error handling
- Proper environment variable handling
- Same behavior in dev and production
- Easy to test and mock
- Built-in validation with Zod
- API documentation auto-generated from types