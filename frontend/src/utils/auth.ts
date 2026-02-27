import { supabase } from '../supabaseClient';

// Utility functions for authentication
export class AuthUtils {
  // Check if user is currently authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session?.user;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Check if session is valid and not expired
  static async isSessionValid(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) return false;
      if (!session) return false;
      
      // Check if session is expired
      const now = Math.floor(Date.now() / 1000);
      return session.expires_at ? session.expires_at > now : false;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  // Refresh session if needed
  static async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return false;
      }
      return !!data.session;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }
}