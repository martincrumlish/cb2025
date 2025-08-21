import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

console.log('TESTING WITH RLS DISABLED');
console.log('='.repeat(40));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// Test query
const { data, error } = await serviceClient
  .from('user_roles')
  .select('*');

if (error) {
  console.error('❌ STILL FAILING:', error);
} else {
  console.log('✅ SUCCESS! Retrieved', data.length, 'rows');
  data.forEach(row => {
    console.log(`  - ${row.email}: ${row.role}`);
  });
}

// Test update
const { error: updateError } = await serviceClient
  .from('app_settings')
  .update({ setting_value: 'Test Works!' })
  .eq('setting_key', 'app_name');

if (updateError) {
  console.error('❌ Update failed:', updateError);
} else {
  console.log('✅ Update succeeded!');
}