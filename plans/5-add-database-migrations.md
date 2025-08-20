# 5. Add Database Migrations

## Problem Statement
Database schema changes are currently unmanaged:
- No version control for database schema
- Manual SQL execution for schema changes
- No rollback capability
- No migration history
- Risk of schema drift between environments
- Difficult to onboard new developers

## Proposed Solution
Implement proper database migration system using Supabase CLI with:
- Version-controlled migrations
- Automated migration running
- Rollback capabilities
- Migration history tracking
- Schema diffing
- Seed data management

## Implementation Steps

### Step 1: Install Supabase CLI

```bash
# Install Supabase CLI
npm install -D supabase

# Or install globally
npm install -g supabase

# Initialize Supabase in the project
npx supabase init
```

### Step 2: Configure Supabase Project

Create `supabase/config.toml`:
```toml
# Supabase project configuration
[project]
id = "your-project-ref"

[api]
enabled = true
port = 54321
schemas = ["public", "auth", "storage"]

[db]
port = 54322
shadow_database_url = "postgresql://postgres:postgres@localhost:54320/postgres"

[db.pooler]
enabled = false
port = 54329

[studio]
enabled = true
port = 54323

[auth]
site_url = "http://localhost:8080"
additional_redirect_urls = ["http://localhost:8080/auth/callback"]

[auth.email]
enable_signup = true
enable_confirmations = true

[storage]
enabled = true

[functions]
enabled = true
```

### Step 3: Create Initial Migration

```bash
# Create migration for existing schema
npx supabase db diff --use-migra initial_schema --file supabase/migrations/00001_initial_schema.sql

# Or manually create migration
npx supabase migration new initial_schema
```

Create `supabase/migrations/00001_initial_schema.sql`:
```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'moderator')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
    invited_by TEXT,
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_api_keys table
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL,
    key_name TEXT NOT NULL,
    key_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key_name)
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT true,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_audit_log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    target_email TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_metadata table
CREATE TABLE IF NOT EXISTS public.user_metadata (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    preferences JSONB DEFAULT '{}',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_status ON user_roles(status);
CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_metadata_updated_at BEFORE UPDATE ON user_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 4: Create RLS Policies Migration

Create `supabase/migrations/00002_rls_policies.sql`:
```sql
-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metadata ENABLE ROW LEVEL SECURITY;

-- User Roles Policies
CREATE POLICY "Users can view their own role" ON user_roles
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
            AND status = 'active'
        )
    );

CREATE POLICY "Admins can manage roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
            AND status = 'active'
        )
    );

-- User API Keys Policies
CREATE POLICY "Users can manage their own API keys" ON user_api_keys
    FOR ALL USING (auth.uid()::text = user_id);

-- App Settings Policies
CREATE POLICY "Public settings are viewable by everyone" ON app_settings
    FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can manage app settings" ON app_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
            AND status = 'active'
        )
    );

-- Admin Audit Log Policies
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
            AND status = 'active'
        )
    );

CREATE POLICY "System can insert audit logs" ON admin_audit_log
    FOR INSERT WITH CHECK (true);

-- User Metadata Policies
CREATE POLICY "Users can view their own metadata" ON user_metadata
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own metadata" ON user_metadata
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all metadata" ON user_metadata
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()::text
            AND role = 'admin'
            AND status = 'active'
        )
    );
