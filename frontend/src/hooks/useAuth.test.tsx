import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './useAuth'
import { createTestUser } from '../utils/test-data'

// Mock Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    }
  }
}))

import { supabase } from '../supabaseClient'

const mockSupabase = supabase as any

describe('useAuth Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides initial auth state', () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
    expect(typeof result.current.login).toBe('function')
    expect(typeof result.current.register).toBe('function')
    expect(typeof result.current.logout).toBe('function')
  })

  it('loads user from existing session', async () => {
    const mockUser = createTestUser()
    const mockSession = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        user_metadata: { full_name: mockUser.full_name },
        created_at: mockUser.created_at
      },
      access_token: 'mock-token'
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.full_name,
      createdAt: mockUser.created_at
    })
  })

  it('handles successful login', async () => {
    const mockUser = createTestUser()
    const mockSession = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        user_metadata: { full_name: mockUser.full_name },
        created_at: mockUser.created_at
      }
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { 
        user: mockSession.user,
        session: mockSession
      },
      error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let loginResult: any
    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'password')
    })

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    })

    expect(loginResult).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.full_name,
      createdAt: mockUser.created_at
    })
  })

  it('handles login error', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await expect(
      act(async () => {
        await result.current.login('wrong@example.com', 'wrongpassword')
      })
    ).rejects.toThrow('Invalid credentials')
  })

  it('handles successful registration', async () => {
    const mockUser = createTestUser({ email: 'new@example.com', full_name: 'New User' })
    const mockSession = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        user_metadata: { full_name: mockUser.full_name },
        created_at: mockUser.created_at
      }
    }

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { 
        user: mockSession.user,
        session: mockSession
      },
      error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let registerResult: any
    await act(async () => {
      registerResult = await result.current.register(
        'new@example.com',
        'password',
        'New User'
      )
    })

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password',
      options: {
        data: { full_name: 'New User' }
      }
    })

    expect(registerResult).toEqual({
      id: mockUser.id,
      email: 'new@example.com',
      name: 'New User',
      createdAt: mockUser.created_at
    })
  })

  it('handles registration error', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email already registered' }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await expect(
      act(async () => {
        await result.current.register(
          'existing@example.com',
          'password',
          'Existing User'
        )
      })
    ).rejects.toThrow('Email already registered')
  })

  it('handles successful logout', async () => {
    const mockUser = createTestUser()
    
    // Start with a logged-in user
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { 
        session: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            user_metadata: { full_name: mockUser.full_name },
            created_at: mockUser.created_at
          }
        }
      },
      error: null
    })

    mockSupabase.auth.signOut.mockResolvedValue({
      error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).toBeTruthy()
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    expect(result.current.user).toBeNull()
  })

  it('handles logout error gracefully', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })

    mockSupabase.auth.signOut.mockResolvedValue({
      error: { message: 'Logout failed' }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should not throw error even if logout fails
    await act(async () => {
      await result.current.logout()
    })

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('handles auth state changes', async () => {
    let authStateChangeCallback: (event: string, session: any) => void

    mockSupabase.auth.onAuthStateChange.mockImplementation((callback: (event: string, session: any) => void) => {
      authStateChangeCallback = callback
      return {
        data: { subscription: { unsubscribe: vi.fn() } }
      }
    })

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Simulate sign in event
    const mockUser = createTestUser()
    const mockSession = {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        user_metadata: { full_name: mockUser.full_name },
        created_at: mockUser.created_at
      }
    }

    await act(async () => {
      authStateChangeCallback('SIGNED_IN', mockSession)
    })

    expect(result.current.user).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.full_name,
      createdAt: mockUser.created_at
    })

    // Simulate sign out event
    await act(async () => {
      authStateChangeCallback('SIGNED_OUT', null)
    })

    expect(result.current.user).toBeNull()
  })

  it('cleans up auth listener on unmount', () => {
    const mockUnsubscribe = vi.fn()
    
    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } }
    })

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    })

    const { unmount } = renderHook(() => useAuth(), { wrapper })

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('handles session loading errors gracefully', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Session loading failed' }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toBeNull()
  })

  it('throws error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
  })
}) 