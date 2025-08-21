import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('INVITATION VERIFICATION DEBUG TEST');
console.log('='.repeat(60));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Create client like the frontend does
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test the exact invitation from the URL
const testInvitationId = '8a8350e7-9aaf-4669-955d-ef21aa56b316';
const urlEncodedEmail = 'martincrumlish%40gmail.com';
const decodedEmail = decodeURIComponent(urlEncodedEmail);

console.log('\n1. URL Parameters');
console.log('-'.repeat(60));
console.log('Invitation ID:', testInvitationId);
console.log('URL encoded email:', urlEncodedEmail);
console.log('Decoded email:', decodedEmail);
console.log('Decoded email length:', decodedEmail.length);

// Test 1: Query by invitation ID only
console.log('\n2. Query by Invitation ID Only');
console.log('-'.repeat(60));

const { data: inviteData, error: inviteError } = await supabase
  .from('user_roles')
  .select('*')
  .eq('invitation_id', testInvitationId)
  .single();

if (inviteError) {
  console.error('❌ Error querying by invitation ID:', inviteError.message);
  console.error('Error details:', inviteError);
} else if (inviteData) {
  console.log('✅ Found invitation:');
  console.log('  Database email:', inviteData.email);
  console.log('  Database email length:', inviteData.email.length);
  console.log('  Status:', inviteData.status);
  console.log('  Expires at:', inviteData.expires_at);
  
  // Compare emails character by character
  console.log('\n3. Email Comparison');
  console.log('-'.repeat(60));
  console.log('Database email:', JSON.stringify(inviteData.email));
  console.log('Decoded URL email:', JSON.stringify(decodedEmail));
  console.log('Emails match:', inviteData.email === decodedEmail);
  
  if (inviteData.email !== decodedEmail) {
    console.log('\n❌ Emails do NOT match!');
    console.log('Character-by-character comparison:');
    const maxLen = Math.max(inviteData.email.length, decodedEmail.length);
    for (let i = 0; i < maxLen; i++) {
      const dbChar = inviteData.email[i] || '(end)';
      const urlChar = decodedEmail[i] || '(end)';
      if (dbChar !== urlChar) {
        console.log(`  Position ${i}: DB='${dbChar}' (${dbChar.charCodeAt(0)}) vs URL='${urlChar}' (${urlChar.charCodeAt(0)})`);
      }
    }
  }
}

// Test 2: Query with both invitation ID and email (like frontend does)
console.log('\n4. Query with Invitation ID and Email');
console.log('-'.repeat(60));

const { data: fullData, error: fullError } = await supabase
  .from('user_roles')
  .select('*')
  .eq('invitation_id', testInvitationId)
  .eq('email', decodedEmail)
  .eq('status', 'invited')
  .single();

if (fullError) {
  console.error('❌ Error with full query:', fullError.message);
  
  // Try without status filter
  const { data: noStatusData, error: noStatusError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('invitation_id', testInvitationId)
    .eq('email', decodedEmail)
    .single();
    
  if (noStatusError) {
    console.error('❌ Still fails without status filter:', noStatusError.message);
  } else if (noStatusData) {
    console.log('⚠️  Found when removing status filter!');
    console.log('  Current status:', noStatusData.status);
    console.log('  This means the status is not "invited"');
  }
} else {
  console.log('✅ Full query successful!');
  console.log('Invitation data:', fullData);
}

// Test 3: Try different email variations
console.log('\n5. Testing Email Variations');
console.log('-'.repeat(60));

const emailVariations = [
  decodedEmail,
  decodedEmail.toLowerCase(),
  decodedEmail.toUpperCase(),
  decodedEmail.trim(),
  inviteData?.email // Use the exact email from database
];

for (const email of emailVariations) {
  if (!email) continue;
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('invitation_id')
    .eq('invitation_id', testInvitationId)
    .eq('email', email)
    .single();
    
  console.log(`Email: "${email}" - ${error ? '❌ Failed' : '✅ Success'}`);
}

// Test 4: Check all invitations for this email
console.log('\n6. All Invitations for Email');
console.log('-'.repeat(60));

const { data: allInvites, error: allError } = await supabase
  .from('user_roles')
  .select('*')
  .or(`email.eq.${decodedEmail},email.ilike.%${decodedEmail.replace('@', '%40')}%`);

if (allError) {
  console.error('❌ Error querying all invitations:', allError);
} else {
  console.log(`Found ${allInvites?.length || 0} records with similar email`);
  allInvites?.forEach(inv => {
    console.log(`  - ID: ${inv.invitation_id}`);
    console.log(`    Email: "${inv.email}"`);
    console.log(`    Status: ${inv.status}`);
  });
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('DIAGNOSIS SUMMARY');
console.log('='.repeat(60));

if (inviteData) {
  console.log('\n✅ Invitation exists in database');
  console.log(`Database email: "${inviteData.email}"`);
  console.log(`URL decoded email: "${decodedEmail}"`);
  
  if (inviteData.email !== decodedEmail) {
    console.log('\n❌ PROBLEM: Email mismatch!');
    console.log('The email in the URL does not match the database exactly.');
    console.log('\nSOLUTION: Use the exact database email in the invitation URL');
    
    // Generate correct URL
    const correctUrl = `http://localhost:8080/sign-up?invitation=${testInvitationId}&email=${encodeURIComponent(inviteData.email)}`;
    console.log('\n✅ CORRECT URL:');
    console.log(correctUrl);
  } else if (inviteData.status !== 'invited') {
    console.log('\n❌ PROBLEM: Status is not "invited"');
    console.log(`Current status: ${inviteData.status}`);
    console.log('\nSOLUTION: Reset the invitation status to "invited"');
  } else {
    console.log('\n✅ Everything looks correct!');
  }
} else {
  console.log('\n❌ Invitation not found in database');
  console.log('The invitation ID does not exist.');
}