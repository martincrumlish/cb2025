# Database Migration Guide

This guide provides complete instructions for setting up a fresh Supabase database for the AICoder 2025 application.

## Prerequisites

1. A Supabase project (create one at [supabase.com](https://supabase.com))
2. Access to the Supabase SQL Editor
3. Your project's API credentials

## Migration File

The application includes a single, comprehensive migration file:

**`00000_initial_schema.sql`** - Complete database setup including:
- All tables with proper foreign key constraints
- Row Level Security (RLS) policies
- Triggers and functions
- Performance indexes
- Default app settings

## Step-by-Step Migration Instructions

### Step 1: Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New project"
3. Fill in:
   - Project name: Your app name
   - Database password: Generate a strong password
   - Region: Choose closest to your users
4. Click "Create new project" and wait for setup

### Step 2: Run the Initial Schema Migration

1. Navigate to the **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Copy the entire contents of `supabase/migrations/00000_initial_schema.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute

This migration will create:
- All necessary tables (profiles, user_roles, user_api_keys, user_metadata, admin_audit_log, app_settings)
- Indexes for performance
- Trigger functions for automation
- Row Level Security (RLS) policies
- Default app settings

### Step 3: Create Demo Users (Optional - Development Only)

For development and testing, you can create demo users:

1. In the SQL Editor, run the following commands:

```sql
-- Create admin user
SELECT auth.admin_create_user(
  '{"email": "admin@example.com", "password": "Password01", "email_confirm": true}'
);

-- Create regular user
SELECT auth.admin_create_user(
  '{"email": "user@example.com", "password": "Password01", "email_confirm": true}'
);
```

2. After users are created, promote the admin:

```sql
-- Update admin role
UPDATE user_roles 
SET role = 'admin' 
WHERE email = 'admin@example.com';

-- Add display names (optional)
UPDATE profiles 
SET full_name = 'Demo Admin' 
WHERE email = 'admin@example.com';

UPDATE profiles 
SET full_name = 'Demo User' 
WHERE email = 'user@example.com';
```

### Step 4: Configure Authentication Settings

1. Go to **Authentication → Providers** in Supabase dashboard
2. Enable **Email** provider
3. Configure email templates as needed
4. Set up redirect URLs:
   - Site URL: `http://localhost:8080` (for development)
   - Redirect URLs: Add your production domain when deploying

### Step 5: Get Your API Credentials

1. Go to **Settings → API** in Supabase dashboard
2. Copy these values for your `.env.local` file:
   - **Project URL**: `https://[YOUR_PROJECT_REF].supabase.co`
   - **Anon Key**: Public key for client-side
   - **Service Role Key**: Secret key for server-side (keep secure!)

### Step 6: Configure Your Application

1. Copy `.env.example` to `.env.local`
2. Update with your Supabase credentials:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Application Configuration
VITE_APP_URL=http://localhost:8080
```

### Step 7: Verify the Migration

Run these queries to verify everything is set up correctly:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies are created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify app settings
SELECT * FROM app_settings;

-- Check demo users (if created)
SELECT u.email, r.role, r.status 
FROM auth.users u 
JOIN user_roles r ON u.id = r.user_id;
```

## Important Security Notes

### RLS (Row Level Security)

All tables have RLS enabled with the following policies:

- **Users** can only access their own data
- **Admins** have broader access for management
- **Public** settings are readable by everyone
- **Audit logs** preserve history even after user deletion

### Foreign Key Constraints

The schema uses CASCADE DELETE for user data:
- When a user is deleted from `auth.users`, all their related data is automatically removed
- Exception: `admin_audit_log` preserves records for compliance

### API Keys and Secrets

- **Never commit** `.env.local` or real API keys to version control
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - keep it secure!
- Use environment variables for all sensitive configuration

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Ensure RLS policies are correctly applied
   - Check that the user has the correct role
   - Verify the service role key is set for admin operations

2. **Users not getting default roles**
   - Check the `handle_new_user()` trigger is active
   - Verify the trigger is attached to `auth.users`

3. **App settings not loading**
   - Ensure `is_public = true` for public settings
   - Check the `/api/app-settings` endpoint is accessible

4. **Migration fails**
   - Check for existing tables/constraints that might conflict
   - Review error messages in the SQL Editor
   - Ensure you're running the migration on a clean database

### Resetting the Database (Development Only)

If you need to start fresh:

1. **WARNING**: This will delete all data!
2. Go to Settings → Database
3. Click "Reset database"
4. Confirm the action
5. Re-run all migrations from Step 2

## Production Deployment

### Before Going Live

1. **Remove demo users** - Never use demo accounts in production
2. **Update passwords** - Change all default passwords
3. **Configure backups** - Enable point-in-time recovery
4. **Set up monitoring** - Configure alerts and logging
5. **Update redirect URLs** - Add your production domain
6. **Enable 2FA** - For all admin accounts
7. **Review RLS policies** - Ensure they match your security requirements

### Environment Variables

Production requires these environment variables:

```bash
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
VITE_APP_URL=https://your-domain.com
```

## Migration Management

### Adding New Migrations

1. Create a new file: `supabase/migrations/[number]_[description].sql`
2. Use sequential numbering (00003, 00004, etc.)
3. Make migrations idempotent (use `IF NOT EXISTS`, `IF EXISTS`)
4. Test in development before production

### Migration Best Practices

- Always use `IF NOT EXISTS` for creating objects
- Include rollback instructions in comments
- Document the purpose of each migration
- Test migrations on a fresh database
- Keep migrations small and focused

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

## Support

If you encounter issues:

1. Check the [Supabase Status Page](https://status.supabase.com)
2. Review the SQL Editor error messages
3. Check browser console for client-side errors
4. Verify environment variables are set correctly
5. Consult the Supabase Discord or GitHub discussions