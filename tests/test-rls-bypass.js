import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('='.repeat(60));
console.log('RLS BYPASS TEST');
console.log('='.repeat(60));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// Get the admin user ID
const adminUserId = 'e99ec6df-1fdd-4ef6-875c-2618bc9696f6'; // From our test user creation

console.log('\nTest setup:');
console.log(`  Admin user ID: ${adminUserId}`);
console.log(`  Supabase URL: ${supabaseUrl}`);

// Test 1: Query user_roles with ANON key (should be limited by RLS)
console.log('\n1. Query user_roles table with ANON key...');
try {
  const { data, error } = await anonClient
    .from('user_roles')
    .select('*');
  
  if (error) {
    console.log(`⚠️  Anon client error (expected): ${error.message}`);
    console.log('   This is expected if RLS is working');
  } else {
    console.log(`✅ Anon client returned ${data.length} rows`);
    if (data.length > 0) {
      console.log('   Sample:', data[0]);
    }
  }
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
}

// Test 2: Query user_roles with SERVICE ROLE key (should bypass RLS)
console.log('\n2. Query user_roles table with SERVICE ROLE key...');
try {
  const { data, error } = await serviceClient
    .from('user_roles')
    .select('*');
  
  if (error) {
    console.error('❌ Service role query failed:', error);
    console.error('   Full error:', JSON.stringify(error, null, 2));
    console.error('   THIS SHOULD NOT HAPPEN - Service role should bypass RLS!');
  } else {
    console.log(`✅ Service role returned ${data.length} rows (bypassed RLS)`);
    data.forEach(row => {
      console.log(`   - ${row.email}: ${row.role} (${row.status})`);
    });
  }
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
}

// Test 3: Query specific user role with SERVICE ROLE
console.log('\n3. Query specific user role with SERVICE ROLE...');
try {
  const { data, error } = await serviceClient
    .from('user_roles')
    .select('role, status')
    .eq('user_id', adminUserId)
    .single();
  
  if (error) {
    console.error('❌ Service role specific query failed:', error);
    console.error('   Full error:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Service role can query specific user');
    console.log('   Result:', data);
  }
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
}

// Test 4: Query app_settings with both clients
console.log('\n4. Query app_settings with ANON key (public only)...');
try {
  const { data, error } = await anonClient
    .from('app_settings')
    .select('*')
    .eq('is_public', true);
  
  if (error) {
    console.error('❌ Anon query failed:', error.message);
  } else {
    console.log(`✅ Anon client returned ${data.length} public settings`);
  }
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
}

console.log('\n5. Query app_settings with SERVICE ROLE (all settings)...');
try {
  const { data, error } = await serviceClient
    .from('app_settings')
    .select('*');
  
  if (error) {
    console.error('❌ Service role query failed:', error.message);
  } else {
    console.log(`✅ Service role returned ${data.length} total settings`);
  }
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
}

// Test 5: Update app_settings with SERVICE ROLE
console.log('\n6. Update app_settings with SERVICE ROLE...');
try {
  const testValue = `Test ${Date.now()}`;
  const { data, error } = await serviceClient
    .from('app_settings')
    .update({ 
      setting_value: testValue,
      updated_at: new Date().toISOString()
    })
    .eq('setting_key', 'app_name')
    .select();
  
  if (error) {
    console.error('❌ Service role update failed:', error);
    console.error('   Full error:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Service role can update settings');
    console.log('   Updated to:', testValue);
  }
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
}

// Test 6: Test auth context
console.log('\n7. Test auth context with SERVICE ROLE...');
try {
  // First, let's check if we can get the current user (should be null for service role)
  const { data: { user }, error } = await serviceClient.auth.getUser();
  
  if (error) {
    console.log('⚠️  No auth user (expected for service role):', error.message);
  } else if (user) {
    console.log('❓ Unexpected user found:', user.email);
  } else {
    console.log('✅ Service role has no auth user (correct)');
  }
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
}

// Test 7: Raw SQL query to check if service role works
console.log('\n8. Raw SQL query with SERVICE ROLE...');
try {
  const { data, error } = await serviceClient.rpc('update_user_role', {
    target_user_id: adminUserId,
    new_role: 'admin'
  });
  
  if (error) {
    console.error('❌ RPC call failed:', error);
    if (error.message.includes('does not exist')) {
      console.log('   Note: RPC function might not exist');
    }
  } else {
    console.log('✅ RPC call succeeded');
  }
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));