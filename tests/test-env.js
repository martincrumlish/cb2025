import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('='.repeat(60));
console.log('ENVIRONMENT VARIABLE TEST');
console.log('='.repeat(60));

// Test 1: Load .env.local
console.log('\n1. Loading .env.local file...');
const result = dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

if (result.error) {
  console.error('❌ Failed to load .env.local:', result.error);
} else {
  console.log('✅ Successfully loaded .env.local');
  console.log('   Parsed variables:', Object.keys(result.parsed).join(', '));
}

// Test 2: Check critical environment variables
console.log('\n2. Checking critical environment variables...');
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.error(`❌ ${varName}: NOT FOUND`);
  }
});

// Test 3: Check for duplicate SUPABASE_SERVICE_ROLE_KEY
console.log('\n3. Checking for duplicate keys in .env.local...');
import fs from 'fs';
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const lines = envContent.split('\n');
const keyCount = {};

lines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const key = line.split('=')[0];
    if (key) {
      keyCount[key] = (keyCount[key] || 0) + 1;
    }
  }
});

Object.entries(keyCount).forEach(([key, count]) => {
  if (count > 1) {
    console.error(`❌ Duplicate key found: ${key} appears ${count} times`);
  }
});

const hasDuplicates = Object.values(keyCount).some(count => count > 1);
if (!hasDuplicates) {
  console.log('✅ No duplicate keys found');
}

// Test 4: Verify JWT token structure
console.log('\n4. Verifying JWT token structure...');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  try {
    const parts = serviceKey.split('.');
    if (parts.length !== 3) {
      console.error(`❌ Invalid JWT format: expected 3 parts, got ${parts.length}`);
    } else {
      // Decode the payload (second part)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('✅ Valid JWT structure');
      console.log('   Payload:', JSON.stringify(payload, null, 2));
      
      // Check critical fields
      if (payload.role !== 'service_role') {
        console.error(`❌ Wrong role in JWT: expected 'service_role', got '${payload.role}'`);
      } else {
        console.log('✅ Correct role: service_role');
      }
      
      if (payload.ref !== 'xxrlnwelfrvdshjrrxlu') {
        console.error(`❌ Wrong project ref in JWT: expected 'xxrlnwelfrvdshjrrxlu', got '${payload.ref}'`);
      } else {
        console.log('✅ Correct project ref: xxrlnwelfrvdshjrrxlu');
      }
    }
  } catch (error) {
    console.error('❌ Failed to decode JWT:', error.message);
  }
} else {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
}

// Test 5: Check global process.env assignment (simulating vite.config.ts)
console.log('\n5. Testing global process.env assignment...');
global.process = global.process || { env: {} };
Object.assign(global.process.env, process.env);

if (global.process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('✅ Global process.env assignment works');
} else {
  console.error('❌ Global process.env assignment failed');
}

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));