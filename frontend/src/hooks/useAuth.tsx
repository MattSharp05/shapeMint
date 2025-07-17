import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '../supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
      const { data: { session } } = await supabase.auth.getSession();
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