import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('EMAIL SETTINGS TEST');
console.log('='.repeat(40));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = 'e99ec6df-1fdd-4ef6-875c-2618bc9696f6'; // admin user

// Test 1: Check what's in the database
console.log('\n1. Checking raw database content:');
const { data: allKeys, error: allError } = await supabase
  .from('user_api_keys')
  .select('*')
  .eq('user_id', userId);

if (allError) {
  console.error('Error:', allError);
} else {
  console.log('All keys for user:', allKeys);
}

// Test 2: Query exactly like the email library does
console.log('\n2. Query like email library:');
const { data: keys, error } = await supabase
  .from('user_api_keys')
  .select('key_name, key_value')
  .eq('user_id', userId)
  .in('key_name', ['sender_name', 'sender_email', 'resend_api_key', 'sender_domain']);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Email settings keys:', keys);
  
  if (keys && keys.length > 0) {
    const settings = {};
    keys.forEach(key => {
      settings[key.key_name] = key.key_value;
    });
    
    console.log('\nParsed settings:');
    console.log('  sender_name:', settings.sender_name || 'NOT SET');
    console.log('  sender_email:', settings.sender_email || 'NOT SET');
    console.log('  resend_api_key:', settings.resend_api_key ? settings.resend_api_key.substring(0, 10) + '...' : 'NOT SET');
    console.log('  sender_domain:', settings.sender_domain || 'NOT SET');
    
    // Check if all required fields are present
    const hasAllRequired = settings.sender_name && settings.sender_email && settings.resend_api_key;
    console.log('\nHas all required fields:', hasAllRequired);
  }
}

// Test 3: Check table permissions
console.log('\n3. Testing with authenticated user (simulating logged-in user):');
// The anon key with a user context should work
const { data: authTest, error: authError } = await supabase
  .from('user_api_keys')
  .select('count()', { count: 'exact', head: true });

if (authError) {
  console.error('Permission error:', authError);
} else {
  console.log('Can access user_api_keys table: YES');
}