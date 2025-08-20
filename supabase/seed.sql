-- =====================================================
-- Development Seed Data
-- =====================================================
-- This file contains sample data for development/testing
-- DO NOT run this in production!
-- 
-- To use: Run this file in SQL Editor after initial setup
-- =====================================================

-- Create demo users with different roles
-- Password for all demo users: DemoPass123!

-- 1. Admin user
SELECT auth.admin_create_user(
  '{"email": "admin@demo.com", "password": "DemoPass123!", "email_confirm": true}'
);

-- 2. Regular user
SELECT auth.admin_create_user(
  '{"email": "user@demo.com", "password": "DemoPass123!", "email_confirm": true}'
);

-- 3. Another regular user
SELECT auth.admin_create_user(
  '{"email": "john.doe@demo.com", "password": "DemoPass123!", "email_confirm": true}'
);

-- 4. Moderator user
SELECT auth.admin_create_user(
  '{"email": "moderator@demo.com", "password": "DemoPass123!", "email_confirm": true}'
);

-- Wait a moment for triggers to create user_roles entries
-- Then update roles (default is 'user')
DO $$
BEGIN
  -- Adding a small delay to ensure triggers have completed
  PERFORM pg_sleep(1);
END $$;

-- Set admin role
UPDATE user_roles 
SET role = 'admin' 
WHERE email = 'admin@demo.com';

-- Set moderator role
UPDATE user_roles 
SET role = 'moderator' 
WHERE email = 'moderator@demo.com';

-- Update profiles with display names
UPDATE profiles SET full_name = 'Demo Admin' WHERE email = 'admin@demo.com';
UPDATE profiles SET full_name = 'Demo User' WHERE email = 'user@demo.com';
UPDATE profiles SET full_name = 'John Doe' WHERE email = 'john.doe@demo.com';
UPDATE profiles SET full_name = 'Demo Moderator' WHERE email = 'moderator@demo.com';

-- Add some user metadata
UPDATE user_metadata 
SET 
  display_name = 'Admin',
  bio = 'System administrator account for testing',
  preferences = '{"theme": "dark", "notifications": true}'::jsonb
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@demo.com');

UPDATE user_metadata 
SET 
  display_name = 'JohnD',
  bio = 'Regular user account for testing',
  preferences = '{"theme": "light", "notifications": false}'::jsonb
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'john.doe@demo.com');

-- Add sample API keys for admin (for testing settings page)
INSERT INTO user_api_keys (user_id, key_name, key_value)
SELECT 
  id,
  'openai_api_key',
  'sk-demo-key-not-real-just-for-testing'
FROM auth.users 
WHERE email = 'admin@demo.com'
ON CONFLICT (user_id, key_name) DO NOTHING;

INSERT INTO user_api_keys (user_id, key_name, key_value, sender_name, sender_email)
SELECT 
  id,
  'fal_api_key',
  'demo-fal-key-not-real',
  'Demo App',
  'noreply@demo.com'
FROM auth.users 
WHERE email = 'admin@demo.com'
ON CONFLICT (user_id, key_name) DO NOTHING;

-- Add sample app settings (optional - these are already in migration)
UPDATE app_settings 
SET setting_value = 'My Demo App' 
WHERE setting_key = 'app_name';

UPDATE app_settings 
SET setting_value = 'A demo application showcasing the boilerplate features' 
WHERE setting_key = 'app_description';

-- Create a sample audit log entry
INSERT INTO admin_audit_log (
  admin_user_id,
  admin_email,
  action,
  details
)
SELECT 
  id,
  'admin@demo.com',
  'seed_data_loaded',
  '{"message": "Development seed data has been loaded", "timestamp": "'|| NOW() ||'"}'::jsonb
FROM auth.users 
WHERE email = 'admin@demo.com';

-- Summary output
SELECT 
  'Seed data loaded successfully!' as message,
  COUNT(*) as users_created,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'moderator' THEN 1 END) as moderators,
  COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users
FROM user_roles
WHERE email LIKE '%@demo.com';