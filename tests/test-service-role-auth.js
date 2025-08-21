import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('='.repeat(60));
console.log('SERVICE ROLE AUTHENTICATION TEST');
console.log('='.repeat(60));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n1. Testing what auth.jwt() returns for each client...');
console.log('-'.repeat(40));

// Test with raw SQL to see what auth.jwt() returns
async function testAuthJWT(client, clientType) {
  console.log(`\nTesting ${clientType}:`);
  try {
    // Use raw SQL to check what auth.jwt() returns
    const { data, error } = await client.rpc('get_auth_jwt', {});
    
    if (error) {
      // Function doesn't exist, create it temporarily
      console.log('Creating helper function...');
      
      // Try to execute raw SQL (this will fail for anon but might work for service)
      const createResult = await client.from('user_roles').select('count()').limit(0);
      
      if (createResult.error) {
        console.log(`Cannot test auth.jwt() - ${createResult.error.message}`);
      }
    } else {
      console.log('auth.jwt() returns:', data);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

await testAuthJWT(anonClient, 'ANON client');
await testAuthJWT(serviceClient, 'SERVICE client');

console.log('\n2. Testing manual HTTP requests with different headers...');
console.log('-'.repeat(40));

// Test 1: Service key in Authorization header only
console.log('\nTest: Service key in Authorization header only');
try {
  const response = await fetch(`${supabaseUrl}/rest/v1/user_roles?select=count`, {
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Response status:', response.status);
  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', error);
  }
} catch (error) {
  console.error('Failed:', error.message);
}

// Test 2: Service key in apikey header only
console.log('\nTest: Service key in apikey header only');
try {
  const response = await fetch(`${supabaseUrl}/rest/v1/user_roles?select=count`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Response status:', response.status);
  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', error);
  }
} catch (error) {
  console.error('Failed:', error.message);
}

// Test 3: Service key in both headers (how Supabase JS client does it)
console.log('\nTest: Service key in both Authorization and apikey headers');
try {
  const response = await fetch(`${supabaseUrl}/rest/v1/user_roles?select=count`, {
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Response status:', response.status);
  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', error);
  } else {
    const data = await response.json();
    console.log('Success! Data:', data);
  }
} catch (error) {
  console.error('Failed:', error.message);
}

// Test 4: Anon key in apikey, service key in Authorization
console.log('\nTest: Anon in apikey, Service in Authorization');
try {
  const response = await fetch(`${supabaseUrl}/rest/v1/user_roles?select=count`, {
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Response status:', response.status);
  if (!response.ok) {
    const error = await response.text();
    console.error('Error:', error);
  } else {
    const data = await response.json();
    console.log('Success! Data:', data);
  }
} catch (error) {
  console.error('Failed:', error.message);
}

console.log('\n3. THE KEY FINDING:');
console.log('-'.repeat(40));
console.log(`
Based on Supabase documentation:
- The 'apikey' header is ALWAYS required (can be anon or service)
- The 'Authorization' header determines the actual auth context
- Service role key in Authorization should bypass RLS

If service role is getting "permission denied":
1. The apikey header might be missing
2. The service role key might not be in the Authorization header
3. The Supabase JS client might not be sending the right headers
`);

console.log('\n4. Testing Supabase client configuration...');
console.log('-'.repeat(40));

// Test different client configurations
const configs = [
  {
    name: 'Default config',
    options: {}
  },
  {
    name: 'With global headers',
    options: {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`
        }
      }
    }
  },
  {
    name: 'With auth persistSession false',
    options: {
      auth: {
        persistSession: false
      }
    }
  },
  {
    name: 'With db schema public',
    options: {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false
      }
    }
  }
];

for (const config of configs) {
  console.log(`\nTesting: ${config.name}`);
  try {
    const client = createClient(supabaseUrl, supabaseServiceKey, config.options);
    const { data, error } = await client
      .from('user_roles')
      .select('count()', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ Failed: ${error.message}`);
    } else {
      console.log(`✅ Success!`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));