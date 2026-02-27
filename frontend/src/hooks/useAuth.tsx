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
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser | undefined>;
  register: (email: string, password: string, name: string) => Promise<AuthUser | undefined>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        const u = data.user;
        setUser({
          id: u.id,
          email: u.email || '',
          name: u.user_metadata?.full_name || u.email?.split('@')[0] || '',
          createdAt: u.created_at || new Date().toISOString(),
        });
        return {
          id: u.id,
          email: u.email || '',
          name: u.user_metadata?.full_name || u.email?.split('@')[0] || '',
          createdAt: u.created_at || new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
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
        
        const authUser = {
          id: u.id,
          email: u.email || '',
          name: u.user_metadata?.full_name || u.email?.split('@')[0] || '',
          createdAt: u.created_at || new Date().toISOString(),
        };
        
        setUser(authUser);
        return authUser;
      }
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
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
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            createdAt: session.user.created_at || new Date().toISOString(),
          });
        } else {
          logger.debug('ℹ️ No active session found');
          setUser(null);
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
      async (event, session) => {
        logger.debug('🔄 Auth state changed:', event);
        if (session?.user) {
          logger.debug('✅ User authenticated:', session.user.email);
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            createdAt: session.user.created_at || new Date().toISOString(),
          });
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
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
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