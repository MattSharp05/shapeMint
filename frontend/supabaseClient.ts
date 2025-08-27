import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Always use production Supabase credentials
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };