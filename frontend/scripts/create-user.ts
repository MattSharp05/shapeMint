import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqeaewfqnhqxvbvvmqhc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

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
    console.error('Error creating user:', insertError);
    process.exit(1);
  }

  console.log('User created successfully:', newUser);
}

createUser().catch(console.error);
