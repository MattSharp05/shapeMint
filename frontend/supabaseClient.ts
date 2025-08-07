import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

// Create a fallback client if environment variables are missing
// This prevents the app from crashing during development
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Using fallback configuration.');
  console.warn('Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Use fallback values if environment variables are missing
const finalSupabaseUrl = supabaseUrl || 'https://your-project.supabase.co';
const finalSupabaseKey = supabaseAnonKey || 'your-anon-key-here';

export const supabase = createClient(finalSupabaseUrl, finalSupabaseKey);