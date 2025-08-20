# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on port 8080
- `npm run build` - Build for production
- `npm run build:dev` - Build for development mode  
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Environment Setup

### Required Environment Variables

This application requires environment variables for secure credential management. Follow these steps:

1. **Copy the example file**: `cp .env.example .env.local`
2. **Configure your values** in `.env.local`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Application Configuration
VITE_APP_URL=http://localhost:8080

# MCP Configuration (for .mcp.json)
SUPABASE_ACCESS_TOKEN=sbp_your-supabase-access-token
```

### MCP Configuration

The `.mcp.json` file requires manual token configuration since it doesn't support environment variable substitution:

1. Copy `.mcp.json.example` to `.mcp.json`
2. Replace `YOUR_SUPABASE_ACCESS_TOKEN` with your actual Supabase access token
3. Replace `YOUR_SUPABASE_PROJECT_REF` with your project reference

### Security Notes

- `.env.local` is gitignored - never commit environment files
- `VITE_` prefixed variables are client-side accessible
- Non-`VITE_` prefixed variables are server-side only
- All credentials are now externalized from source code
- `SUPABASE_SERVICE_ROLE_KEY` must be kept secure (server-side only)
- **Critical**: `SUPABASE_SERVICE_ROLE_KEY` is REQUIRED for admin functions to work properly

## Architecture Overview

This is a React + TypeScript + Vite application with Supabase authentication and a multi-layout architecture:

### Authentication System
- **Supabase Auth** configured with implicit flow for compatibility
- **Important**: Uses `flowType: 'implicit'` instead of PKCE to ensure password reset links work correctly
- Password reset links redirect directly to `/auth/update-password`
- Auth state changes handled via `onAuthStateChange` events
- **Admin Check**: AuthContext checks user role on login and provides `isAdmin` state
- **Hooks**: `useAdminPermissions` hook provides granular permission checks

### Layout System
Three distinct layouts managed by React Router:

**PublicLayout** (`/`):
- Header component with navigation
- Container-based content area
- Used for landing page only

**AuthLayout** (`/sign-in`, `/sign-up`, `/auth/*`):
- Vertically centered content without header navigation
- Displays app logo from database settings (if configured)
- Maximum width of 432px (max-w-md)
- Used for all authentication pages

**DashboardLayout** (`/dashboard`, `/dashboard/*`):  
- Grid-based layout with sidebar (220px/280px responsive)
- Fixed header with UserButton
- Main content area with consistent padding
- Requires authentication

### Route Structure in App.tsx
```
/ (PublicLayout)
└── / → Index.tsx

/auth (AuthLayout)
├── /sign-in → SignInPage.tsx
├── /sign-up → SignUpPage.tsx
├── /auth/callback → AuthCallback.tsx
├── /auth/reset-password → ResetPasswordPage.tsx
└── /auth/update-password → UpdatePasswordPage.tsx

/dashboard (DashboardLayout - Auth Required)
├── /dashboard → DashboardPage.tsx
├── /dashboard/generate → GeneratePage.tsx
├── /dashboard/settings → SettingsPage.tsx
├── /dashboard/profile → ProfilePage.tsx
└── /dashboard/admin/* → Admin routes (InviteUser, etc.)
```

### shadcn/ui Integration
- Complete component library in `src/components/ui/`
- Configured with slate base color and CSS variables
- Path aliases: `@/components`, `@/lib/utils`, `@/hooks`
- **Do not modify** existing shadcn components - create new ones if customization needed

### Key Architectural Decisions
- All routes defined in `App.tsx` (per AI_RULES.md)
- Pages in `src/pages/`, components in `src/components/`
- Main page is `src/pages/Index.tsx`
- TanStack Query for data fetching
- Dual toast systems: shadcn Toaster + Sonner
- Dyad component tagger for development

### Authentication Configuration Notes
- **Password Reset Flow**: Uses implicit flow (`flowType: 'implicit'` in `src/lib/supabase.ts`)
- **Why Implicit Over PKCE**: PKCE flow fails for password reset links because the code verifier is stored in sessionStorage, which is domain-specific. When users click email links, they go through Supabase's domain first, losing the verifier.
- **Direct Redirects**: Password reset emails redirect directly to `/auth/update-password` to avoid callback complexity
- **Auth Events**: The `AuthCallback` component listens for `PASSWORD_RECOVERY` events to handle navigation

## Email System Architecture

### Real Email Integration (CORS-Free)
The application implements a platform-agnostic email system that works locally and in production:

**Development Environment:**
- Vite plugin in `vite.config.ts` serves API functions locally at `/api/send-email`
- Custom middleware handles CORS headers and request parsing
- Imports and executes serverless functions during development

**Production Environment:**
- Serverless function at `/api/send-email.ts` for Vercel/Netlify/Railway deployment
- Platform-agnostic design works with any serverless hosting provider

### Email Features
- **Settings Management**: User-configurable email settings in `src/pages/SettingsPage.tsx`
- **Test Functionality**: Real email sending with test button and status feedback
- **User Invitations**: Admin system for sending invitation emails via `src/lib/admin.ts`
- **Database Integration**: Email settings stored per-user in Supabase `user_api_keys` table
- **Service Provider**: Resend.com integration for reliable email delivery

### Email Configuration
Required settings stored in database:
- `sender_name`: Display name for outgoing emails
- `sender_email`: From address (must match verified domain for production)
- `resend_api_key`: Resend.com API key (starts with `re_`)
- `sender_domain`: Optional custom domain for email sending

**Important**: For production email delivery, the `sender_email` must use the same domain as `sender_domain`. For example, if `sender_domain` is "coursebuilder.ai", use an email like "admin@coursebuilder.ai".

### Key Files
- `/api/send-email.ts` - Serverless email API function
- `src/lib/email.ts` - Client-side email functions and API calls
- `src/pages/SettingsPage.tsx` - Email configuration UI
- `src/lib/admin.ts` - Admin user management with email integration
- `vite.config.ts` - Development proxy for API functions

## Database Schema

### Supabase Integration
- **Connection**: Configured in `src/lib/supabase.ts` using environment variables
- **Authentication**: Uses Supabase Auth with user IDs as foreign keys
- **Storage**: User settings, API keys, and admin logs stored in Supabase
- **Debug Mode**: Auth client runs in debug mode in development for better error visibility
- **CASCADE DELETE**: All user-related tables have CASCADE DELETE foreign keys to auth.users (migration 00002)

### Key Tables
- `user_api_keys`: Stores user API keys and email settings
- `user_roles`: Admin system for user management and invitations
  - **RLS Policies**: Users can view their own role, service role has full access
  - **Important**: Avoid self-referencing queries in RLS policies to prevent infinite recursion
- `user_metadata`: Additional user information and admin notes
- `admin_audit_log`: Audit trail for admin actions
- `app_settings`: Global application configuration and branding

## Admin System

### Admin Authentication
- **Admin Detection**: Uses `AuthContext` to check user role from `user_roles` table
- **Database Query**: Fetches user role with `maybeSingle()` to handle non-admin users gracefully
- **Sidebar Display**: Admin link appears automatically when user has admin role
- **Timeout Handling**: Queries include 3-second timeout to prevent hanging on database issues
- **Prefetch Optimization**: Admin status is prefetched during sign-in to eliminate CLS (Cumulative Layout Shift)
  - The `signIn` function in AuthContext now checks admin status immediately after authentication
  - This prevents the Admin link from appearing with a delay, improving UX

### Admin Dashboard Architecture
The admin dashboard uses a **vertical tabbed interface** for better organization:

**Layout Structure:**
- Left sidebar with navigation tabs (fixed width: 256px)
- Main content area with tab-specific content
- Consistent with Settings page UI pattern

**Admin Dashboard Tabs:**
- **Overview** (default): Stats cards, recent activity, system status
- **Users**: User management with search/filter capabilities
- **Invitations**: Send invites and manage pending invitations
- **Settings**: Application-wide configuration
- **Audit Logs**: Complete administrative action history

### User Management Features
- **User Invitations**: Send real email invitations with custom roles via Resend
  - Invitations include unique IDs and 7-day expiration
  - Email sent with organization branding from app settings
  - Invitation acceptance flow integrated with sign-up page
- **Direct User Creation**: Create users without email invitations
- **Role Management**: Admin, User, Moderator roles
- **Audit Logging**: Track all admin actions in database
- **User Deletion System** (Complete Implementation):
  - **Dual-Path Deletion**: Handles both authenticated users and invitation-only records
    - Users with auth accounts: Deleted via Supabase Auth API with CASCADE DELETE
    - Users without auth accounts (invitations/cancelled): Deleted directly from user_roles table using email
  - **CASCADE DELETE**: When deleting authenticated users, automatically removes all related data from:
    - `profiles` table (user profile information)
    - `user_roles` table (roles and permissions)
    - `user_metadata` table (additional user data)
    - `user_api_keys` table (API keys and settings)
  - **Implementation Details**:
    - Frontend: `src/pages/admin/UserManagement.tsx:148-164` - Passes both user_id and email
    - Client Library: `src/lib/admin.ts:278-308` - deleteUser function accepts null user_id
    - API Endpoint: `api/admin-users.ts:170-238` - Handles both deletion paths
    - Migration: `supabase/migrations/00002_user_deletion_cascade.sql` - CASCADE constraints
  - **Audit Trail Preserved**: Deletion records remain in admin_audit_log for compliance
  - **Immediate Effect**: User cannot sign in after deletion
  - **Cannot be Undone**: Permanent, irreversible deletion
  - **Confirmation Dialog**: Enhanced with detailed warnings about data loss

### Invitation System Implementation
- **Database**: `user_roles` table stores invitations with `invitation_id`, `expires_at` fields
- **Email Sending**: `src/lib/admin.ts:158-195` - `createUserInvitation` function sends emails
- **Acceptance Flow**: `src/components/auth/SignUpForm.tsx` detects invitation parameters
- **Email Templates**: `src/lib/email.ts:105-238` - HTML template for invitation emails
- **URL Generation**: Invitations include signup link with invitation ID and email parameters

### Admin Routes
- `/dashboard/admin` - Admin dashboard with tabbed interface
- `/dashboard/admin/users` - User management interface (also accessible via Users tab)
- `/dashboard/admin/users/invite` - Invite new users form (also accessible via Invitations tab)
- `/dashboard/admin/settings` - Application settings configuration (also accessible via Settings tab)

## App Settings System

### Application Configuration
The application supports dynamic branding and configuration through the app settings system:

**Database Architecture**:
- **Table**: `app_settings` stores global configuration
- **Fields**: setting_key, setting_value, setting_type, description, is_public, updated_by, updated_at
- **RLS Policies**: Public read for is_public=true, admin-only write access
- **API Security**: Uses anon key with RLS enforcement
- **Fallbacks**: Automatic defaults when settings unavailable

### App Settings Features
- **Dynamic Branding**: Application name, logo, and favicon
- **SEO Configuration**: Meta description and page titles
- **Context Management**: React context provides global state
- **Real-time Updates**: Changes reflect immediately across the app
- **Admin-Only Access**: Settings configuration restricted to admin users
- **RLS Policies**: Database-level security for settings management

### App Settings Configuration
Settings stored in database:
- `app_name`: Application display name (default: "AICoder 2025")
- `app_logo_url`: URL to application logo image (optional)
- `app_favicon_url`: URL to favicon file (optional)
- `app_description`: Meta description for SEO

### App Settings API Implementation
**Critical**: The API endpoint requires the service role key to bypass RLS policies:
- The `SUPABASE_SERVICE_ROLE_KEY` environment variable MUST be set in `.env.local`
- Without this key, admin operations will fail with 403 errors due to RLS policies
- The service role key bypasses RLS for both read and write operations
- Admin permission checks and database updates both require the service role client
- If the service role key is missing, the API will log a warning and operations will fail

### Key Files
- `/api/app-settings.ts` - Serverless API for settings management
- `src/lib/app-settings.ts` - Client-side settings functions
- `src/contexts/AppSettingsContext.tsx` - React context provider
- `src/hooks/useDocumentTitle.ts` - Dynamic document title and favicon
- `src/pages/admin/AdminSettings.tsx` - Admin-only app settings configuration
- `vite.config.ts` - Loads environment variables for API endpoints using dotenv

## Settings Page Architecture

### Navigation System
The settings page uses a **sidebar navigation** pattern with vertical tabs:

**Layout Structure:**
- Left sidebar with navigation items (fixed width: 256px)
- Main content area with tab content (flexible width)
- Vertical orientation with left-aligned navigation items
- Active states and hover effects using shadcn/ui styling

**Settings Categories:**
- **API Keys**: OpenAI and fal.ai API key configuration
- **Email Settings**: SMTP configuration and email templates

**Implementation:**
- Uses shadcn/ui Tabs component with `orientation="vertical"`
- Custom styling for left-aligned secondary navigation
- Responsive design with proper spacing and visual hierarchy
- Consistent with shadcn/ui design patterns

### Important Rules from AI_RULES.md
- Always use TypeScript and Tailwind CSS
- Keep routes in `src/App.tsx`
- Update main page (`Index.tsx`) to showcase new components
- Use existing shadcn/ui components extensively
- All shadcn/ui and Radix UI dependencies are pre-installed