import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AutoThumbnailService } from './autoThumbnailService'
import { createTestModel } from '../utils/test-data'

// Mock supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({
        error: null
      })
    }))
  })),
  auth: {
    getSession: vi.fn()
  }
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('AutoThumbnailService', () => {
  let service: AutoThumbnailService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AutoThumbnailService()
    ;(fetch as any).mockClear()
  })

  describe('findModelsNeedingThumbnails', () => {
    it('finds models without thumbnails', async () => {
      const mockModels = [
        {
          id: 'model-1',
          glb_url: 'https://example.com/model1.glb',
          name: 'Model 1',
          thumbnail_status: null,
          thumbnail_url: null
        },
        {
          id: 'model-2',
          glb_url: 'https://example.com/model2.glb',
          name: 'Model 2',
          thumbnail_status: 'failed',
          thumbnail_url: null
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockModels,
                error: null
              })
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      })

      const result = await service.findModelsNeedingThumbnails('user-123')

      expect(result).toEqual(mockModels)
      expect(mockSupabase.from).toHaveBeenCalledWith('generated_models')
    })

    it('returns empty array when no models need thumbnails', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      })

      const result = await service.findModelsNeedingThumbnails('user-123')

      expect(result).toEqual([])
    })

    it('handles database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      })

      await expect(service.findModelsNeedingThumbnails('user-123')).rejects.toThrow('Database error')
    })
  })

  describe('generateThumbnailForModel', () => {
    const mockModel = {
      id: 'model-123',
      glb_url: 'https://example.com/model.glb',
      name: 'Test Model',
      thumbnail_status: null,
      thumbnail_url: null
    }

    it('successfully generates thumbnail', async () => {
      const mockThumbnailUrl = 'https://storage.example.com/thumbnail-123.jpg'

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          thumbnail_url: mockThumbnailUrl,
          angles: {
            front: 'angle1.jpg',
            back: 'angle2.jpg',
            left: 'angle3.jpg',
            right: 'angle4.jpg'
          }
        })
      })

      const result = await service.generateThumbnailForModel(mockModel)

      expect(result).toBe(mockThumbnailUrl)
      expect(fetch).toHaveBeenCalledWith('/api/generate-thumbnail', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining(mockModel.id)
      }))
    })

    it('handles API errors', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Thumbnail generation failed' })
      })

      await expect(service.generateThumbnailForModel(mockModel)).rejects.toThrow('Thumbnail generation failed')
    })

    it('handles network errors', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(service.generateThumbnailForModel(mockModel)).rejects.toThrow('Network error')
    })

    it('updates database with processing status', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          thumbnail_url: 'https://example.com/thumb.jpg',
          angles: {}
        })
      })

      await service.generateThumbnailForModel(mockModel)

      expect(mockSupabase.from).toHaveBeenCalledWith('generated_models')
    })
  })

  describe('autoGenerateThumbnails', () => {
    const mockModels = [
      {
        id: 'model-1',
        glb_url: 'https://example.com/model1.glb',
        name: 'Model 1',
        thumbnail_status: null,
        thumbnail_url: null
      },
      {
        id: 'model-2',
        glb_url: 'https://example.com/model2.glb',
        name: 'Model 2',
        thumbnail_status: null,
        thumbnail_url: null
      }
    ]

    beforeEach(() => {
      // Mock findModelsNeedingThumbnails
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockModels,
                error: null
              })
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      })
    })

    it('processes all models successfully', async () => {
      ;(fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            thumbnail_url: 'https://example.com/thumb1.jpg',
            angles: {}
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            thumbnail_url: 'https://example.com/thumb2.jpg',
            angles: {}
          })
        })

      const progressCallback = vi.fn()
      await service.autoGenerateThumbnails('user-123', progressCallback)

      expect(progressCallback).toHaveBeenCalledWith({
        total: 2,
        processed: 0,
        current: 'Model 1',
        isGenerating: true,
        error: null
      })

      expect(progressCallback).toHaveBeenCalledWith({
        total: 2,
        processed: 2,
        current: null,
        isGenerating: false,
        error: null
      })
    })

    it('handles individual model failures gracefully', async () => {
      ;(fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Failed to generate thumbnail' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            thumbnail_url: 'https://example.com/thumb2.jpg',
            angles: {}
          })
        })

      const progressCallback = vi.fn()
      await service.autoGenerateThumbnails('user-123', progressCallback)

      // Should continue processing despite first failure
      expect(progressCallback).toHaveBeenCalledWith({
        total: 2,
        processed: 2,
        current: null,
        isGenerating: false,
        error: null
      })
    })

    it('can be aborted mid-processing', async () => {
      ;(fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            thumbnail_url: 'https://example.com/thumb.jpg',
            angles: {}
          })
        }), 100))
      )

      const progressCallback = vi.fn()
      
      // Start processing
      const processingPromise = service.autoGenerateThumbnails('user-123', progressCallback)
      
      // Abort after a short delay
      setTimeout(() => service.abort(), 50)
      
      await processingPromise

      expect(service.isRunning).toBe(false)
    })

    it('handles empty model list', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
          }))
      })

      const progressCallback = vi.fn()
      await service.autoGenerateThumbnails('user-123', progressCallback)

      expect(progressCallback).toHaveBeenCalledWith({
        total: 0,
        processed: 0,
        current: null,
        isGenerating: false,
        error: null
      })
    })
  })

  describe('abort functionality', () => {
    it('sets abort flag correctly', () => {
      expect(service.isRunning).toBe(false)
      
      service.abort()
      
      // Abort should be callable even when not running
      expect(() => service.abort()).not.toThrow()
    })
  })

  describe('isRunning property', () => {
    it('returns false initially', () => {
      expect(service.isRunning).toBe(false)
    })

    it('returns true during processing', async () => {
      const mockModels = [{
        id: 'model-1',
        glb_url: 'https://example.com/model1.glb',
        name: 'Model 1',
        thumbnail_status: null,
        thumbnail_url: null
      }]

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockModels,
                error: null
              })
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      })

      ;(fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            thumbnail_url: 'https://example.com/thumb.jpg',
            angles: {}
          })
        }), 100))
      )

      const processingPromise = service.autoGenerateThumbnails('user-123')
      
      // Should be running during processing
      setTimeout(() => {
        expect(service.isRunning).toBe(true)
      }, 50)
      
      await processingPromise
      
      expect(service.isRunning).toBe(false)
    })
  })

  describe('progress notification', () => {
    it('calls progress callback with correct data', async () => {
      const mockModels = [{
        id: 'model-1',
        glb_url: 'https://example.com/model1.glb',
        name: 'Model 1',
        thumbnail_status: null,
        thumbnail_url: null
      }]

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockModels,
                error: null
              })
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      })

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          thumbnail_url: 'https://example.com/thumb.jpg',
          angles: {}
        })
      })

      const progressCallback = vi.fn()
      await service.autoGenerateThumbnails('user-123', progressCallback)

      // Check start progress
      expect(progressCallback).toHaveBeenCalledWith({
        total: 1,
        processed: 0,
        current: 'Model 1',
        isGenerating: true,
        error: null
      })

      // Check completion progress
      expect(progressCallback).toHaveBeenCalledWith({
        total: 1,
        processed: 1,
        current: null,
        isGenerating: false,
        error: null
      })
    })

    it('works without progress callback', async () => {
      const mockModels = [{
        id: 'model-1',
        glb_url: 'https://example.com/model1.glb',
        name: 'Model 1',
        thumbnail_status: null,
        thumbnail_url: null
      }]

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockModels,
                error: null
              })
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: null
          })
        }))
      })

      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          thumbnail_url: 'https://example.com/thumb.jpg',
          angles: {}
        })
      })

      // Should not throw when no callback provided
      await expect(service.autoGenerateThumbnails('user-123')).resolves.toBeUndefined()
    })
  })
}) 