# Codebase 2025 — Setup and Run Guide

A modern React + Vite + Tailwind codebase with Supabase auth, simple serverless APIs (compatible with Vercel), and an admin area for settings and user management.

Tech stack:
- React 18, Vite 6 (dev server and build)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS)
- Serverless API handlers (in api/), wired to Vite dev server for local development
- Resend (transactional email)

## Prerequisites

- Node.js 18+ (or 20+ recommended)
- npm (project includes a package-lock.json)
- A Supabase project (URL, anon key, and service role key)
- Optional for email: Resend account and API key

Check versions:
- node -v
- npm -v

## 1) Install dependencies

- npm install

## 2) Configure environment variables (.env.local)

Copy the template and fill your values:
- Copy .env.example to .env.local

Vite is configured to load .env.local at dev-time and propagate variables to the API layer (vite.config.ts calls dotenv.config and merges vars into process.env).

Required keys:
- VITE_SUPABASE_URL — Your Supabase project URL
- VITE_SUPABASE_ANON_KEY — Supabase anon key (used client-side and in local API)
- SUPABASE_SERVICE_ROLE_KEY — Service role key (server-only, used by serverless API for admin actions)
- VITE_APP_URL — Public app URL for links and callback redirects (http://localhost:8080 for local dev)
- SUPABASE_ACCESS_TOKEN — Optional, for MCP tooling (not required to run the app)

Example .env.local:
- VITE_SUPABASE_URL=https://your-project-ref.supabase.co
- VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI...your-anon...
- SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...your-service-role...
- VITE_APP_URL=http://localhost:8080
- SUPABASE_ACCESS_TOKEN=sbp_...optional...

Notes:
- Variables prefixed with VITE_ are exposed to the browser.
- Do NOT commit .env.local.

## 3) Supabase setup

Create a project in Supabase and obtain:
- Project URL
- Anon key
- Service Role key

Auth redirect URLs:
Add these redirect URLs in Supabase Authentication settings:
- http://localhost:8080/auth/callback
- http://localhost:8080/auth/reset-password
- Production equivalents (e.g., https://your-domain.com/auth/callback)

OAuth providers:
If you plan to use OAuth (Google/GitHub/Discord), enable providers in Supabase and configure their callback to /auth/callback.

### Database migrations

This repo includes a comprehensive migration for fresh installations:
- `supabase/migrations/00000_initial_schema.sql`

To set up your database:
1) Open the Supabase SQL Editor
2) Paste the contents of `00000_initial_schema.sql`
3) Run the migration

What this migration creates:
- All necessary tables (profiles, user_roles, user_api_keys, user_metadata, admin_audit_log, app_settings)
- Row Level Security (RLS) policies for data protection
- Foreign key constraints with CASCADE DELETE for proper data cleanup
- Triggers for automation (user creation, updated_at timestamps)
- Performance indexes
- Default app settings

For detailed migration instructions, demo user setup, and troubleshooting, see [`docs/MIGRATION.md`](docs/MIGRATION.md).

Creating demo users (optional, for development):
```sql
-- Create admin user
SELECT auth.admin_create_user(
  '{"email": "admin@example.com", "password": "Password01", "email_confirm": true}'
);

-- Create regular user  
SELECT auth.admin_create_user(
  '{"email": "user@example.com", "password": "Password01", "email_confirm": true}'
);

-- Promote admin
UPDATE user_roles SET role = 'admin' WHERE email = 'admin@example.com';
```

## 4) Email configuration (Resend)

The email APIs read per-user email settings from the table user_api_keys. The required keys are:
- sender_name
- sender_email
- resend_api_key
- sender_domain (optional; if not set, Resend’s default domain is used)

Populate keys for your admin user via SQL (replace the UUID and values):
- INSERT INTO user_api_keys (user_id, key_name, key_value) VALUES
  ('<your-admin-user-uuid>', 'sender_name', 'Your App'),
  ('<your-admin-user-uuid>', 'sender_email', 'no-reply@yourdomain.com'),
  ('<your-admin-user-uuid>', 'resend_api_key', 're_your_resend_api_key'),
  ('<your-admin-user-uuid>', 'sender_domain', 'yourdomain.com');

Notes:
- The /api/send-email endpoint will send invitation and test emails using the stored values.
- For local dev, these API routes are mapped by Vite middleware, so they work without a separate server.

## 5) Run the app locally

Start dev server (Vite, port 8080 configured in vite.config.ts):
- npm run dev
- Open http://localhost:8080

Local API routes available during dev (proxied by Vite middleware):
- POST /api/send-email
- GET/POST /api/app-settings
- POST /api/admin-users

The middleware in vite.config.ts wires requests under /api to files in the api/ folder for the endpoints above.

Note:
- api/test-email.ts exists but is not wired in the Vite middleware by default. Use /api/send-email with emailType: "test" instead, or add a mapping if you want /api/test-email in dev:
  - In vite.config.ts, add '/test-email': 'test-email.ts' to apiEndpoints.

## 6) App features and flows

Authentication:
- Supabase client uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (src/lib/supabase.ts).
- Auth callback route: /auth/callback (src/pages/AuthCallback.tsx).
- Reset password route: /auth/update-password (navigated to after recovery).
- If you use OAuth providers, set them up in Supabase and ensure the callback URLs are configured.

Admin:
- Admin endpoints live under /api/admin-users and use SUPABASE_SERVICE_ROLE_KEY when available to bypass RLS for admin actions.
- Admin Settings page (src/pages/admin/AdminSettings.tsx) allows editing of app settings stored in the app_settings table via /api/app-settings.

App settings:
- Public settings can be fetched by GET /api/app-settings (no auth; only is_public=true rows are returned).
- Admin can read/update all settings via POST /api/app-settings.

Invitations and emails:
- The app supports creating invitations and sending emails via Resend.
- Client utility functions are in src/lib/email.ts and src/lib/admin.ts.

## 7) Build and preview

- npm run build
- npm run preview
- Preview runs a static server for the built output.

## 8) Deployment (Vercel)

This repository is compatible with Vercel:
- Vercel will serve the SPA and run serverless functions from api/*.ts.
- vercel.json includes a rewrite to route unknown paths to /index.html for SPA routing.
- Configure environment variables in your Vercel Project:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - VITE_APP_URL (e.g., your production URL)
- Ensure the same auth redirect URLs exist in Supabase for your production domain.

After deploy:
- Verify /api/app-settings and /api/admin-users function responses.
- Confirm emails can be sent via /api/send-email.

## Useful npm scripts

- npm run dev — start Vite dev server at port 8080
- npm run build — build for production
- npm run build:dev — dev-mode build
- npm run preview — preview the production build
- npm run lint — run ESLint

## Troubleshooting

- Missing Supabase keys:
  - Errors like “Missing Supabase configuration” indicate VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is unset. Check .env.local.
- Admin API errors:
  - If admin endpoints fail due to RLS, ensure SUPABASE_SERVICE_ROLE_KEY is set and available to the API runtime. In dev, vite.config.ts loads .env.local and merges to process.env for API handlers.
- CORS:
  - API handlers set permissive CORS headers for local dev.
- OAuth redirect loops:
  - Confirm redirect URLs in Supabase match your VITE_APP_URL/auth/callback and are also configured for production.
- Email sending fails:
  - Ensure user_api_keys contains sender_name, sender_email, and a valid resend_api_key (starts with "re_").
  - If using a custom domain, verify it in Resend; otherwise omit sender_domain to use Resend’s default domain.

## Notes on branches

- The default branch name is main.
- If creating new repos locally, you can default new git repos to main:
  - git config --global init.defaultBranch main
