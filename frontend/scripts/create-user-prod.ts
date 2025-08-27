import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqeaewfqnhqxvbvvmqhc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtanlud2N2bGR2YWNzdWh1bGJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTM4NzY5NywiZXhwIjoyMDY2OTYzNjk3fQ.HuFnnVWweIlJkl9I-3WoGXKOcbP7huWP9wTZbFsqODc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser() {
  const userId = 'faeb66c5-f071-4f9b-abb2-dac8595f0c59';
  
  // First get the user from auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  
  if (authError) {
    console.error('Error getting auth user:', authError);
    process.exit(1);
  }

  if (!authUser?.user) {
    console.error('Auth user not found');
    process.exit(1);
  }

  console.log('Found auth user:', authUser.user);

  // Then create the user in public.users
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: authUser.user.email,
      full_name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0] || '',
      created_at: authUser.user.created_at
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') { // unique_violation
      console.log('User already exists, this is fine');
      return;
    }
    console.error('Error creating user:', insertError);
    process.exit(1);
  }

  console.log('User created successfully:', newUser);
}

createUser().catch(console.error);
