import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAccount(email, password, firstName, lastName, role) {
  console.log(`Creating ${role} account: ${email}...`);
  
  // 1. Create user in Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      role: role
    }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log(`${role} account already exists.`);
      return;
    }
    console.error(`Error creating ${role} auth:`, authError.message);
    return;
  }

  const userId = authData.user.id;

  // 2. Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: email,
      first_name: firstName,
      last_name: lastName,
      role: role
    });

  if (profileError) {
    console.error(`Error creating ${role} profile:`, profileError.message);
  } else {
    console.log(`${role.toUpperCase()} account created successfully!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }
}

async function run() {
  // Create Teacher
  await createAccount('teacher@test.com', 'teacher123', 'Asan', 'Bakytzhan', 'teacher');
  
  console.log('---');
  
  // Create Student
  await createAccount('student@test.com', 'student123', 'Dias', 'Assylbek', 'student');
}

run();
