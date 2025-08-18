import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModelService } from './model'
import type { CreateModelInput } from '../types/model'

// Mock supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: { getUser: vi.fn() },
  storage: { from: vi.fn() }
}

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase
}))

describe('ModelService', () => {
  let service: ModelService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ModelService()
  })

  it('createModel inserts and returns data', async () => {
    const input: CreateModelInput = {
      user_id: 'u1', name: 'Test', prompt: 'p', style: 'realistic',
      obj_url: 'obj', stl_url: 'stl', glb_url: 'glb', status: 'processing'
    }

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockSupabase.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'm1', ...input }, error: null })
        }))
      }))
    })

    const result = await service.createModel(input)
    expect(result).toMatchObject({ id: 'm1', name: 'Test' })
    expect(mockSupabase.from).toHaveBeenCalledWith('generated_models')
  })

  it('getUserModels returns array', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [{ id: 'm1' }], error: null }) }))
      }))
    })

    const out = await service.getUserModels('u1')
    expect(out).toEqual([{ id: 'm1' }])
  })

  it('getModel returns single model', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'm2' }, error: null }) }))
      }))
    })

    const out = await service.getModel('m2')
    expect(out).toEqual({ id: 'm2' })
  })

  it('updateModelStatus updates status', async () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    })

    await expect(service.updateModelStatus('m3', 'completed')).resolves.toBeUndefined()
  })

  it('uploadModelFile uploads and returns URL', async () => {
    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn/model.glb' } })
    })

    const url = await service.uploadModelFile('m4', 'glb', new File(['x'], 'f.glb'))
    expect(url).toBe('https://cdn/model.glb')
  })

  it('deleteModel removes files and record', async () => {
    mockSupabase.storage.from.mockReturnValue({ remove: vi.fn().mockResolvedValue({ error: null }) })
    mockSupabase.from.mockReturnValue({ delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) })

    await expect(service.deleteModel('m5')).resolves.toBeUndefined()
  })
}) 