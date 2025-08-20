# 4. Clean Up Environment Variables

## Problem Statement
Environment variable management is currently inconsistent and problematic:
- Mix of `VITE_` prefixed and non-prefixed variables
- Service role key not accessible in API endpoints without workarounds
- Dotenv manual loading in vite.config.ts is a hack
- No validation of required environment variables
- No type safety for environment variables
- Secrets potentially exposed in client bundle

## Proposed Solution
Implement a clean, type-safe environment variable system with:
- Clear separation of client and server variables
- Runtime validation
- Type definitions
- Secure secrets management
- Development/production parity

## Implementation Steps

### Step 1: Define Environment Schema

Create `src/env/schema.ts`:
```typescript
import { z } from 'zod';

// Client-side environment variables (exposed to browser)
export const clientEnvSchema = z.object({
  VITE_APP_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_ANALYTICS_ID: z.string().optional(),
});

// Server-side environment variables (never exposed to browser)
export const serverEnvSchema = z.object({
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ACCESS_TOKEN: z.string().startsWith('sbp_'),
  
  // Clerk
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  
  // Email
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  
  // Database
  DATABASE_URL: z.string().url().optional(),
  
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

// Combined schema for full validation
export const envSchema = z.object({
  ...clientEnvSchema.shape,
  ...serverEnvSchema.shape,
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type Env = z.infer<typeof envSchema>;
```

### Step 2: Create Environment Validator

Create `src/env/validate.ts`:
```typescript
import { clientEnvSchema, serverEnvSchema, type ClientEnv, type ServerEnv } from './schema';

class EnvValidationError extends Error {
  constructor(errors: Record<string, string[]>) {
    const message = Object.entries(errors)
      .map(([key, messages]) => `${key}: ${messages.join(', ')}`)
      .join('\n');
    super(`Environment validation failed:\n${message}`);
    this.name = 'EnvValidationError';
  }
}

export function validateClientEnv(): ClientEnv {
  try {
    return clientEnvSchema.parse(import.meta.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new EnvValidationError(error.flatten().fieldErrors);
    }
    throw error;
  }
}

export function validateServerEnv(): ServerEnv {
  // Server env is only available in Node.js environment
  if (typeof process === 'undefined') {
    throw new Error('Server environment variables are not available in the browser');
  }
  
  try {
    return serverEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new EnvValidationError(error.flatten().fieldErrors);
    }
    throw error;
  }
}

// Validate on module load in development
if (import.meta.env.DEV) {
  validateClientEnv();
}
```

### Step 3: Create Type-Safe Environment Access

Create `src/env/client.ts`:
```typescript
import { validateClientEnv, type ClientEnv } from './validate';

// Validate and freeze environment variables
const env = Object.freeze(validateClientEnv());

// Export typed environment object
export const clientEnv = {
  appUrl: env.VITE_APP_URL,
  supabase: {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  },
  clerk: {
    publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
  },
  sentry: {
    dsn: env.VITE_SENTRY_DSN,
  },
  analytics: {
    id: env.VITE_ANALYTICS_ID,
  },
} as const;

// Type helper for environment variables
export type ClientEnvironment = typeof clientEnv;
```

Create `src/env/server.ts`:
```typescript
import { validateServerEnv, type ServerEnv } from './validate';

// This file should only be imported in server-side code
if (typeof window !== 'undefined') {
  throw new Error('Server environment cannot be imported in client code');
}

// Validate and freeze environment variables
const env = Object.freeze(validateServerEnv());

// Export typed environment object
export const serverEnv = {
  supabase: {
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    accessToken: env.SUPABASE_ACCESS_TOKEN,
  },
  clerk: {
    secretKey: env.CLERK_SECRET_KEY,
  },
  resend: {
    apiKey: env.RESEND_API_KEY,
  },
  database: {
    url: env.DATABASE_URL,
  },
  nodeEnv: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
} as const;

export type ServerEnvironment = typeof serverEnv;
```

### Step 4: Update Environment Files

Create `.env.example`:
```bash
# ============================================
# CLIENT ENVIRONMENT VARIABLES (Public)
# These are exposed to the browser
# ============================================

# Application
VITE_APP_URL=http://localhost:8080

# Supabase (Public)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Clerk (Public)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your-key

# Analytics (Optional)
VITE_SENTRY_DSN=https://your-sentry-dsn
VITE_ANALYTICS_ID=your-analytics-id

# ============================================
# SERVER ENVIRONMENT VARIABLES (Secret)
# These are NEVER exposed to the browser
# ============================================

# Supabase (Secret)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ACCESS_TOKEN=sbp_your-access-token

# Clerk (Secret)
CLERK_SECRET_KEY=sk_test_your-secret-key

# Email (Optional)
RESEND_API_KEY=re_your-api-key

# Database (Optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Node
NODE_ENV=development
```

Create `.env.local` (git-ignored):
```bash
# Copy from .env.example and fill in your actual values
```

