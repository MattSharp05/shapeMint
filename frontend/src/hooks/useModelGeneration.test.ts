import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useModelGeneration } from './useModelGeneration'

// Mock modelService
const generate3DModel = vi.fn()
vi.mock('../services/modelService', () => ({
  modelService: {
    generate3DModel: (...args: any[]) => generate3DModel(...args)
  }
}))

describe('useModelGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useModelGeneration())

    expect(result.current.generating).toBe(false)
    expect(result.current.progress).toBe(0)
    expect(result.current.status).toBe('pending')
    expect(result.current.generatedModel).toBeNull()
    expect(result.current.generationData).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('handles successful generation', async () => {
    generate3DModel.mockResolvedValue({
      success: true,
      data: {
        task_id: 'task-123',
        format: 'GLB',
        polygons: 1234,
        file_size: '10MB'
      }
    })

    const { result } = renderHook(() => useModelGeneration())

    await act(async () => {
      await result.current.generateModel({ prompt: 'A robot' })
    })

    expect(result.current.status).toBe('completed')
    expect(result.current.generating).toBe(false)
    expect(result.current.progress).toBe(100)
    expect(result.current.generatedModel).toBe('task-123')
    expect(result.current.generationData).toMatchObject({
      taskId: 'task-123',
      format: 'GLB'
    })
  })

  it('handles service failure response', async () => {
    generate3DModel.mockResolvedValue({
      success: false,
      error: 'Service down'
    })

    const { result } = renderHook(() => useModelGeneration())

    await act(async () => {
      await result.current.generateModel({ prompt: 'A robot' })
    })

    expect(result.current.status).toBe('failed')
    expect(result.current.error).toBe('Service down')
    expect(result.current.generating).toBe(false)
    expect(result.current.progress).toBe(0)
  })

  it('handles missing model url in success response', async () => {
    generate3DModel.mockResolvedValue({
      success: true,
      data: {
        format: 'GLB'
      }
    })

    const { result } = renderHook(() => useModelGeneration())

    await act(async () => {
      await result.current.generateModel({ prompt: 'A robot' })
    })

    expect(result.current.status).toBe('failed')
    expect(result.current.error).toMatch(/No model URL/i)
    expect(result.current.generating).toBe(false)
    expect(result.current.progress).toBe(0)
  })

  it('resets to initial state', () => {
    const { result } = renderHook(() => useModelGeneration())

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('pending')
    expect(result.current.progress).toBe(0)
    expect(result.current.generatedModel).toBeNull()
  })
}) 