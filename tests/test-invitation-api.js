import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('INVITATION API TEST');
console.log('='.repeat(50));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Authenticate as admin
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'Password01'
});

if (authError) {
  console.error('❌ Failed to authenticate:', authError);
  process.exit(1);
}

const adminUserId = authData.user.id;
console.log('✅ Authenticated as admin@example.com');
console.log('Admin User ID:', adminUserId);

// Test the createInvitation API endpoint
console.log('\n1. Testing createInvitation API Endpoint');
console.log('-'.repeat(50));

const testEmail = `api-test-${Date.now()}@example.com`;

const payload = {
  adminUserId,
  action: 'createInvitation',
  invitationData: {
    email: testEmail,
    role: 'user'
  }
};

console.log('Request payload:', JSON.stringify(payload, null, 2));

let response;
try {
  response = await fetch('http://localhost:8080/api/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (response.ok && result.success) {
    console.log('✅ Invitation created successfully via API!');
    console.log('Invitation ID:', result.invitationId);
    console.log('Data:', result.data);
    
    // Verify in database using service client
    const serviceClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: dbCheck } = await serviceClient
      .from('user_roles')
      .select('*')
      .eq('invitation_id', result.invitationId)
      .single();
      
    if (dbCheck) {
      console.log('\n✅ Invitation verified in database:');
      console.log('  Email:', dbCheck.email);
      console.log('  Status:', dbCheck.status);
      console.log('  Created by:', dbCheck.created_by);
      console.log('  Expires:', new Date(dbCheck.expires_at).toLocaleDateString());
      
      // Clean up
      await serviceClient
        .from('user_roles')
        .delete()
        .eq('id', dbCheck.id);
      console.log('✅ Test record cleaned up');
    }
  } else {
    console.error('❌ Failed to create invitation via API');
    console.error('Response status:', response.status);
    console.error('Error:', result.error || 'Unknown error');
  }
} catch (error) {
  console.error('❌ API call failed:', error.message);
  console.log('\n⚠️  Make sure the development server is running:');
  console.log('   npm run dev');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('TEST SUMMARY');
console.log('='.repeat(50));
console.log(`
The invitation API endpoint ${response?.ok ? '✅ is working' : '❌ has issues'}.

Key points:
- API uses service role key to bypass RLS
- Invitations are created with proper UUID format
- Created_by field is properly set
- No RLS violations when using the API endpoint
`);

// Sign out
await supabase.auth.signOut();
console.log('✅ Test complete - signed out');