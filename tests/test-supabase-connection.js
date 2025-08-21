import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('='.repeat(60));
console.log('SUPABASE CONNECTION TEST');
console.log('='.repeat(60));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test 1: Create anon client
console.log('\n1. Creating Supabase client with ANON key...');
let anonClient;
try {
  anonClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Anon client created successfully');
} catch (error) {
  console.error('❌ Failed to create anon client:', error.message);
}

// Test 2: Create service role client
console.log('\n2. Creating Supabase client with SERVICE ROLE key...');
let serviceClient;
try {
  serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Service role client created successfully');
} catch (error) {
  console.error('❌ Failed to create service role client:', error.message);
}

// Test 3: Test anon client connection
console.log('\n3. Testing ANON client connection...');
try {
  const { data, error } = await anonClient
    .from('app_settings')
    .select('setting_key')
    .eq('is_public', true)
    .limit(1);
  
  if (error) {
    console.error('❌ Anon client query failed:', error.message);
  } else {
    console.log('✅ Anon client can query public data');
    console.log('   Result:', data);
  }
} catch (error) {
  console.error('❌ Anon client connection error:', error.message);
}

// Test 4: Test service role client connection
console.log('\n4. Testing SERVICE ROLE client connection...');
try {
  const { data, error } = await serviceClient
    .from('app_settings')
    .select('setting_key')
    .limit(1);
  
  if (error) {
    console.error('❌ Service role client query failed:', error.message);
  } else {
    console.log('✅ Service role client can query data');
    console.log('   Result:', data);
  }
} catch (error) {
  console.error('❌ Service role client connection error:', error.message);
}

// Test 5: Test auth.admin functions with service role
console.log('\n5. Testing auth.admin functions with SERVICE ROLE...');
try {
  const { data, error } = await serviceClient.auth.admin.listUsers({
    page: 1,
    perPage: 1
  });
  
  if (error) {
    console.error('❌ Service role auth.admin failed:', error.message);
  } else {
    console.log('✅ Service role can use auth.admin functions');
    console.log('   User count:', data.users.length);
  }
} catch (error) {
  console.error('❌ Service role auth.admin error:', error.message);
}

// Test 6: Compare JWT claims
console.log('\n6. Comparing JWT token claims...');
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  } catch (error) {
    return null;
  }
}

const anonPayload = decodeJWT(supabaseAnonKey);
const servicePayload = decodeJWT(supabaseServiceKey);

console.log('Anon token claims:');
console.log('  Role:', anonPayload?.role);
console.log('  Project ref:', anonPayload?.ref);
console.log('  Issued at:', new Date(anonPayload?.iat * 1000).toISOString());

console.log('\nService token claims:');
console.log('  Role:', servicePayload?.role);
console.log('  Project ref:', servicePayload?.ref);
console.log('  Issued at:', new Date(servicePayload?.iat * 1000).toISOString());

if (anonPayload?.ref !== servicePayload?.ref) {
  console.error(`\n❌ CRITICAL: Token project refs don't match!`);
  console.error(`   Anon ref: ${anonPayload?.ref}`);
  console.error(`   Service ref: ${servicePayload?.ref}`);
} else {
  console.log('\n✅ Both tokens are for the same project');
}

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));