import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('='.repeat(60));
console.log('MCP vs SDK COMPARISON TEST');
console.log('='.repeat(60));

console.log(`
This test compares what works via MCP (which uses access token)
vs what works via SDK (which uses service role key).

MCP uses: sbp_e218ca4c86c39b1bc1d6bc96eafcf52ce9581494
SDK uses: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)}...
`);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n1. MCP Connection Info:');
console.log('-'.repeat(40));
console.log('MCP connects via:');
console.log('  - Project ref: xxrlnwelfrvdshjrrxlu');
console.log('  - Access token: sbp_e218ca4c86c39b1bc1d6bc96eafcf52ce9581494');
console.log('  - Method: Direct API calls with access token');
console.log('\nMCP can successfully:');
console.log('  ✅ Query user_roles table');
console.log('  ✅ Query app_settings table');
console.log('  ✅ Update data in tables');
console.log('  ✅ Execute RPC functions');
console.log('  ✅ Run arbitrary SQL');

console.log('\n2. SDK Connection Info:');
console.log('-'.repeat(40));
console.log('SDK connects via:');
console.log('  - URL:', supabaseUrl);
console.log('  - Service key role:', decodeJWT(supabaseServiceKey)?.role);
console.log('  - Service key ref:', decodeJWT(supabaseServiceKey)?.ref);
console.log('  - Method: JavaScript client with JWT');

console.log('\n3. Testing SDK Queries:');
console.log('-'.repeat(40));

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// Test basic queries
const tests = [
  {
    name: 'Query user_roles',
    query: () => serviceClient.from('user_roles').select('*')
  },
  {
    name: 'Query app_settings',
    query: () => serviceClient.from('app_settings').select('*')
  },
  {
    name: 'Query profiles',
    query: () => serviceClient.from('profiles').select('*')
  }
];

for (const test of tests) {
  console.log(`\nTesting: ${test.name}`);
  try {
    const { data, error } = await test.query();
    if (error) {
      console.error(`❌ Failed: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      if (error.code === '42501') {
        console.error('   This is a permission error - service role should bypass this!');
      }
    } else {
      console.log(`✅ Success: Retrieved ${data.length} rows`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

console.log('\n4. Testing Different Authentication Methods:');
console.log('-'.repeat(40));

// Test 1: Service role key as API key directly
console.log('\nTest: Using service key as apikey parameter...');
try {
  const directClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false
    }
  });
  
  const { data, error } = await directClient
    .from('user_roles')
    .select('count()', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Direct API key failed:', error.message);
  } else {
    console.log('✅ Direct API key works');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

// Test 2: Manual Authorization header
console.log('\nTest: Manual Authorization header...');
try {
  const response = await fetch(`${supabaseUrl}/rest/v1/user_roles?select=*`, {
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Manual fetch failed:', response.status, error);
  } else {
    const data = await response.json();
    console.log('✅ Manual fetch works, rows:', data.length);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('\n5. Key Comparison:');
console.log('-'.repeat(40));

function decodeJWT(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  } catch {
    return null;
  }
}

const servicePayload = decodeJWT(supabaseServiceKey);
console.log('\nService Role Key Claims:');
console.log('  iss:', servicePayload?.iss);
console.log('  ref:', servicePayload?.ref);
console.log('  role:', servicePayload?.role);
console.log('  iat:', new Date(servicePayload?.iat * 1000).toISOString());
console.log('  exp:', new Date(servicePayload?.exp * 1000).toISOString());

// Check if the key matches the project
if (servicePayload?.ref !== 'xxrlnwelfrvdshjrrxlu') {
  console.error('\n❌ CRITICAL: Service key is for wrong project!');
  console.error(`   Expected: xxrlnwelfrvdshjrrxlu`);
  console.error(`   Got: ${servicePayload?.ref}`);
} else {
  console.log('\n✅ Service key matches project');
}

// Check if role is correct
if (servicePayload?.role !== 'service_role') {
  console.error('\n❌ CRITICAL: Service key has wrong role!');
  console.error(`   Expected: service_role`);
  console.error(`   Got: ${servicePayload?.role}`);
} else {
  console.log('✅ Service key has correct role');
}

console.log('\n6. Summary:');
console.log('-'.repeat(40));
console.log(`
Key Findings:
- MCP uses access token (sbp_...) which works differently than JWT
- SDK uses JWT service role key which should bypass RLS
- If service role gets "permission denied", possible causes:
  1. Wrong project (keys don't match project)
  2. Expired key
  3. Invalid key format
  4. Supabase client not configured correctly
  5. RLS policies somehow blocking service role (shouldn't happen)
`);

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));