import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('='.repeat(60));
console.log('ADMIN OPERATIONS TEST');
console.log('='.repeat(60));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// This simulates exactly what the API endpoints do
console.log('\nSimulating API endpoint behavior...');

// Simulate api/admin-users.ts
console.log('\n1. SIMULATE api/admin-users.ts');
console.log('-'.repeat(40));

// Create clients exactly like the API does
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

console.log('Anon client created:', !!supabase);
console.log('Service client created:', !!supabaseAdmin);
console.log('Service key exists:', !!supabaseServiceKey);
console.log('Service key length:', supabaseServiceKey?.length);

const adminUserId = 'e99ec6df-1fdd-4ef6-875c-2618bc9696f6';

// Exactly replicate the admin check from the API
console.log('\n2. Verify admin permissions (as API does)...');
if (!supabaseAdmin) {
  console.error('❌ Service role key not available');
} else {
  try {
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, status')
      .eq('user_id', adminUserId)
      .single();

    if (roleError) {
      console.error('❌ Admin check error:', roleError);
      console.error('   Code:', roleError.code);
      console.error('   Message:', roleError.message);
      console.error('   Details:', roleError.details);
      console.error('   Hint:', roleError.hint);
    } else {
      console.log('✅ Admin check succeeded');
      console.log('   Role data:', roleData);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Simulate api/app-settings.ts operations
console.log('\n3. SIMULATE api/app-settings.ts - GET');
console.log('-'.repeat(40));

// Get all app settings (admin access)
if (supabaseAdmin) {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('setting_key, setting_value, setting_type, description')
      .order('setting_key');

    if (error) {
      console.error('❌ Failed to get app settings:', error);
    } else {
      console.log('✅ Successfully loaded app settings');
      console.log('   Settings count:', data.length);
      data.forEach(item => {
        console.log(`   - ${item.setting_key}: ${item.setting_value || '(empty)'}`);
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

console.log('\n4. SIMULATE api/app-settings.ts - UPDATE');
console.log('-'.repeat(40));

// Update app settings (admin access)
if (supabaseAdmin) {
  const updates = {
    app_name: 'Test App Name',
    app_description: 'Test Description'
  };

  for (const [key, value] of Object.entries(updates)) {
    try {
      const { data: existingData, error: checkError } = await supabaseAdmin
        .from('app_settings')
        .select('id')
        .eq('setting_key', key)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`❌ Error checking ${key}:`, checkError);
        continue;
      }

      let result;
      if (existingData) {
        // Update existing
        result = await supabaseAdmin
          .from('app_settings')
          .update({ 
            setting_value: value,
            updated_by: adminUserId,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', key);
      } else {
        // Insert new
        result = await supabaseAdmin
          .from('app_settings')
          .insert({
            setting_key: key,
            setting_value: value,
            setting_type: 'string',
            description: `Setting for ${key}`,
            is_public: true,
            updated_by: adminUserId
          });
      }

      if (result.error) {
        console.error(`❌ Failed to update ${key}:`, result.error);
      } else {
        console.log(`✅ Successfully updated ${key} to "${value}"`);
      }
    } catch (error) {
      console.error(`❌ Unexpected error updating ${key}:`, error);
    }
  }
}

// Test with different client configurations
console.log('\n5. TEST DIFFERENT CLIENT CONFIGURATIONS');
console.log('-'.repeat(40));

// Test 1: Service client with explicit auth header
console.log('\nTest with explicit auth header...');
try {
  const clientWithHeader = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`
      }
    }
  });

  const { data, error } = await clientWithHeader
    .from('user_roles')
    .select('role')
    .eq('user_id', adminUserId)
    .single();

  if (error) {
    console.error('❌ Query with explicit header failed:', error.message);
  } else {
    console.log('✅ Query with explicit header succeeded:', data);
  }
} catch (error) {
  console.error('❌ Unexpected error:', error);
}

// Test 2: Service client with different auth config
console.log('\nTest with different auth config...');
try {
  const clientNoAuth = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false
    }
  });

  const { data, error } = await clientNoAuth
    .from('user_roles')
    .select('role')
    .eq('user_id', adminUserId)
    .single();

  if (error) {
    console.error('❌ Query with no auth config failed:', error.message);
  } else {
    console.log('✅ Query with no auth config succeeded:', data);
  }
} catch (error) {
  console.error('❌ Unexpected error:', error);
}

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));