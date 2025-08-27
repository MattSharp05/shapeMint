// Secure token storage utility
// This provides a more secure way to store tokens than localStorage

export class SecureTokenStorage {
  private static readonly TOKEN_KEY = 'sb-access-token';
  private static readonly REFRESH_TOKEN_KEY = 'sb-refresh-token';

  // Store token in httpOnly cookie (more secure than localStorage)
  static setToken(token: string, expiresIn: number = 3600): void {
    const expires = new Date(Date.now() + expiresIn * 1000);
    document.cookie = `${this.TOKEN_KEY}=${token}; expires=${expires.toUTCString()}; path=/; secure; samesite=strict; httponly`;
  }

  // Get token from cookie
  static getToken(): string | null {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${this.TOKEN_KEY}=`)
    );
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  }

  // Remove token
  static removeToken(): void {
    document.cookie = `${this.TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${this.REFRESH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  // Check if token exists
  static hasToken(): boolean {
    return this.getToken() !== null;
  }

  // Get token expiration time
  static getTokenExpiration(): Date | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  // Check if token is expired
  static isTokenExpired(): boolean {
    const expiration = this.getTokenExpiration();
    return expiration ? expiration < new Date() : true;
  }
}

// Fallback to localStorage if cookies are not available
export class FallbackTokenStorage {
  private static readonly TOKEN_KEY = 'sb-access-token';
  private static readonly REFRESH_TOKEN_KEY = 'sb-refresh-token';

  static setToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.warn('Failed to store token in localStorage:', error);
    }
  }

  static getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to get token from localStorage:', error);
      return null;
    }
  }

  static removeToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to remove token from localStorage:', error);
    }
  }
} 