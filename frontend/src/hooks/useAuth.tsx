import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '../supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { userService } from '../services/user';

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
      console.error('Login error:', error);
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
          console.log('✅ User created successfully');
        } catch (userError) {
          console.error('❌ Error creating user:', userError);
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
      console.error('Registration error:', error);
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
      console.log('🔐 Getting initial session...');
      const { data: { session } } = await supabase.auth.getSession();
      // Session data logging removed for security
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
          createdAt: session.user.created_at || new Date().toISOString(),
        });
      }
      setLoading(false);
    };
    getSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            createdAt: session.user.created_at || new Date().toISOString(),
          });
        } else {
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
      {children}
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