import { useState, useEffect } from 'react';
import type { User } from '../types';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const shapemintUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name || session.user.email!.split('@')[0],
          createdAt: session.user.created_at
        };
        setUser(shapemintUser);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (session?.user) {
        const shapemintUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata.name || session.user.email!.split('@')[0],
          createdAt: session.user.created_at
        };
        setUser(shapemintUser);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned from Supabase');
    
    const shapemintUser: User = {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata.name || data.user.email!.split('@')[0],
      createdAt: data.user.created_at
    };
    return shapemintUser;
  };

  const register = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned from Supabase');
    
    const shapemintUser: User = {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata.name || data.user.email!.split('@')[0],
      createdAt: data.user.created_at
    };
    return shapemintUser;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  return { user, loading, login, register, logout };
}