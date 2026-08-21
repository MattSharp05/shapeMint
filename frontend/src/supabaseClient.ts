// Single source of truth for Supabase client
// Import this file from anywhere: import { supabase } from '../supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { logger } from './utils/logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

logger.debug('🔧 Supabase Client Config:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
  anonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'
});

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Missing Supabase environment variables. Please check your .env file.';
  logger.error(errorMsg, { 
    hasUrl: !!supabaseUrl, 
    hasKey: !!supabaseAnonKey 
  });
  throw new Error(errorMsg);
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  const errorMsg = `Invalid Supabase URL format: ${supabaseUrl}. URL should be https://[project-ref].supabase.co`;
  logger.error(errorMsg);
  throw new Error(errorMsg);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic session restoration from localStorage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Store session in localStorage for persistence across page refreshes
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key)
        } catch (error) {
          logger.warn('Failed to get item from localStorage:', error)
          return null
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value)
        } catch (error) {
          logger.warn('Failed to set item in localStorage:', error)
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key)
        } catch (error) {
          logger.warn('Failed to remove item from localStorage:', error)
        }
      }
    }
  },
  // Global error handler for network issues
  global: {
    headers: {
      'x-client-info': 'shapeMint@1.0.0'
    }
  }
})

// Helper function to check Supabase connection
export async function checkSupabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    // Try a simple health check. Note: the bare /rest/v1/ root now requires
    // the service_role key (401 with anon), so probe auth health instead —
    // it accepts the anon key.
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        'apikey': supabaseAnonKey
      }
    })
    return { connected: response.ok }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    
    // Check for specific network errors
    if (errorMessage.includes('ERR_NAME_NOT_RESOLVED') || errorMessage.includes('Failed to fetch')) {
      return {
        connected: false,
        error: `Cannot connect to Supabase. The project may be paused or there's a network issue. 
        Please check: 1) Supabase dashboard - is project active? 2) Network connection 3) Try: ${supabaseUrl}`
      }
    }
    
    return {
      connected: false,
      error: `Connection error: ${errorMessage}`
    }
  }
}

