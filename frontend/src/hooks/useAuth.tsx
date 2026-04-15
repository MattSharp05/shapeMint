import React, { useState, useEffect, useContext, createContext } from 'react';
import { supabase, checkSupabaseConnection } from '../supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { userService } from '../services/user';
import { logger } from '../utils/logger';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isAnonymous: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser | undefined>;
  register: (email: string, password: string, name: string) => Promise<AuthUser | undefined>;
  /**
   * Convert the current anonymous user to a permanent account by attaching
   * an email and password. Preserves the same user_id, so all rows tied to
   * the anon session (generated_models, etc.) carry over automatically.
   *
   * Requires the "Confirm email" setting to be OFF in Supabase so the
   * conversion is synchronous — no email-verification interruption.
   */
  convertAnonToUser: (
    email: string,
    password: string,
    name?: string
  ) => Promise<AuthUser | undefined>;
  logout: () => Promise<void>;
}

function toAuthUser(u: SupabaseUser): AuthUser {
  return {
    id: u.id,
    email: u.email || '',
    name: u.user_metadata?.full_name || u.email?.split('@')[0] || '',
    createdAt: u.created_at || new Date().toISOString(),
    isAnonymous: (u as unknown as { is_anonymous?: boolean }).is_anonymous === true,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        const authUser = toAuthUser(data.user);
        setUser(authUser);
        return authUser;
      }
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  };

  // Register function
  const register = async (email: string, password: string, name: string) => {
    try {
      // Step 1: Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });
      if (error) throw error;
      
      if (data.user) {
        const u = data.user;

        // Step 2: Create user record in database
        try {
          await userService.createUser(u.id, u.email || '', name);
          logger.log('✅ User created successfully');
        } catch (userError) {
          logger.error('❌ Error creating user:', userError);
          // Continue with auth user creation even if user record creation fails
        }

        const authUser = toAuthUser(u);
        setUser(authUser);
        return authUser;
      }
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  };

  // Convert an anonymous user to a permanent account. Preserves user_id.
  const convertAnonToUser = async (
    email: string,
    password: string,
    name?: string
  ) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        email,
        password,
        data: name ? { full_name: name } : undefined,
      });
      if (error) throw error;
      if (data.user) {
        // Best-effort: also create the legacy user row if your app relies
        // on userService. The profiles row is created automatically by the
        // handle_user_update trigger when is_anonymous flips to false.
        try {
          if (name) await userService.createUser(data.user.id, email, name);
        } catch (userError) {
          logger.error('convertAnonToUser: userService.createUser failed', userError);
        }

        const authUser = toAuthUser(data.user);
        setUser(authUser);
        return authUser;
      }
    } catch (error) {
      logger.error('convertAnonToUser error:', error);
      throw error;
    }
  };

  // Logout function. After signing out we immediately start a fresh
  // anonymous session so the user never sees an unauthenticated state.
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    try {
      const { data, error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr) throw anonErr;
      if (data.user) setUser(toAuthUser(data.user));
    } catch (e) {
      logger.error('logout: failed to start anon session', e);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const getSession = async () => {
      logger.debug('🔐 Getting initial session...');
      
      // First, check if Supabase is reachable
      const connectionCheck = await checkSupabaseConnection();
      if (!connectionCheck.connected) {
        logger.error('⚠️ Supabase connection failed:', connectionCheck.error);
        // Don't throw - allow app to continue, but user won't be able to auth
        setLoading(false);
        return;
      }
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          // Check if it's a network error
          if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
            logger.error('⚠️ Network error connecting to Supabase. Project may be paused or unreachable.');
          } else {
            logger.error('Error getting session:', error);
          }
          setUser(null);
        } else if (session?.user) {
          logger.debug('✅ Session found, user logged in');
          setUser(toAuthUser(session.user));
        } else {
          // No session yet → start an anonymous one so every visitor has
          // an auth identity. This enables 2D gen attribution and rate
          // limiting before account creation.
          logger.debug('ℹ️ No session — starting anonymous session');
          try {
            const { data, error: anonErr } = await supabase.auth.signInAnonymously();
            if (anonErr) {
              logger.error('Anonymous sign-in failed:', anonErr);
              setUser(null);
            } else if (data.user) {
              setUser(toAuthUser(data.user));
            }
          } catch (anonErr) {
            logger.error('Anonymous sign-in threw:', anonErr);
            setUser(null);
          }
        }
      } catch (error: any) {
        // Handle network errors gracefully
        if (error?.message?.includes('Failed to fetch') || error?.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          logger.error('⚠️ Cannot reach Supabase. Please check: 1) Project is active in Supabase dashboard 2) Network connection');
        } else {
          logger.error('Error in getSession:', error);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    getSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        logger.debug('🔄 Auth state changed:', _event);
        if (session?.user) {
          logger.debug('✅ User authenticated:', session.user.email || '(anonymous)');
          setUser(toAuthUser(session.user));
        } else {
          logger.debug('❌ User logged out or session expired');
          setUser(null);
        }
        setLoading(false);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, convertAnonToUser, logout }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent mx-auto mb-4"></div>
            <p className="text-white/50">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}