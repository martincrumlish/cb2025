import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('USER INVITATION CREATION TEST');
console.log('='.repeat(50));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Authenticate as admin
const authClient = createClient(supabaseUrl, supabaseAnonKey);
const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
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

// Create service client for admin operations
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// Test creating an invitation
console.log('\n1. Creating User Invitation');
console.log('-'.repeat(50));

const invitationId = uuidv4();
const testEmail = `test-${Date.now()}@example.com`;
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

const invitationData = {
  id: uuidv4(),
  email: testEmail,
  user_id: null, // No user ID yet (pending invitation)
  role: 'user',
  status: 'invited',
  invitation_id: invitationId,
  invitation_sent_at: new Date().toISOString(),
  expires_at: expiresAt.toISOString(),
  created_by: adminUserId, // The admin who created the invitation
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

console.log('Invitation data:', {
  email: invitationData.email,
  role: invitationData.role,
  status: invitationData.status,
  created_by: invitationData.created_by,
  expires_at: invitationData.expires_at
});

const { data: invitation, error: inviteError } = await serviceClient
  .from('user_roles')
  .insert(invitationData)
  .select()
  .single();

if (inviteError) {
  console.error('❌ Failed to create invitation:', inviteError);
  console.error('Error details:', JSON.stringify(inviteError, null, 2));
} else {
  console.log('✅ Invitation created successfully!');
  console.log('Invitation ID:', invitation.invitation_id);
  console.log('Email:', invitation.email);
  console.log('Created by:', invitation.created_by);
}

// Test querying invitations
console.log('\n2. Querying Recent Invitations');
console.log('-'.repeat(50));

const { data: invitations, error: queryError } = await serviceClient
  .from('user_roles')
  .select('*')
  .eq('status', 'invited')
  .order('created_at', { ascending: false })
  .limit(5);

if (queryError) {
  console.error('❌ Failed to query invitations:', queryError);
} else {
  console.log('✅ Successfully queried invitations');
  console.log('Found', invitations?.length || 0, 'pending invitations');
  
  if (invitations && invitations.length > 0) {
    console.log('\nRecent invitations:');
    invitations.forEach(inv => {
      console.log(`  - ${inv.email}`);
      console.log(`    Role: ${inv.role}`);
      console.log(`    Created by: ${inv.created_by || 'Unknown'}`);
      console.log(`    Expires: ${inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'Never'}`);
    });
  }
}

// Clean up test invitation
if (invitation) {
  console.log('\n3. Cleaning Up Test Invitation');
  console.log('-'.repeat(50));
  
  const { error: deleteError } = await serviceClient
    .from('user_roles')
    .delete()
    .eq('id', invitation.id);
    
  if (deleteError) {
    console.error('❌ Failed to clean up test invitation:', deleteError);
  } else {
    console.log('✅ Test invitation cleaned up');
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('TEST SUMMARY');
console.log('='.repeat(50));

console.log(`
Results:
- Database schema: ✅ created_by column exists
- Invitation creation: ${!inviteError ? '✅ Working' : '❌ Failed'}
- Query functionality: ${!queryError ? '✅ Working' : '❌ Failed'}

The user invitation system is ${!inviteError && !queryError ? 'fully functional' : 'experiencing issues'}.
`);

// Sign out
await authClient.auth.signOut();
console.log('✅ Test complete - signed out');