### Step 5: Update Vite Configuration

Update `vite.config.ts`:
```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      // Custom plugin for API routes
      {
        name: 'api-middleware',
        configureServer(server) {
          // Make server env available to API routes
          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/api/')) {
              // Attach env to request for API handlers
              req.env = env;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Explicitly define which env vars are exposed to client
    envPrefix: 'VITE_',
    define: {
      // Add compile-time constants if needed
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  };
});
```

### Step 6: Create Environment Provider for React

Create `src/providers/EnvProvider.tsx`:
```typescript
import { createContext, useContext, ReactNode } from 'react';
import { clientEnv, type ClientEnvironment } from '@/env/client';

const EnvContext = createContext<ClientEnvironment | null>(null);

export function EnvProvider({ children }: { children: ReactNode }) {
  return (
    <EnvContext.Provider value={clientEnv}>
      {children}
    </EnvContext.Provider>
  );
}

export function useEnv() {
  const context = useContext(EnvContext);
  if (!context) {
    throw new Error('useEnv must be used within EnvProvider');
  }
  return context;
}
```

### Step 7: Update API Endpoints

Update `/api/app-settings.ts`:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/env/server';

// Use validated environment variables
const supabase = createClient(
  serverEnv.supabase.url,
  serverEnv.supabase.anonKey
);

const supabaseAdmin = createClient(
  serverEnv.supabase.url,
  serverEnv.supabase.serviceRoleKey
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // API implementation...
}
```

### Step 8: Update Component Usage

Update components to use typed env:
```typescript
import { useEnv } from '@/providers/EnvProvider';

function MyComponent() {
  const env = useEnv();
  
  // TypeScript knows exactly what's available
  const supabaseUrl = env.supabase.url;
  const clerkKey = env.clerk.publishableKey;
  
  return (
    <div>
      Environment: {env.appUrl}
    </div>
  );
}
```

### Step 9: Add Runtime Validation Script

Create `scripts/validate-env.js`:
```javascript
#!/usr/bin/env node

const { z } = require('zod');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found');
  console.log('📝 Copy .env.example to .env.local and fill in your values');
  process.exit(1);
}

dotenv.config({ path: envPath });

// Define schema (same as TypeScript version)
const requiredEnvVars = {
  VITE_APP_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
};

// Validate
const errors = [];
for (const [key, schema] of Object.entries(requiredEnvVars)) {
  try {
    schema.parse(process.env[key]);
    console.log(`✅ ${key}`);
  } catch (error) {
    errors.push(`❌ ${key}: ${error.message}`);
  }
}

if (errors.length > 0) {
  console.error('\n❌ Environment validation failed:');
  errors.forEach(error => console.error(error));
  process.exit(1);
} else {
  console.log('\n✅ All environment variables are valid!');
}
```

Update `package.json`:
```json
{
  "scripts": {
    "env:validate": "node scripts/validate-env.js",
    "dev": "npm run env:validate && vite",
    "build": "npm run env:validate && tsc && vite build"
  }
}
```

### Step 10: Add Environment Documentation

Create `docs/ENVIRONMENT.md`:
```markdown
# Environment Variables Guide

## Overview
This application uses a strict environment variable system with:
- Type safety via TypeScript
- Runtime validation with Zod
- Clear separation between client and server variables

## Variable Categories

### Client Variables (VITE_ prefix)
These variables are bundled into the client code and visible in the browser:
- `VITE_APP_URL` - Application URL
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public Supabase key
- `VITE_CLERK_PUBLISHABLE_KEY` - Public Clerk key

### Server Variables (No prefix)
These variables are only available server-side and never exposed:
- `SUPABASE_SERVICE_ROLE_KEY` - Secret Supabase admin key
- `CLERK_SECRET_KEY` - Secret Clerk key
- `RESEND_API_KEY` - Email service key

## Setup Instructions

1. Copy `.env.example` to `.env.local`
2. Fill in your values
3. Run `npm run env:validate` to check

## Security Notes
- Never commit `.env.local`
- Never use server variables in client code
- Always validate before deployment
```

### Step 11: Add Git Hooks for Environment Validation

Create `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate environment variables before commit
npm run env:validate
```

## Migration Checklist
- [ ] Create environment schema with Zod
- [ ] Create validation functions
- [ ] Create typed environment accessors
- [ ] Update .env.example with all variables
- [ ] Update vite.config.ts
- [ ] Create EnvProvider for React
- [ ] Update all API endpoints
- [ ] Update all components
- [ ] Add validation script
- [ ] Add documentation
- [ ] Setup git hooks
- [ ] Test in development
- [ ] Test production build
- [ ] Update CI/CD environment setup

## Benefits After Implementation
- Type-safe environment access
- No runtime surprises from missing variables
- Clear separation of client/server secrets
- Validation before deployment
- Better security (no accidental secret exposure)
- Easier onboarding for new developers
- Consistent environment setup across team