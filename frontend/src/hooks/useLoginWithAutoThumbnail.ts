import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { autoThumbnailService } from '../services/autoThumbnailService';

interface LoginWithAutoThumbnailOptions {
  enableAutoThumbnail?: boolean;
  showProgress?: boolean;
}

export function useLoginWithAutoThumbnail(options: LoginWithAutoThumbnailOptions = {}) {
  const { login: authLogin, user } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      console.log('🔐 Logging in user...');
      const loggedInUser = await authLogin(email, password);
      
      if (loggedInUser && options.enableAutoThumbnail) {
        console.log('🚀 Login successful, triggering auto-thumbnail generation...');
        
        // Small delay to ensure user state is fully set
        setTimeout(() => {
          autoThumbnailService.autoGenerateThumbnails(
            loggedInUser.id,
            options.showProgress ? (progress) => {
              console.log('📈 Auto-thumbnail progress:', progress);
            } : undefined
          ).catch(error => {
            console.error('❌ Auto-thumbnail generation failed after login:', error);
          });
        }, 1000);
      }
      
      return loggedInUser;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setLoginError(errorMessage);
      console.error('💥 Login failed:', errorMessage);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  }, [authLogin, options.enableAutoThumbnail, options.showProgress]);

  return {
    login,
    isLoggingIn,
    loginError,
    user
  };
}
