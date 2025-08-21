import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('EMAIL SYSTEM COMPREHENSIVE TEST');
console.log('='.repeat(50));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Test 1: Verify service role key can read email settings
console.log('\n1. Testing Service Role Key Access to Email Settings');
console.log('-'.repeat(50));

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// Get admin user ID
const { data: authData, error: authError } = await createClient(supabaseUrl, supabaseAnonKey)
  .auth.signInWithPassword({
    email: 'admin@example.com',
    password: 'Password01'
  });

if (authError) {
  console.error('❌ Failed to authenticate:', authError);
  process.exit(1);
}

const userId = authData.user.id;
console.log('✅ Authenticated as admin@example.com');
console.log('User ID:', userId);

// Test reading email settings with service role key
const { data: emailSettings, error: settingsError } = await serviceClient
  .from('user_api_keys')
  .select('key_name, key_value')
  .eq('user_id', userId)
  .in('key_name', ['sender_name', 'sender_email', 'resend_api_key', 'sender_domain']);

if (settingsError) {
  console.error('❌ Failed to read email settings:', settingsError);
} else {
  console.log('✅ Successfully read email settings with service role key');
  console.log('Settings found:', emailSettings?.length || 0);
  
  if (emailSettings && emailSettings.length > 0) {
    const settings = {};
    emailSettings.forEach(s => {
      settings[s.key_name] = s.key_name === 'resend_api_key' 
        ? s.key_value.substring(0, 10) + '...' 
        : s.key_value;
    });
    console.log('Email configuration:');
    console.log('  - Sender Name:', settings.sender_name || 'Not set');
    console.log('  - Sender Email:', settings.sender_email || 'Not set');
    console.log('  - API Key:', settings.resend_api_key || 'Not set');
    console.log('  - Domain:', settings.sender_domain || 'Not set');
  }
}

// Test 2: Verify anon key CANNOT read email settings (for security)
console.log('\n2. Testing Anon Key Access (Should Fail - Security Check)');
console.log('-'.repeat(50));

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const { data: anonData, error: anonError } = await anonClient
  .from('user_api_keys')
  .select('key_name, key_value')
  .eq('user_id', userId)
  .in('key_name', ['sender_name', 'sender_email', 'resend_api_key', 'sender_domain']);

if (anonError) {
  console.log('✅ Anon key correctly blocked by RLS (expected behavior)');
} else if (!anonData || anonData.length === 0) {
  console.log('✅ Anon key returns empty results (RLS working)');
} else {
  console.error('⚠️  Security Issue: Anon key can read user settings!');
  console.error('Found', anonData.length, 'settings');
}

// Test 3: Test the actual email API endpoint
console.log('\n3. Testing Email API Endpoint');
console.log('-'.repeat(50));

const testEmailPayload = {
  userId: userId,
  recipientEmail: 'test@example.com',
  emailType: 'test'
};

console.log('Testing endpoint: http://localhost:8080/api/send-email');
console.log('Payload:', JSON.stringify(testEmailPayload, null, 2));

try {
  const response = await fetch('http://localhost:8080/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(testEmailPayload)
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('✅ Email API endpoint working!');
    console.log('Response:', result);
  } else {
    console.log('❌ Email API returned error:', result.error);
    
    // Check if it's because email settings aren't configured
    if (result.error?.includes('Email settings not configured')) {
      console.log('\n📝 To fix this, you need to:');
      console.log('1. Sign in to the application as admin@example.com');
      console.log('2. Go to Dashboard → Settings → Email Settings');
      console.log('3. Configure your Resend API key and sender details');
      console.log('4. Save the settings and run this test again');
    }
  }
} catch (error) {
  console.error('❌ Failed to call email API:', error.message);
  console.log('\n⚠️  Make sure the development server is running:');
  console.log('   npm run dev');
}

// Test 4: Check if service role key is properly configured
console.log('\n4. Environment Configuration Check');
console.log('-'.repeat(50));

console.log('Service Role Key:', supabaseServiceKey.substring(0, 20) + '...');
console.log('Starts with "service_role":', supabaseServiceKey.startsWith('service_role'));
console.log('Length:', supabaseServiceKey.length);

if (!supabaseServiceKey.startsWith('service_role')) {
  console.log('⚠️  Warning: Service role key should start with "service_role"');
  console.log('   Make sure you\'re using the correct key from Supabase dashboard');
}

// Test 5: Verify database structure
console.log('\n5. Database Structure Verification');
console.log('-'.repeat(50));

const { data: tableInfo, error: tableError } = await serviceClient
  .from('user_api_keys')
  .select('*')
  .limit(1);

if (!tableError) {
  console.log('✅ user_api_keys table exists and is accessible');
  
  // Check column structure
  if (tableInfo && tableInfo.length > 0) {
    const columns = Object.keys(tableInfo[0]);
    console.log('Table columns:', columns.join(', '));
    
    const requiredColumns = ['id', 'user_id', 'key_name', 'key_value'];
    const hasRequiredColumns = requiredColumns.every(col => columns.includes(col));
    
    if (hasRequiredColumns) {
      console.log('✅ All required columns present');
    } else {
      console.log('⚠️  Missing some required columns');
    }
  }
} else {
  console.error('❌ Cannot access user_api_keys table:', tableError);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('TEST SUMMARY');
console.log('='.repeat(50));

console.log(`
Key Findings:
1. Service role key ${emailSettings && emailSettings.length > 0 ? '✅ CAN' : '❌ CANNOT'} read email settings
2. Anon key ${(!anonData || anonData.length === 0) ? '✅ CANNOT' : '⚠️  CAN'} read email settings (security)
3. Service role key is ${supabaseServiceKey.startsWith('service_role') ? '✅ properly' : '⚠️  possibly not'} configured
4. Database structure is ${!tableError ? '✅ correct' : '❌ problematic'}

Next Steps:
${emailSettings && emailSettings.length === 0 ? '- Configure email settings in the application UI\n' : ''}${!supabaseServiceKey.startsWith('service_role') ? '- Verify service role key in .env.local\n' : ''}
`);

// Sign out
const authClient = createClient(supabaseUrl, supabaseAnonKey);
await authClient.auth.signOut();
console.log('✅ Test complete - signed out');