-- Migration: Add CASCADE DELETE constraints for complete user deletion
-- This ensures when a user is deleted from auth.users, all their data is automatically removed

-- Add CASCADE DELETE to user_api_keys table
ALTER TABLE user_api_keys 
  DROP CONSTRAINT IF EXISTS user_api_keys_user_id_fkey;

ALTER TABLE user_api_keys 
  ADD CONSTRAINT user_api_keys_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add proper foreign key with CASCADE DELETE to user_metadata table
ALTER TABLE user_metadata 
  DROP CONSTRAINT IF EXISTS user_metadata_user_id_fkey;

ALTER TABLE user_metadata 
  ADD CONSTRAINT user_metadata_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Note: admin_audit_log intentionally does NOT cascade delete
-- This preserves the audit trail of admin actions even after user deletion
-- The admin_user_id and target_user_id columns will remain as historical references

-- Verify existing CASCADE DELETE constraints are in place
-- These should already exist from the initial migration:
-- - profiles table: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
-- - user_roles table: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE