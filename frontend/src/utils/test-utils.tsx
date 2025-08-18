import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../hooks/useAuth'
import { vi } from 'vitest'
import { mockAuthValue } from '../__tests__/mocks/auth'

// Mock useAuth hook globally
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockAuthValue,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Custom wrapper that includes all providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  )
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockModel = (overrides = {}) => ({
  id: 'model-123',
  user_id: 'user-123',
  name: 'Test Model',
  prompt: 'A test 3D model',
  style: 'realistic',
  obj_url: 'https://example.com/model.obj',
  stl_url: 'https://example.com/model.stl',
  glb_url: 'https://example.com/model.glb',
  thumbnail_url: 'https://example.com/thumbnail.jpg',
  status: 'completed',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

export const createMockFile = (
  name = 'test.jpg',
  type = 'image/jpeg',
  size = 1024
) => {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Helper for testing async components
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Helper for testing Three.js components
export const mockThreeJS = () => {
  const mockScene = {
    add: vi.fn(),
    remove: vi.fn(),
    children: []
  }
  
  const mockCamera = {
    position: { set: vi.fn(), x: 0, y: 0, z: 5 },
    lookAt: vi.fn()
  }
  
  const mockRenderer = {
    render: vi.fn(),
    setSize: vi.fn(),
    domElement: document.createElement('canvas')
  }
  
  const mockGLTF = {
    scene: mockScene,
    animations: [],
    asset: {},
    cameras: [],
    parser: {},
    userData: {}
  }
  
  return {
    mockScene,
    mockCamera,
    mockRenderer,
    mockGLTF
  }
}

// Helper for testing file uploads
export const createMockFileEvent = (files: File[]) => {
  const mockEvent = {
    target: {
      files: {
        length: files.length,
        item: (index: number) => files[index],
        [Symbol.iterator]: function* () {
          for (const file of files) {
            yield file
          }
        }
      }
    }
  }
  
  // Add array methods
  Object.assign(mockEvent.target.files, files)
  
  return mockEvent as any
} 