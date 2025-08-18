import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoThumbnail } from './useAutoThumbnail'
import { mockAuthValue } from '../__tests__/mocks/auth'

// Mock useAuth with centralized helper
vi.mock('./useAuth', () => ({
  useAuth: () => mockAuthValue
}))

// Mock autoThumbnailService
const autoGenerateThumbnails = vi.fn()
const abort = vi.fn()
vi.mock('../services/autoThumbnailService', () => ({
  autoThumbnailService: {
    autoGenerateThumbnails: (...args: any[]) => autoGenerateThumbnails(...args),
    abort: () => abort()
  }
}))

describe('useAutoThumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default progress state', () => {
      const { result } = renderHook(() => useAutoThumbnail())
      expect(result.current.progress).toEqual({
        total: 0,
        processed: 0,
        current: null,
        isGenerating: false,
        error: null
      })
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.hasModelsToProcess).toBe(false)
    expect(result.current.completionPercentage).toBe(0)
  })

  it('triggers auto generation on demand', async () => {
    autoGenerateThumbnails.mockResolvedValue(undefined)
      const { result } = renderHook(() => useAutoThumbnail())

      await act(async () => {
      await result.current.triggerAutoGeneration()
    })

    expect(autoGenerateThumbnails).toHaveBeenCalledWith(mockAuthValue.user.id, expect.any(Function))
  })

  it('handles errors from auto generation', async () => {
    autoGenerateThumbnails.mockRejectedValue(new Error('Generation failed'))
      const { result } = renderHook(() => useAutoThumbnail())

      await act(async () => {
      await result.current.triggerAutoGeneration()
    })

    expect(result.current.progress.error).toBe('Generation failed')
    expect(result.current.isGenerating).toBe(false)
  })

  it('stops generation via abort', () => {
      const { result } = renderHook(() => useAutoThumbnail())

      act(() => {
        result.current.stopGeneration()
      })

    expect(abort).toHaveBeenCalled()
    expect(result.current.progress.isGenerating).toBe(false)
    expect(result.current.progress.current).toBeNull()
  })

  it('auto-triggers on mount when enabled and user exists', async () => {
    autoGenerateThumbnails.mockResolvedValue(undefined)
    const { result } = renderHook(() => useAutoThumbnail({ triggerOnMount: true }))

    // immediate effect triggers call
    expect(autoGenerateThumbnails).toHaveBeenCalledWith(mockAuthValue.user.id, expect.any(Function))
    expect(result.current.progress.isGenerating).toBe(false)
  })
}) 