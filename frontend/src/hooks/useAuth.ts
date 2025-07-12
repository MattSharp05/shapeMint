import { useState, useEffect } from 'react';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate auth check
    const savedUser = localStorage.getItem('shapemint_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate login
    const mockUser: User = {
      id: '1',
      email,
      name: email.split('@')[0],
      createdAt: new Date().toISOString(),
    };
    setUser(mockUser);
    localStorage.setItem('shapemint_user', JSON.stringify(mockUser));
    return mockUser;
  };

  const register = async (email: string, password: string, name: string) => {
    // Simulate registration
    const mockUser: User = {
      id: '1',
      email,
      name,
      createdAt: new Date().toISOString(),
    };
    setUser(mockUser);
    localStorage.setItem('shapemint_user', JSON.stringify(mockUser));
    return mockUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('shapemint_user');
  };

  return { user, loading, login, register, logout };
}