import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  await supabase.auth.signInWithPassword({ email: 'teacher@test.kz', password: 'Teacher123!' });
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Logged in as:', user.id);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url')
    .eq('role', 'student')
    .order('first_name');
  
  console.log("Students for Teacher:");
  console.dir(data, { depth: null });
  if (error) console.error("Error:", error);
}
run();
