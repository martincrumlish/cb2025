# 6. Refactor Auth from Clerk to Supabase

## Problem Statement
Currently using two separate services (Clerk for auth, Supabase for database) which creates:
- Additional cost ($25+/month for Clerk after free tier)
- Complexity in managing two services
- User ID synchronization issues
- Complex RLS policies with external IDs
- Two dashboards to monitor

## Benefits of Supabase-Only Auth
- Single service for auth + database + storage
- Native auth.uid() in RLS policies
- Better free tier (50k MAUs vs 10k)
- Direct access to auth.users table
- Built-in auth UI components
- Production-ready (used by Mozilla, Cal.com, etc.)

## Implementation Steps

### Step 1: Install Supabase Auth Dependencies

```bash
npm uninstall @clerk/clerk-react
npm install @supabase/auth-helpers-react @supabase/auth-ui-react @supabase/auth-ui-shared
```

### Step 2: Update Supabase Client with Auth

Update `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Most secure auth flow
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
    debug: import.meta.env.DEV,
  },
  global: {
    headers: {
      'x-application-name': 'aicoder-2025'
    }
  }
})

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  signInWithProvider: async (provider: 'google' | 'github' | 'discord') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { data, error }
  },

  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  }
}
```

### Step 3: Create Auth Context Provider

Create `src/contexts/AuthContext.tsx`:
```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithProvider: (provider: 'google' | 'github' | 'discord') => Promise<any>
  signOut: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      checkAdminStatus(session?.user?.id)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (event === 'SIGNED_IN') {
          await checkAdminStatus(session?.user?.id)
          navigate('/dashboard')
        } else if (event === 'SIGNED_OUT') {
          setIsAdmin(false)
          navigate('/')
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  const checkAdminStatus = async (userId?: string) => {
    if (!userId) {
      setIsAdmin(false)
      return
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single()

    setIsAdmin(!error && data?.role === 'admin')
  }

  const value = {
    user,
    session,
    loading,
    isAdmin,
    signUp: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      return { data, error }
    },
    signIn: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      return { data, error }
    },
    signInWithProvider: async (provider: 'google' | 'github' | 'discord') => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      return { data, error }
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    }
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### Step 4: Update Main App Entry

Update `src/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabase'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppSettingsProvider } from '@/contexts/AppSettingsContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppSettingsProvider>
              <App />
            </AppSettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </SessionContextProvider>
  </React.StrictMode>
)
```

### Step 5: Create Auth Components

Create `src/components/auth/SignInForm.tsx`:
```typescript
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/icons'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

export function SignInForm() {
  const { signIn, signInWithProvider } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      toast.success('Welcome back!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github' | 'discord') => {
    try {
      const { error } = await signInWithProvider(provider)
      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || `Failed to sign in with ${provider}`)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => handleOAuthSignIn('google')}
            disabled={loading}
          >
            <Icons.google className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOAuthSignIn('github')}
            disabled={loading}
          >
            <Icons.github className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOAuthSignIn('discord')}
            disabled={loading}
          >
            <Icons.discord className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Link to="/auth/reset-password" className="text-sm text-muted-foreground hover:underline">
          Forgot password?
        </Link>
        <div className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/sign-up" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
```

### Step 6: Create Protected Route Component

Create `src/components/auth/ProtectedRoute.tsx`:
```typescript
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
```

### Step 7: Update Database Schema for Auth

Create migration `supabase/migrations/00004_auth_refactor.sql`:
```sql
-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update user_roles to use auth.users
ALTER TABLE user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_user_id_key;

ALTER TABLE user_roles 
  ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  -- Default role is 'user'
  INSERT INTO public.user_roles (user_id, email, role, status)
  VALUES (new.id, new.email, 'user', 'active');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to use auth.uid()
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own API keys" ON user_api_keys;
CREATE POLICY "Users can manage their own API keys" ON user_api_keys
  FOR ALL USING (auth.uid()::TEXT = user_id);

DROP POLICY IF EXISTS "Users can view their own metadata" ON user_metadata;
CREATE POLICY "Users can view their own metadata" ON user_metadata
  FOR SELECT USING (auth.uid()::TEXT = user_id);

