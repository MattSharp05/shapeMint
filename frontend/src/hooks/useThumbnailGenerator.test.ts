import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useThumbnailGenerator } from './useThumbnailGenerator'

// Mocks
const generateAllThumbnails = vi.fn()
const uploadThumbnails = vi.fn()
const dispose = vi.fn()

vi.mock('../services/thumbnailGenerator', () => ({
  ThumbnailGenerator: vi.fn().mockImplementation(() => ({
    generateAllThumbnails: (...args: any[]) => generateAllThumbnails(...args),
    uploadThumbnails: (...args: any[]) => uploadThumbnails(...args),
    dispose: () => dispose()
  })),
  DEFAULT_CAMERA_ANGLES: [
    { name: 'front', position: [0, 0, 5], target: [0, 0, 0], label: 'Front' }
  ]
}))

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    })
  }
}))

describe('useThumbnailGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useThumbnailGenerator())
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.completed).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.progress).toEqual({})
    expect(result.current.thumbnails).toEqual({})
  })

  it('generates thumbnails successfully', async () => {
    const thumbnails = { front: 'data:image/png;base64,abc' }
    generateAllThumbnails.mockResolvedValue(thumbnails)

    const { result } = renderHook(() => useThumbnailGenerator({ uploadToStorage: false }))

    await act(async () => {
      await result.current.generateThumbnails('model.glb', 'model-1')
    })

    expect(result.current.isGenerating).toBe(false)
    expect(result.current.completed).toBe(true)
    expect(result.current.thumbnails).toEqual(thumbnails)
  })

  it('uploads thumbnails when enabled', async () => {
    const generated = { front: 'data:image/png;base64,abc' }
    const uploaded = { front: 'https://cdn/image.png' }
    generateAllThumbnails.mockResolvedValue(generated)
    uploadThumbnails.mockResolvedValue(uploaded)

    const { result } = renderHook(() => useThumbnailGenerator({ uploadToStorage: true }))

    await act(async () => {
      await result.current.generateThumbnails('model.glb', 'model-1')
    })

    expect(uploadThumbnails).toHaveBeenCalledWith('model-1', generated)
    expect(result.current.thumbnails).toEqual(uploaded)
  })

  it('handles errors', async () => {
    generateAllThumbnails.mockRejectedValue(new Error('Generation failed'))

    const { result } = renderHook(() => useThumbnailGenerator())

    await expect(
      act(async () => {
        await result.current.generateThumbnails('model.glb', 'model-1')
      })
    ).rejects.toThrow()

    expect(result.current.error).toBe('Generation failed')
    expect(result.current.isGenerating).toBe(false)
    expect(result.current.completed).toBe(false)
  })

  it('resets state', () => {
    const { result } = renderHook(() => useThumbnailGenerator())

    act(() => {
      result.current.resetState()
    })

    expect(result.current.isGenerating).toBe(false)
    expect(result.current.completed).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.progress).toEqual({})
    expect(result.current.thumbnails).toEqual({})
  })

  it('disposes generator on completion', async () => {
    generateAllThumbnails.mockResolvedValue({})

    const { result } = renderHook(() => useThumbnailGenerator())

    await act(async () => {
      await result.current.generateThumbnails('model.glb', 'model-1')
    })

    expect(dispose).toHaveBeenCalled()
  })
}) 