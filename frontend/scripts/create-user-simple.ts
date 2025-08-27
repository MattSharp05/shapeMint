import { supabase } from '../src/supabaseClient';

async function createUser() {
  const userId = 'faeb66c5-f071-4f9b-abb2-dac8595f0c59';
  
  // Create the user in public.users
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: 'your.email@example.com', // We'll get an error with the actual email which is fine
      full_name: 'Your Name',
      created_at: new Date().toISOString()
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
