import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('TESTING CORRECT INVITATION');
console.log('='.repeat(60));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Create client like the frontend does
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Use the actual invitation from the database
const correctInvitationId = 'abbea04c-5566-4bd0-88ca-03f77a545a24';
const email = 'martincrumlish@gmail.com';

console.log('\n1. Testing Correct Invitation');
console.log('-'.repeat(60));
console.log('Invitation ID:', correctInvitationId);
console.log('Email:', email);

// Test the exact query the frontend uses
const { data, error } = await supabase
  .from('user_roles')
  .select('*')
  .eq('invitation_id', correctInvitationId)
  .eq('email', email)
  .eq('status', 'invited')
  .single();

if (error) {
  console.error('❌ Query failed:', error.message);
} else {
  console.log('✅ Invitation found successfully!');
  console.log('  Email:', data.email);
  console.log('  Status:', data.status);
  console.log('  Role:', data.role);
  console.log('  Expires:', new Date(data.expires_at).toLocaleString());
  
  // Check if expired
  const isExpired = new Date(data.expires_at) < new Date();
  console.log('  Expired:', isExpired ? '❌ Yes' : '✅ No');
}

console.log('\n2. Correct URL to Use');
console.log('-'.repeat(60));
const correctUrl = `http://localhost:8080/sign-up?invitation=${correctInvitationId}&email=${encodeURIComponent(email)}`;
console.log('✅ Use this URL:');
console.log(correctUrl);

console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`
The issue was that you were using an old/incorrect invitation ID.
The correct invitation ID from the database is: ${correctInvitationId}

Please use this URL to sign up:
${correctUrl}
`);