import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MeshyService } from './meshy'

// Mock supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
    update: vi.fn(() => ({ eq: vi.fn() })),
    select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) }))
  }))
}
vi.mock('../lib/supabase', () => ({ supabase: mockSupabase }))

// Mock fetch for API calls
global.fetch = vi.fn() as any

describe('MeshyService (core)', () => {
  let meshyService: MeshyService

  beforeEach(() => {
    vi.clearAllMocks()
    meshyService = MeshyService.getInstance()
    ;(fetch as any).mockClear()
  })

  it('is a singleton', () => {
    expect(MeshyService.getInstance()).toBe(meshyService)
  })

  it('generates from text successfully', async () => {
    const taskId = 'task-123'
    ;(fetch as any)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: taskId, status: 'pending' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: taskId, status: 'SUCCEEDED' }) })

    const result = await meshyService.generateModel({ prompt: 'A car', style: 'realistic' })
    expect(result).toBe(taskId)
  })

  it('throws on text generation API error', async () => {
    ;(fetch as any).mockResolvedValueOnce({ ok: false, status: 400, json: () => Promise.resolve({ error: 'Bad' }) })
    await expect(meshyService.generateModel({ prompt: 'bad' })).rejects.toThrow()
  })
}) 