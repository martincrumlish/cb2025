import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('CLIENT AUTH TEST');
console.log('='.repeat(40));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Create client like the app does
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// First, sign in as admin
console.log('\n1. Signing in as admin@example.com...');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'Password01'
});

if (authError) {
  console.error('Sign in failed:', authError);
  process.exit(1);
}

console.log('✅ Signed in successfully');
console.log('User ID:', authData.user.id);

// Now test the query
console.log('\n2. Testing query for user_api_keys...');
const userId = authData.user.id;

const { data: keys, error } = await supabase
  .from('user_api_keys')
  .select('key_name, key_value')
  .eq('user_id', userId)
  .in('key_name', ['sender_name', 'sender_email', 'resend_api_key', 'sender_domain']);

if (error) {
  console.error('❌ Query failed:', error);
} else {
  console.log('✅ Query succeeded');
  console.log('Results:', keys);
  
  if (keys && keys.length > 0) {
    console.log('\nEmail settings found:');
    keys.forEach(k => {
      const value = k.key_name === 'resend_api_key' 
        ? k.key_value.substring(0, 10) + '...' 
        : k.key_value;
      console.log(`  ${k.key_name}: ${value}`);
    });
  } else {
    console.log('⚠️  No email settings found for this user');
  }
}

// Also test a direct query
console.log('\n3. Testing direct query for all user_api_keys...');
const { data: allKeys, error: allError } = await supabase
  .from('user_api_keys')
  .select('*')
  .eq('user_id', userId);

if (allError) {
  console.error('❌ Direct query failed:', allError);
} else {
  console.log('✅ Direct query succeeded');
  console.log('Total rows for user:', allKeys?.length || 0);
}

// Sign out
await supabase.auth.signOut();
console.log('\n✅ Signed out');