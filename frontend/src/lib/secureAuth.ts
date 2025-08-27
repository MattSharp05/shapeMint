import { supabase } from '../supabaseClient';
import { SecureTokenStorage } from './tokenStorage';

// Secure authentication wrapper
export class SecureAuth {
  // Login with minimal token exposure
  static async login(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user && data.session) {
        // Store minimal user data (not in token)
        const minimalUser = {
          id: data.user.id,
          role: 'authenticated',
          // Don't store email/name in client state
        };
        
        // Store token securely
        SecureTokenStorage.setToken(data.session.access_token, 3600);
        
        return minimalUser;
      }
    } catch (error) {
      console.error('Secure login error:', error);
      throw error;
    }
  }

  // Get user data from server (not from token)
  static async getUserProfile() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (user) {
        // Fetch user profile from database instead of token
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, created_at')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        
        return {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          createdAt: profile.created_at,
        };
      }
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  // Logout and clear tokens
  static async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear secure token storage
      SecureTokenStorage.removeToken();
    } catch (error) {
      console.error('Secure logout error:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return SecureTokenStorage.hasToken() && !SecureTokenStorage.isTokenExpired();
  }
} 