DROP POLICY IF EXISTS "Users can update their own metadata" ON user_metadata;
CREATE POLICY "Users can update their own metadata" ON user_metadata
  FOR UPDATE USING (auth.uid()::TEXT = user_id);

-- Simplify admin checks
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );
```

### Step 8: Update Admin Hooks

Update `src/hooks/useAdminPermissions.ts`:
```typescript
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export function useAdminPermissions() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<any>(null)

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) throw error

        setUserRole(data)
        setIsAdmin(data.role === 'admin' && data.status === 'active')
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdmin()
  }, [user])

  return {
    isAdmin,
    isLoading,
    userRole,
    userId: user?.id,
    userEmail: user?.email
  }
}
```

### Step 9: Update App.tsx Routes

Update `src/App.tsx`:
```typescript
import { Routes, Route } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Public pages
import Index from './pages/Index'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import AuthCallback from './pages/AuthCallback'

// Protected pages
import DashboardPage from './pages/DashboardPage'
import GeneratePage from './pages/GeneratePage'
import SettingsPage from './pages/SettingsPage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'
import InviteUser from './pages/admin/InviteUser'
import AdminSettings from './pages/admin/AdminSettings'

function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Index />} />
        <Route path="sign-in" element={<SignInPage />} />
        <Route path="sign-up" element={<SignUpPage />} />
        <Route path="auth/callback" element={<AuthCallback />} />
      </Route>

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="generate" element={<GeneratePage />} />
        <Route path="settings" element={<SettingsPage />} />
        
        {/* Admin routes */}
        <Route
          path="admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users/invite"
          element={
            <ProtectedRoute requireAdmin>
              <InviteUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/settings"
          element={
            <ProtectedRoute requireAdmin>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
```

### Step 10: Create Auth Callback Handler

Create `src/pages/AuthCallback.tsx`:
```typescript
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/dashboard')
      } else {
        navigate('/sign-in')
      }
    })
  }, [navigate])

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Authenticating...</span>
    </div>
  )
}
```

### Step 11: Update Environment Variables

Update `.env.example`:
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Remove Clerk variables
# VITE_CLERK_PUBLISHABLE_KEY=
# CLERK_SECRET_KEY=
```

### Step 12: Configure Supabase Auth Settings

In Supabase Dashboard:
1. Go to Authentication > Providers
2. Enable Email provider
3. Enable OAuth providers (Google, GitHub, Discord)
4. Configure redirect URLs:
   - `http://localhost:8080/auth/callback`
   - `https://yourdomain.com/auth/callback`
5. Set up email templates for:
   - Confirmation email
   - Password reset
   - Magic link

## Migration Checklist
- [ ] Install Supabase auth dependencies
- [ ] Remove Clerk dependencies
- [ ] Update Supabase client with auth config
- [ ] Create AuthContext provider
- [ ] Update main.tsx
- [ ] Create auth components (SignIn, SignUp, etc.)
- [ ] Create ProtectedRoute component
- [ ] Run database migration for auth schema
- [ ] Update admin hooks
- [ ] Update App.tsx routes
- [ ] Create auth callback handler
- [ ] Update environment variables
- [ ] Configure Supabase Dashboard
- [ ] Test all auth flows
- [ ] Update documentation

## Testing Auth Flows
1. **Email/Password signup** - with email confirmation
2. **Email/Password signin** - with remember me
3. **OAuth signin** - Google, GitHub, Discord
4. **Password reset** - via email
5. **Session refresh** - automatic token refresh
6. **Logout** - clear session
7. **Protected routes** - redirect to signin
8. **Admin routes** - require admin role
9. **Profile creation** - automatic on signup
10. **Role assignment** - default user role

## Production Considerations
- Enable ReCAPTCHA for auth endpoints
- Configure custom SMTP for emails
- Set up email domain verification
- Enable MFA for admin accounts
- Configure session timeouts
- Set up auth webhook endpoints
- Monitor failed login attempts
- Implement account lockout policies

## Benefits After Migration
- Single service to manage (Supabase only)
- 50k free MAUs (vs 10k with Clerk)
- Native database integration
- Simpler RLS policies with auth.uid()
- Direct access to auth.users table
- Lower cost at scale
- Built-in auth UI components
- Better developer experience