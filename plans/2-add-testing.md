# 2. Add Testing Infrastructure

## Problem Statement
The application currently has zero tests, making it risky for commercial deployment. Without tests, refactoring is dangerous, regressions are common, and confidence in deployments is low.

## Testing Strategy
Implement a comprehensive testing pyramid:
- **Unit Tests** (60%): Component logic, utilities, hooks
- **Integration Tests** (30%): API calls, database operations
- **E2E Tests** (10%): Critical user flows

## Implementation Steps

### Step 1: Install Testing Dependencies

```bash
# Core testing framework
npm install -D vitest @vitest/ui happy-dom

# React testing
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom

# Mocking and utilities
npm install -D msw @faker-js/faker

# E2E testing
npm install -D playwright @playwright/test
```

### Step 2: Configure Vitest

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '*.config.ts',
        'src/components/ui/**', // Exclude shadcn components
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Step 3: Setup Test Environment

Create `src/tests/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// Mock environment variables
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_key';
```

### Step 4: Create Testing Utilities

Create `src/tests/utils/render.tsx`:
```typescript
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { AppSettingsProvider } from '@/contexts/AppSettingsContext';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  const queryClient = createTestQueryClient();
  
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ClerkProvider publishableKey="pk_test">
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppSettingsProvider>
              {children}
            </AppSettingsProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ClerkProvider>
    );
  }
  
  return rtlRender(ui, { wrapper: Wrapper, ...options });
}
```

### Step 5: Setup Mock Service Worker (MSW)

Create `src/tests/mocks/server.ts`:
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

Create `src/tests/mocks/handlers.ts`:
```typescript
import { rest } from 'msw';

export const handlers = [
  // Mock Supabase endpoints
  rest.get('https://test.supabase.co/rest/v1/app_settings', (req, res, ctx) => {
    return res(
      ctx.json([
        { setting_key: 'app_name', setting_value: 'Test App' },
      ])
    );
  }),
  
  // Mock Clerk endpoints
  rest.get('https://api.clerk.dev/v1/users', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          { id: 'user_1', email: 'test@example.com' },
        ],
      })
    );
  }),
];
```

### Step 6: Write Component Tests

Create `src/components/__tests__/PageLayout.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/tests/utils/render';
import PageLayout from '@/components/PageLayout';

describe('PageLayout', () => {
  it('renders title and description', () => {
    renderWithProviders(
      <PageLayout title="Test Title" description="Test Description">
        <div>Content</div>
      </PageLayout>
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
  
  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <PageLayout title="Test" className="custom-class">
        Content
      </PageLayout>
    );
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
```

### Step 7: Write Hook Tests

Create `src/hooks/__tests__/useAdminPermissions.test.ts`:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import * as ClerkReact from '@clerk/clerk-react';

vi.mock('@clerk/clerk-react');

describe('useAdminPermissions', () => {
  it('returns admin status for admin user', async () => {
    vi.mocked(ClerkReact.useUser).mockReturnValue({
      user: { id: 'admin_user' },
      isLoaded: true,
    });
    
    const { result } = renderHook(() => useAdminPermissions());
    
    await waitFor(() => {
      expect(result.current.isAdmin).toBe(true);
    });
  });
  
  it('returns false for non-admin user', async () => {
    vi.mocked(ClerkReact.useUser).mockReturnValue({
      user: { id: 'regular_user' },
      isLoaded: true,
    });
    
    const { result } = renderHook(() => useAdminPermissions());
    
    await waitFor(() => {
      expect(result.current.isAdmin).toBe(false);
    });
  });
});
```

### Step 8: Write Integration Tests

Create `src/lib/__tests__/app-settings.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getPublicAppSettings, updateAppSettings } from '@/lib/app-settings';
import { server } from '@/tests/mocks/server';
import { rest } from 'msw';

describe('App Settings API', () => {
  beforeEach(() => {
    server.resetHandlers();
  });
  
  it('fetches public settings', async () => {
    const settings = await getPublicAppSettings();
    expect(settings.app_name).toBe('Test App');
  });
  
  it('handles API errors gracefully', async () => {
    server.use(
      rest.get('/api/app-settings', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    await expect(getPublicAppSettings()).rejects.toThrow();
  });
  
  it('updates settings with admin permissions', async () => {
    server.use(
      rest.post('/api/app-settings', (req, res, ctx) => {
        return res(ctx.json({ success: true }));
      })
    );
    
    await updateAppSettings('admin_user', {
      app_name: 'Updated Name',
    });
    
    // Verify the request was made correctly
  });
});
```

### Step 9: Setup E2E Tests with Playwright

Create `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

Create `e2e/auth.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects to sign-in when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/sign-in/);
  });
  
  test('shows dashboard after sign-in', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Fill in credentials
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
```

### Step 10: Add Test Scripts

Update `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Step 11: Create Test Documentation

Create `docs/TESTING.md`:
```markdown
# Testing Guide

## Running Tests

```bash
# Run all unit and integration tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Writing Tests

### Component Tests
Place component tests next to the component:
- `src/components/Button.tsx`
- `src/components/__tests__/Button.test.tsx`

### Hook Tests
Place hook tests in the hooks folder:
- `src/hooks/useAuth.ts`
- `src/hooks/__tests__/useAuth.test.ts`

### E2E Tests
Place E2E tests in the e2e folder:
- `e2e/user-flow.spec.ts`

## Test Coverage Goals
- Overall: 80%
- Critical paths: 100%
- UI Components: 70%
- Utilities: 90%
- API handlers: 85%
```

## Testing Checklist
- [ ] Install testing dependencies
- [ ] Configure Vitest
- [ ] Setup test environment
- [ ] Create testing utilities
- [ ] Setup MSW for API mocking
- [ ] Write tests for existing components
- [ ] Write tests for hooks
- [ ] Write tests for API functions
- [ ] Setup Playwright for E2E
- [ ] Write critical E2E tests
- [ ] Add pre-commit hooks for tests
- [ ] Setup CI/CD to run tests
- [ ] Document testing practices
- [ ] Set coverage thresholds

## Priority Testing Areas
1. **Authentication flows** - Critical for security
2. **Admin operations** - High risk actions
3. **Payment processing** - If applicable
4. **Data mutations** - Prevent data loss
5. **Email sending** - Prevent spam/errors
6. **Settings updates** - System configuration

## Benefits After Implementation
- Confidence in deployments
- Faster development (catch bugs early)
- Documentation through tests
- Easier refactoring
- Better code quality
- Reduced regression bugs