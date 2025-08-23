import { supabase } from '../supabaseClient';

export interface PasswordResetResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PasswordResetVerifyResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: any;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Send password reset email using Supabase's built-in functionality
   */
  async sendPasswordReset(email: string): Promise<PasswordResetResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Error sending password reset email:', error);
        return {
          success: false,
          error: error.message || 'Failed to send password reset email'
        };
      }

      return {
        success: true,
        message: 'Password reset email sent successfully'
      };

    } catch (error) {
      console.error('Error sending password reset:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  /**
   * Update user password using Supabase's built-in functionality
   */
  async updatePassword(newPassword: string): Promise<PasswordResetVerifyResponse> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Error updating password:', error);
        return {
          success: false,
          error: error.message || 'Failed to update password'
        };
      }

      return {
        success: true,
        message: 'Password updated successfully',
        user: data.user
      };

    } catch (error) {
      console.error('Error updating password:', error);
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    }
  }

  /**
   * Check if user has a valid session (for password reset page)
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  }

  /**
   * Sign out user after password reset
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  }
}

export const authService = AuthService.getInstance(); 