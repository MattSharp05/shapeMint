import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageService } from './storage'

// Mock supabase client
const mockSupabase = {
  auth: {
    getSession: vi.fn()
  },
  storage: {
    from: vi.fn()
  },
  from: vi.fn()
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('StorageService', () => {
  let service: StorageService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new StorageService()
  })

  it('uploadModelFile uploads and returns public URL', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
      mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn/model.glb' } })
    })

    const result = await service.uploadModelFile('model-1', 'glb', new Blob(['x']))

    expect(result).toBe('https://cdn/model.glb')
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('model-files')
  })

  it('saveModelToDatabase inserts record', async () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null })
      })

      await expect(
      service.saveModelToDatabase('user-1', 'Name', 'Prompt', 'realistic', {
        obj: 'obj-url', stl: 'stl-url', glb: 'glb-url'
      })
    ).resolves.toBeUndefined()

    expect(mockSupabase.from).toHaveBeenCalledWith('generated_models')
  })
}) 