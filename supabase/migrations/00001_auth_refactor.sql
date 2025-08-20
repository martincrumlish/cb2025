-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update user_roles to use auth.users UUID
-- First, let's modify the user_roles table to work with Supabase Auth
ALTER TABLE user_roles 
  ALTER COLUMN user_id TYPE UUID USING 
    CASE 
      WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN user_id::UUID 
      ELSE gen_random_uuid() 
    END;

-- Add foreign key constraint to auth.users
ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  -- Default role is 'user'
  INSERT INTO public.user_roles (user_id, email, role, status)
  VALUES (new.id, new.email, 'user', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to use auth.uid()
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

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

-- Update user_api_keys to work with UUIDs
ALTER TABLE user_api_keys 
  ALTER COLUMN user_id TYPE UUID USING 
    CASE 
      WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN user_id::UUID 
      ELSE gen_random_uuid() 
    END;

DROP POLICY IF EXISTS "Users can manage their own API keys" ON user_api_keys;
CREATE POLICY "Users can manage their own API keys" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Update user_metadata to work with UUIDs
ALTER TABLE user_metadata 
  ALTER COLUMN user_id TYPE UUID USING 
    CASE 
      WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN user_id::UUID 
      ELSE gen_random_uuid() 
    END;

DROP POLICY IF EXISTS "Users can view their own metadata" ON user_metadata;
CREATE POLICY "Users can view their own metadata" ON user_metadata
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own metadata" ON user_metadata;
CREATE POLICY "Users can update their own metadata" ON user_metadata
  FOR UPDATE USING (auth.uid() = user_id);

-- Update admin_audit_log to work with UUIDs
ALTER TABLE admin_audit_log 
  ALTER COLUMN admin_id TYPE UUID USING 
    CASE 
      WHEN admin_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN admin_id::UUID 
      ELSE gen_random_uuid() 
    END;

ALTER TABLE admin_audit_log 
  ALTER COLUMN target_id TYPE UUID USING 
    CASE 
      WHEN target_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN target_id::UUID 
      ELSE NULL 
    END;

-- Simplify admin checks
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_log;
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON admin_audit_log;
CREATE POLICY "System can insert audit logs" ON admin_audit_log
  FOR INSERT WITH CHECK (true);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create or update admin user for martincrumlish@gmail.com
-- This will be executed after the user signs up for the first time
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE user_roles 
  SET role = 'admin', status = 'active'
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatically make martincrumlish@gmail.com an admin when they sign up
CREATE OR REPLACE FUNCTION auto_admin_check()
RETURNS trigger AS $$
BEGIN
  IF NEW.email = 'martincrumlish@gmail.com' THEN
    UPDATE user_roles 
    SET role = 'admin', status = 'active'
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to automatically set admin role for specific email
DROP TRIGGER IF EXISTS check_auto_admin ON auth.users;
CREATE TRIGGER check_auto_admin
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auto_admin_check();