```

### Step 5: Create Seed Data Migration

Create `supabase/migrations/00003_seed_data.sql`:
```sql
-- Insert default app settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES 
    ('app_name', 'AICoder 2025', 'string', 'Application name', true),
    ('app_description', 'Modern AI-powered development codebase', 'string', 'Application description', true),
    ('app_logo_url', '', 'string', 'Application logo URL', true),
    ('app_favicon_url', '', 'string', 'Application favicon URL', true),
    ('maintenance_mode', 'false', 'boolean', 'Maintenance mode flag', true),
    ('signup_enabled', 'true', 'boolean', 'Allow new user signups', false),
    ('max_api_calls_per_hour', '100', 'number', 'API rate limit per hour', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default admin user (replace with your Clerk user ID)
-- This should be done conditionally in production
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin' LIMIT 1) THEN
        INSERT INTO user_roles (user_id, email, role, status)
        VALUES ('REPLACE_WITH_YOUR_CLERK_USER_ID', 'admin@example.com', 'admin', 'active');
    END IF;
END $$;
```

### Step 6: Create Migration Runner Script

Create `scripts/run-migrations.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { serverEnv } from '@/env/server';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

class MigrationRunner {
  private supabase;
  
  constructor() {
    this.supabase = createClient(
      serverEnv.supabase.url,
      serverEnv.supabase.serviceRoleKey
    );
  }
  
  async run() {
    console.log('🚀 Starting database migrations...');
    
    // Create migrations table if it doesn't exist
    await this.createMigrationsTable();
    
    // Get applied migrations
    const appliedMigrations = await this.getAppliedMigrations();
    
    // Get pending migrations
    const pendingMigrations = await this.getPendingMigrations(appliedMigrations);
    
    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date!');
      return;
    }
    
    // Apply pending migrations
    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }
    
    console.log('✅ All migrations completed successfully!');
  }
  
  private async createMigrationsTable() {
    const { error } = await this.supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (error) throw error;
  }
  
  private async getAppliedMigrations(): Promise<Set<number>> {
    const { data, error } = await this.supabase
      .from('migrations')
      .select('version');
    
    if (error) throw error;
    
    return new Set(data?.map(m => m.version) || []);
  }
  
  private async getPendingMigrations(applied: Set<number>): Promise<Migration[]> {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    const migrations: Migration[] = [];
    
    for (const file of files) {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) continue;
      
      const version = parseInt(match[1]);
      const name = match[2];
      
      if (applied.has(version)) continue;
      
      const sql = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf-8'
      );
      
      migrations.push({ version, name, sql });
    }
    
    return migrations;
  }
  
  private async applyMigration(migration: Migration) {
    console.log(`📝 Applying migration ${migration.version}: ${migration.name}`);
    
    try {
      // Begin transaction
      await this.supabase.rpc('exec_sql', { sql: 'BEGIN;' });
      
      // Apply migration
      await this.supabase.rpc('exec_sql', { sql: migration.sql });
      
      // Record migration
      await this.supabase
        .from('migrations')
        .insert({
          version: migration.version,
          name: migration.name,
        });
      
      // Commit transaction
      await this.supabase.rpc('exec_sql', { sql: 'COMMIT;' });
      
      console.log(`✅ Migration ${migration.version} applied successfully`);
    } catch (error) {
      // Rollback transaction
      await this.supabase.rpc('exec_sql', { sql: 'ROLLBACK;' });
      
      console.error(`❌ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }
}

// Run migrations
const runner = new MigrationRunner();
runner.run().catch(console.error);
```

### Step 7: Add Migration Commands

Update `package.json`:
```json
{
  "scripts": {
    "db:migrate": "npx supabase migration up",
    "db:migrate:create": "npx supabase migration new",
    "db:migrate:status": "npx supabase migration list",
    "db:reset": "npx supabase db reset",
    "db:seed": "npx tsx scripts/seed.ts",
    "db:diff": "npx supabase db diff --use-migra",
    "db:push": "npx supabase db push",
    "db:pull": "npx supabase db pull",
    "db:backup": "npx supabase db dump -f backup.sql"
  }
}
```

### Step 8: Create Seed Script

Create `scripts/seed.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { serverEnv } from '@/env/server';

const supabase = createClient(
  serverEnv.supabase.url,
  serverEnv.supabase.serviceRoleKey
);

async function seed() {
  console.log('🌱 Seeding database...');
  
  // Seed users
  const users = Array.from({ length: 10 }, () => ({
    user_id: faker.string.uuid(),
    email: faker.internet.email(),
    role: faker.helpers.arrayElement(['user', 'moderator']),
    status: faker.helpers.arrayElement(['active', 'inactive']),
  }));
  
  const { error: usersError } = await supabase
    .from('user_roles')
    .insert(users);
  
  if (usersError) {
    console.error('Error seeding users:', usersError);
  } else {
    console.log(`✅ Seeded ${users.length} users`);
  }
  
  // Seed other data...
  
  console.log('✅ Seeding completed!');
}

seed().catch(console.error);
```

### Step 9: Setup Local Development

Create `supabase/seed.sql`:
```sql
-- Local development seed data
-- This file is run automatically when you run `supabase start`

-- Insert test users
INSERT INTO user_roles (user_id, email, role, status) VALUES
    ('test_admin', 'admin@test.com', 'admin', 'active'),
    ('test_user', 'user@test.com', 'user', 'active'),
    ('test_mod', 'mod@test.com', 'moderator', 'active')
ON CONFLICT DO NOTHING;

-- Insert test API keys
INSERT INTO user_api_keys (user_id, key_name, key_value) VALUES
    ('test_user', 'openai', 'sk-test-key'),
    ('test_user', 'fal_ai', 'test:key')
ON CONFLICT DO NOTHING;
```

### Step 10: Create Migration Documentation

Create `docs/MIGRATIONS.md`:
```markdown
# Database Migrations Guide

## Overview
We use Supabase CLI for database migrations, providing:
- Version control for schema changes
- Automated migration running
- Rollback capabilities
- Environment consistency

## Creating Migrations

```bash
# Create a new migration
npm run db:migrate:create my_migration_name

# This creates: supabase/migrations/[timestamp]_my_migration_name.sql
```

## Running Migrations

```bash
# Apply all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Reset database (WARNING: destructive)
npm run db:reset
```

## Migration Best Practices

1. **Always test locally first**
   ```bash
   npx supabase start  # Start local Supabase
   npm run db:migrate  # Test migrations
   ```

2. **Make migrations idempotent**
   ```sql
   -- Good: Won't fail if table exists
   CREATE TABLE IF NOT EXISTS users (...);
   
   -- Good: Won't fail if column exists
   ALTER TABLE users ADD COLUMN IF NOT EXISTS age INT;
   ```

3. **Use transactions for data migrations**
   ```sql
   BEGIN;
   -- Your migration logic
   COMMIT;
   ```

4. **Never modify old migrations**
   - Create new migrations to fix issues
   - Old migrations are historical record

## Deployment Process

1. Test migrations locally
2. Review migration SQL
3. Deploy to staging
4. Verify staging
5. Deploy to production

## Rollback Strategy

```bash
# Create a down migration
npm run db:migrate:create rollback_feature_x

# In the migration file:
-- Undo the changes from the previous migration
DROP TABLE IF EXISTS feature_x;
```

## Common Tasks

### Add a new table
```sql
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Add a column
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT;
```

### Create an index
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS 
idx_users_email ON users(email);
```

### Add RLS policy
```sql
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);
```
```

## Migration Checklist
- [ ] Install Supabase CLI
- [ ] Initialize Supabase project
- [ ] Create initial schema migration
- [ ] Create RLS policies migration
- [ ] Create seed data migration
- [ ] Setup migration runner script
- [ ] Add migration commands to package.json
- [ ] Create seed script
- [ ] Setup local development
- [ ] Document migration process
- [ ] Test migrations locally
- [ ] Setup CI/CD migration running
- [ ] Create rollback procedures

## Benefits After Implementation
- Version-controlled database schema
- Reproducible database state
- Easy rollbacks
- Better team collaboration
- Automated deployment process
- No more manual SQL execution
- Clear migration history
- Easier debugging of schema issues