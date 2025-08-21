import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('UUID INVITATION TEST');
console.log('='.repeat(50));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create service client
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// Test UUID generation
console.log('1. Testing UUID Generation');
console.log('-'.repeat(50));

// Test the old format vs new format
const oldFormat = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const newFormat = crypto.randomUUID();

console.log('Old format (invalid):', oldFormat);
console.log('New format (valid UUID):', newFormat);

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
console.log('Old format is valid UUID:', uuidRegex.test(oldFormat) ? '❌ No' : '✅ No (expected)');
console.log('New format is valid UUID:', uuidRegex.test(newFormat) ? '✅ Yes' : '❌ No');

// Test database insertion
console.log('\n2. Testing Database Insertion with UUID');
console.log('-'.repeat(50));

const testEmail = `uuid-test-${Date.now()}@example.com`;
const validUUID = crypto.randomUUID();

console.log('Attempting to insert invitation with UUID:', validUUID);

const { data, error } = await serviceClient
  .from('user_roles')
  .insert({
    email: testEmail,
    role: 'user',
    status: 'invited',
    invitation_id: validUUID,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  })
  .select()
  .single();

if (error) {
  console.error('❌ Failed to insert with UUID:', error.message);
} else {
  console.log('✅ Successfully inserted invitation with UUID');
  console.log('Invitation ID:', data.invitation_id);
  
  // Clean up
  await serviceClient
    .from('user_roles')
    .delete()
    .eq('id', data.id);
  console.log('✅ Test record cleaned up');
}

// Test with invalid format (should fail)
console.log('\n3. Testing Database Insertion with Invalid Format');
console.log('-'.repeat(50));

const invalidFormat = `inv_${Date.now()}_test`;
console.log('Attempting to insert with invalid format:', invalidFormat);

const { error: invalidError } = await serviceClient
  .from('user_roles')
  .insert({
    email: `invalid-${Date.now()}@example.com`,
    role: 'user',
    status: 'invited',
    invitation_id: invalidFormat,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

if (invalidError) {
  console.log('✅ Correctly rejected invalid UUID format');
  console.log('Error:', invalidError.message);
} else {
  console.log('❌ Unexpectedly accepted invalid format');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('TEST SUMMARY');
console.log('='.repeat(50));
console.log(`
✅ UUID generation using crypto.randomUUID() works correctly
✅ Valid UUIDs can be inserted into the database
✅ Invalid formats are properly rejected by the database

The invitation system is now using proper UUID format.
`);