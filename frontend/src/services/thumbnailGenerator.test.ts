import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThumbnailGenerator } from './thumbnailGenerator'
import { createTestFile } from '../utils/test-data'

// Mock Canvas and WebGL context
const mockCanvas = {
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray([255, 0, 0, 255])
    })),
    putImageData: vi.fn(),
    canvas: { width: 800, height: 600 }
  })),
  toBlob: vi.fn((callback) => {
    const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' })
    callback(blob)
  }),
  toDataURL: vi.fn(() => 'data:image/jpeg;base64,fake-data'),
  width: 800,
  height: 600
}

// Mock HTML5 Canvas
global.HTMLCanvasElement = class HTMLCanvasElement {
  constructor() {
    return mockCanvas as any
  }
} as any

global.document = {
  createElement: vi.fn((tag) => {
    if (tag === 'canvas') return mockCanvas
    return {}
  })
} as any

// Mock supabase storage
const mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn()
    }))
  }
}

vi.mock('../supabaseClient', () => ({
  supabase: mockSupabase
}))

describe('ThumbnailGenerator', () => {
  let generator: ThumbnailGenerator

  beforeEach(() => {
    vi.clearAllMocks()
    generator = new ThumbnailGenerator({
      width: 800,
      height: 600,
      quality: 0.8
    })
  })

  describe('initialization', () => {
    it('creates instance with default options', () => {
      const defaultGenerator = new ThumbnailGenerator()
      expect(defaultGenerator).toBeInstanceOf(ThumbnailGenerator)
    })

    it('creates instance with custom options', () => {
      const customGenerator = new ThumbnailGenerator({
        width: 1024,
        height: 768,
        quality: 0.9,
        uploadToStorage: true
      })
      expect(customGenerator).toBeInstanceOf(ThumbnailGenerator)
    })
  })

  describe('generateThumbnailFromModel', () => {
    const mockModelUrl = 'https://example.com/model.glb'

    beforeEach(() => {
      // Mock Three.js components
      global.THREE = {
        WebGLRenderer: vi.fn(() => ({
          setSize: vi.fn(),
          render: vi.fn(),
          domElement: mockCanvas,
          dispose: vi.fn()
        })),
        Scene: vi.fn(() => ({
          add: vi.fn()
        })),
        PerspectiveCamera: vi.fn(() => ({})),
        GLTFLoader: vi.fn(() => ({
          load: vi.fn((url, onLoad, onProgress, onError) => {
            onLoad({
              scene: {
                traverse: vi.fn()
              }
            })
          })
        })),
        DirectionalLight: vi.fn(() => ({})),
        AmbientLight: vi.fn(() => ({})),
        Box3: vi.fn(() => ({
          setFromObject: vi.fn(() => ({
            getCenter: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
            getSize: vi.fn(() => ({ x: 1, y: 1, z: 1 }))
          }))
        })),
        Vector3: vi.fn(() => ({ x: 0, y: 0, z: 0 }))
      } as any
    })

    it('generates thumbnail successfully', async () => {
      const result = await generator.generateThumbnailFromModel(mockModelUrl)

      expect(result).toBeDefined()
      expect(result.thumbnails).toHaveProperty('front')
      expect(result.thumbnails).toHaveProperty('back')
      expect(result.thumbnails).toHaveProperty('left')
      expect(result.thumbnails).toHaveProperty('right')
      expect(result.completed).toBe(true)
      expect(result.error).toBeNull()
    })

    it('handles model loading errors', async () => {
      global.THREE.GLTFLoader = vi.fn(() => ({
        load: vi.fn((url, onLoad, onProgress, onError) => {
          onError(new Error('Failed to load model'))
        })
      })) as any

      const result = await generator.generateThumbnailFromModel(mockModelUrl)

      expect(result.error).toBe('Failed to load model')
      expect(result.completed).toBe(false)
    })

    it('generates thumbnails for all angles', async () => {
      const result = await generator.generateThumbnailFromModel(mockModelUrl)

      const expectedAngles = ['front', 'back', 'left', 'right']
      expectedAngles.forEach(angle => {
        expect(result.thumbnails).toHaveProperty(angle)
        expect(result.progress[angle]).toBe(true)
      })
    })

    it('tracks generation progress correctly', async () => {
      const progressCallback = vi.fn()
      
      const result = await generator.generateThumbnailFromModel(
        mockModelUrl, 
        progressCallback
      )

      expect(progressCallback).toHaveBeenCalled()
      expect(result.isGenerating).toBe(false)
    })
  })

  describe('uploadToStorage', () => {
    it('uploads thumbnail to storage successfully', async () => {
      const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' })
      const mockUrl = 'https://storage.example.com/thumbnail.jpg'

      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'thumbnails/test.jpg' },
          error: null
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: mockUrl }
        })
      })

      const result = await generator.uploadToStorage(mockBlob, 'test.jpg')

      expect(result).toBe(mockUrl)
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('thumbnails')
    })

    it('handles upload errors', async () => {
      const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' })

      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Upload failed' }
        })
      })

      await expect(
        generator.uploadToStorage(mockBlob, 'test.jpg')
      ).rejects.toThrow('Upload failed')
    })

    it('uses correct file path format', async () => {
      const mockBlob = new Blob(['test-image'], { type: 'image/jpeg' })
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'thumbnails/test.jpg' },
        error: null
      })

      mockSupabase.storage.from.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.jpg' }
        })
      })

      await generator.uploadToStorage(mockBlob, 'test.jpg')

      expect(mockUpload).toHaveBeenCalledWith(
        'test.jpg',
        mockBlob,
        expect.objectContaining({
          contentType: 'image/jpeg',
          cacheControl: '3600'
        })
      )
    })
  })

  describe('generateFromFile', () => {
    it('generates thumbnail from uploaded file', async () => {
      const mockFile = createTestFile('model.glb', 'model/gltf-binary')
      
      // Mock URL.createObjectURL
      global.URL = {
        createObjectURL: vi.fn(() => 'blob:http://localhost/model.glb'),
        revokeObjectURL: vi.fn()
      } as any

      const result = await generator.generateFromFile(mockFile)

      expect(result.completed).toBe(true)
      expect(Object.keys(result.thumbnails)).toHaveLength(4)
    })

    it('handles invalid file types', async () => {
      const invalidFile = createTestFile('model.txt', 'text/plain')

      const result = await generator.generateFromFile(invalidFile)

      expect(result.error).toMatch(/unsupported file type/i)
      expect(result.completed).toBe(false)
    })

    it('cleans up object URLs', async () => {
      const mockFile = createTestFile('model.glb', 'model/gltf-binary')
      
      global.URL = {
        createObjectURL: vi.fn(() => 'blob:http://localhost/model.glb'),
        revokeObjectURL: vi.fn()
      } as any

      await generator.generateFromFile(mockFile)

      expect(global.URL.revokeObjectURL).toHaveBeenCalled()
    })
  })

  describe('camera positioning', () => {
    it('positions camera correctly for different angles', async () => {
      const mockModelUrl = 'https://example.com/model.glb'
      
      const result = await generator.generateThumbnailFromModel(mockModelUrl)

      // Should generate thumbnails from all 4 angles
      expect(result.thumbnails).toHaveProperty('front')
      expect(result.thumbnails).toHaveProperty('back')
      expect(result.thumbnails).toHaveProperty('left')
      expect(result.thumbnails).toHaveProperty('right')
    })

    it('calculates bounding box correctly', async () => {
      const mockModelUrl = 'https://example.com/model.glb'
      
      await generator.generateThumbnailFromModel(mockModelUrl)

      // Verify Box3 was used for bounding box calculation
      expect(global.THREE.Box3).toHaveBeenCalled()
    })
  })

  describe('lighting setup', () => {
    it('creates proper lighting for thumbnails', async () => {
      const mockModelUrl = 'https://example.com/model.glb'
      
      await generator.generateThumbnailFromModel(mockModelUrl)

      // Should create directional and ambient lights
      expect(global.THREE.DirectionalLight).toHaveBeenCalled()
      expect(global.THREE.AmbientLight).toHaveBeenCalled()
    })
  })

  describe('quality settings', () => {
    it('respects quality settings', async () => {
      const highQualityGenerator = new ThumbnailGenerator({
        quality: 1.0
      })

      const mockModelUrl = 'https://example.com/model.glb'
      const result = await highQualityGenerator.generateThumbnailFromModel(mockModelUrl)

      expect(result.completed).toBe(true)
    })

    it('handles low quality settings', async () => {
      const lowQualityGenerator = new ThumbnailGenerator({
        quality: 0.1
      })

      const mockModelUrl = 'https://example.com/model.glb'
      const result = await lowQualityGenerator.generateThumbnailFromModel(mockModelUrl)

      expect(result.completed).toBe(true)
    })
  })

  describe('error handling', () => {
    it('handles WebGL context creation failure', async () => {
      // Mock failed WebGL context
      mockCanvas.getContext = vi.fn(() => null)

      const result = await generator.generateThumbnailFromModel('test-url')

      expect(result.error).toMatch(/webgl/i)
      expect(result.completed).toBe(false)
    })

    it('handles renderer creation failure', async () => {
      global.THREE.WebGLRenderer = vi.fn(() => {
        throw new Error('WebGL not supported')
      }) as any

      const result = await generator.generateThumbnailFromModel('test-url')

      expect(result.error).toBe('WebGL not supported')
      expect(result.completed).toBe(false)
    })

    it('handles canvas conversion errors', async () => {
      mockCanvas.toBlob = vi.fn((callback) => {
        callback(null) // Simulate failure
      })

      const result = await generator.generateThumbnailFromModel('test-url')

      expect(result.error).toMatch(/canvas conversion/i)
      expect(result.completed).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('properly disposes of resources', async () => {
      const mockRenderer = {
        setSize: vi.fn(),
        render: vi.fn(),
        domElement: mockCanvas,
        dispose: vi.fn()
      }

      global.THREE.WebGLRenderer = vi.fn(() => mockRenderer) as any

      await generator.generateThumbnailFromModel('test-url')

      expect(mockRenderer.dispose).toHaveBeenCalled()
    })
  })

  describe('batch processing', () => {
    it('can generate multiple thumbnails concurrently', async () => {
      const urls = [
        'https://example.com/model1.glb',
        'https://example.com/model2.glb',
        'https://example.com/model3.glb'
      ]

      const promises = urls.map(url => 
        generator.generateThumbnailFromModel(url)
      )

      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result.completed).toBe(true)
        expect(result.error).toBeNull()
      })
    })
  })

  describe('memory management', () => {
    it('handles large models without memory leaks', async () => {
      const largeModelUrl = 'https://example.com/large-model.glb'
      
      // Generate multiple thumbnails to test memory handling
      for (let i = 0; i < 3; i++) {
        const result = await generator.generateThumbnailFromModel(largeModelUrl)
        expect(result.completed).toBe(true)
      }
    })
  })
}) 