import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLoginWithAutoThumbnail } from './useLoginWithAutoThumbnail'
import { mockAuthValue } from '../__tests__/mocks/auth'

// Mock useAuth
const login = vi.fn()
vi.mock('./useAuth', () => ({
  useAuth: () => ({
    login: (...args: any[]) => login(...args),
    user: mockAuthValue.user
  })
}))

// Mock autoThumbnailService
const autoGenerateThumbnails = vi.fn()
vi.mock('../services/autoThumbnailService', () => ({
  autoThumbnailService: {
    autoGenerateThumbnails: (...args: any[]) => autoGenerateThumbnails(...args)
  }
}))

describe('useLoginWithAutoThumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns login state and function', () => {
    const { result } = renderHook(() => useLoginWithAutoThumbnail())

    expect(typeof result.current.login).toBe('function')
    expect(result.current.isLoggingIn).toBe(false)
    expect(result.current.loginError).toBeNull()
  })

  it('logs in successfully without auto-thumbnails', async () => {
    login.mockResolvedValue(mockAuthValue.user)
    const { result } = renderHook(() => useLoginWithAutoThumbnail({ enableAutoThumbnail: false }))

    let loggedIn
    await act(async () => {
      loggedIn = await result.current.login('test@example.com', 'password')
    })

    expect(login).toHaveBeenCalledWith('test@example.com', 'password')
    expect(loggedIn).toEqual(mockAuthValue.user)
    expect(autoGenerateThumbnails).not.toHaveBeenCalled()
  })

  it('triggers auto-thumbnail generation after login when enabled', async () => {
    login.mockResolvedValue(mockAuthValue.user)
    const { result } = renderHook(() => useLoginWithAutoThumbnail({ enableAutoThumbnail: true, showProgress: true }))

    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })

    // Wait for setTimeout trigger
    await waitFor(() => {
      expect(autoGenerateThumbnails).toHaveBeenCalledWith(mockAuthValue.user.id, expect.any(Function))
    })
  })

  it('handles login errors and sets loginError', async () => {
    login.mockRejectedValue(new Error('Invalid credentials'))
    const { result } = renderHook(() => useLoginWithAutoThumbnail({ enableAutoThumbnail: true }))

    await expect(
      act(async () => {
        await result.current.login('x@example.com', 'bad')
      })
    ).rejects.toThrow()

    expect(result.current.loginError).toBe('Invalid credentials')
    expect(result.current.isLoggingIn).toBe(false)
  })
}) 