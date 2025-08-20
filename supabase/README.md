# Supabase Setup Guide

This guide will help you set up a new Supabase project using this boilerplate's database schema.

## Prerequisites

- A Supabase account ([sign up free](https://supabase.com))
- Your application code configured with Supabase credentials

## Quick Start

### 1. Create a New Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - Project name
   - Database password (save this!)
   - Region (choose closest to your users)
4. Click "Create Project" and wait ~2 minutes for setup

### 2. Apply the Database Schema

1. Once your project is ready, click "SQL Editor" in the left sidebar
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/00000_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)

You should see "Success. No rows returned" - this means your schema is set up!

### 3. Create Your First Admin User

You need at least one admin user to access the admin dashboard.

#### Option A: Create User via Dashboard (Recommended)

1. Go to "Authentication" in the left sidebar
2. Click "Users" tab
3. Click "Add user" → "Create new user"
4. Fill in:
   - Email address
   - Password
   - Check "Auto Confirm Email"
5. Click "Create user"
6. Go to "SQL Editor" and run:
   ```sql
   UPDATE user_roles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

#### Option B: Create User via SQL (Faster)

1. Go to "SQL Editor"
2. Run this SQL (replace with your email/password):
   ```sql
   -- Create admin user
   SELECT auth.admin_create_user(
     '{"email": "admin@example.com", "password": "YourSecurePassword123!", "email_confirm": true}'
   );

   -- Make them admin
   UPDATE user_roles 
   SET role = 'admin' 
   WHERE email = 'admin@example.com';
   ```

### 4. Get Your Project Credentials

1. Click "Settings" (gear icon) in the left sidebar
2. Click "API"
3. Copy these values to your `.env.local` file:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### 5. (Optional) Add Demo Users

If you want sample users for testing:

```sql
-- Create regular user
SELECT auth.admin_create_user(
  '{"email": "user@example.com", "password": "Password123!", "email_confirm": true}'
);

-- Create moderator
SELECT auth.admin_create_user(
  '{"email": "moderator@example.com", "password": "Password123!", "email_confirm": true}'
);

-- Set moderator role
UPDATE user_roles 
SET role = 'moderator' 
WHERE email = 'moderator@example.com';

-- Optional: Add display names
UPDATE profiles 
SET full_name = 'Demo Admin' 
WHERE email = 'admin@example.com';

UPDATE profiles 
SET full_name = 'Demo User' 
WHERE email = 'user@example.com';

UPDATE profiles 
SET full_name = 'Demo Moderator' 
WHERE email = 'moderator@example.com';
```

## Verify Your Setup

1. Check that tables were created:
   - Go to "Table Editor" in sidebar
   - You should see: `profiles`, `user_roles`, `user_api_keys`, `user_metadata`, `admin_audit_log`, `app_settings`

2. Check that your admin user works:
   - Sign in to your application with the admin credentials
   - You should see the "Admin" link in the dashboard sidebar

## What Gets Created

This schema creates:

- **User Management**: Automatic profile creation, role-based permissions
- **Admin System**: User invitations, audit logging, admin dashboard access
- **App Settings**: Configurable app name, logo, and branding
- **Email System**: User-configurable email settings (requires Resend.com)
- **Security**: Row Level Security (RLS) policies on all tables

## Troubleshooting

### "relation auth.users does not exist"
- Make sure you're running this in a Supabase project, not a regular Postgres database
- The `auth` schema is automatically created by Supabase

### Admin link doesn't appear
- Check that your user's role is set to 'admin' in the `user_roles` table
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in your `.env.local`

### Can't sign in
- Verify your Supabase URL and anon key are correct in `.env.local`
- Check that the user exists in Authentication → Users
- Ensure the email is confirmed (should show green badge)

## Next Steps

1. Configure your application settings in Admin → Settings
2. Invite team members through Admin → Users → Invite
3. Set up email sending (optional) in Settings → Email Settings

## Database Schema Overview

```
auth.users (Managed by Supabase)
    ↓ (references)
profiles - User display information
user_roles - Permission management (admin/user/moderator)
user_api_keys - API keys and email settings
user_metadata - Additional user data
admin_audit_log - Tracks all admin actions
app_settings - Global app configuration
```

All tables include RLS (Row Level Security) policies for data protection.