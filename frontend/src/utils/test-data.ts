import { GeneratedModel } from '../types/model'
import { User } from '../types/user'

// User test data
export const mockUsers = {
  defaultUser: {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  } as User,

  adminUser: {
    id: 'admin-123',
    email: 'admin@example.com',
    full_name: 'Admin User',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  } as User
}

// Model test data
export const mockModels = {
  completedModel: {
    id: 'model-completed-123',
    user_id: 'user-123',
    name: 'Completed Model',
    prompt: 'A futuristic car with sleek design',
    style: 'realistic',
    obj_url: 'https://example.com/models/car.obj',
    stl_url: 'https://example.com/models/car.stl',
    glb_url: 'https://example.com/models/car.glb',
    thumbnail_url: 'https://example.com/thumbnails/car.jpg',
    thumbnail_angles: {
      front: 'data:image/jpeg;base64,front-image-data',
      side: 'data:image/jpeg;base64,side-image-data',
      top: 'data:image/jpeg;base64,top-image-data'
    },
    thumbnail_selected: 0,
    thumbnail_custom: false,
    thumbnail_status: 'completed',
    status: 'completed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  } as GeneratedModel,

  processingModel: {
    id: 'model-processing-123',
    user_id: 'user-123',
    name: 'Processing Model',
    prompt: 'A modern house with glass walls',
    style: 'realistic',
    obj_url: null,
    stl_url: null,
    glb_url: null,
    thumbnail_url: null,
    thumbnail_angles: null,
    thumbnail_selected: 0,
    thumbnail_custom: false,
    thumbnail_status: 'pending',
    status: 'processing',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  } as GeneratedModel,

  failedModel: {
    id: 'model-failed-123',
    user_id: 'user-123',
    name: 'Failed Model',
    prompt: 'An impossible object',
    style: 'realistic',
    obj_url: null,
    stl_url: null,
    glb_url: null,
    thumbnail_url: null,
    thumbnail_angles: null,
    thumbnail_selected: 0,
    thumbnail_custom: false,
    thumbnail_status: 'failed',
    thumbnail_error: 'Failed to generate thumbnail',
    status: 'failed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  } as GeneratedModel
}

// Order test data
export const mockOrders = {
  pendingOrder: {
    id: 'order-pending-123',
    user_id: 'user-123',
    slant_order_id: 'slant-123',
    order_number: 'ORD-001',
    customer_name: 'Test User',
    customer_email: 'test@example.com',
    filename: 'car-model.stl',
    quantity: 1,
    color: 'Red',
    profile: 'PLA',
    status: 'pending',
    tracking_numbers: [],
    shipping_status: 'processing',
    shipping_address: {
      name: 'Test User',
      street1: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      zip: '12345'
    },
    created_at: '2024-01-01T00:00:00Z'
  },

  shippedOrder: {
    id: 'order-shipped-123',
    user_id: 'user-123',
    slant_order_id: 'slant-456',
    order_number: 'ORD-002',
    customer_name: 'Test User',
    customer_email: 'test@example.com',
    filename: 'house-model.stl',
    quantity: 2,
    color: 'Blue',
    profile: 'ABS',
    status: 'shipped',
    tracking_numbers: ['TRACK123456', 'TRACK789012'],
    shipping_status: 'shipped',
    label_download_url: 'https://example.com/labels/order-456.pdf',
    shipping_address: {
      name: 'Test User',
      street1: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      zip: '12345'
    },
    created_at: '2024-01-01T00:00:00Z'
  }
}

// API Response mocks
export const mockAPIResponses = {
  meshySuccess: {
    id: 'meshy-task-123',
    status: 'succeeded',
    model_urls: {
      glb: 'https://assets.meshy.ai/models/task-123.glb',
      obj: 'https://assets.meshy.ai/models/task-123.obj'
    },
    thumbnail_url: 'https://assets.meshy.ai/thumbnails/task-123.jpg',
    created_at: '2024-01-01T00:00:00Z'
  },

  meshyPending: {
    id: 'meshy-task-456',
    status: 'pending',
    progress: 45,
    created_at: '2024-01-01T00:00:00Z'
  },

  meshyFailed: {
    id: 'meshy-task-789',
    status: 'failed',
    task_error: {
      message: 'Failed to generate model from prompt'
    },
    created_at: '2024-01-01T00:00:00Z'
  },

  slant3dQuote: {
    success: true,
    data: {
      quote_id: 'quote-123',
      price: 25.99,
      estimated_days: 3,
      materials: ['PLA', 'ABS', 'PETG'],
      colors: ['Red', 'Blue', 'Green', 'Black', 'White']
    }
  },

  slant3dOrder: {
    success: true,
    data: {
      order_id: 'order-123',
      status: 'processing',
      tracking_number: 'TRACK123456',
      estimated_delivery: '2024-01-07T00:00:00Z'
    }
  }
}

// File test data
export const mockFiles = {
  jpegImage: new File(['jpeg content'], 'test-image.jpg', { type: 'image/jpeg' }),
  pngImage: new File(['png content'], 'test-image.png', { type: 'image/png' }),
  invalidFile: new File(['text content'], 'test.txt', { type: 'text/plain' }),
  largeImage: (() => {
    const largeFile = new File(['large content'], 'large-image.jpg', { type: 'image/jpeg' })
    Object.defineProperty(largeFile, 'size', { value: 15 * 1024 * 1024 }) // 15MB
    return largeFile
  })()
}

// Form data mocks
export const mockFormData = {
  validLoginForm: {
    email: 'test@example.com',
    password: 'password123'
  },

  validRegisterForm: {
    email: 'newuser@example.com',
    password: 'password123',
    name: 'New User'
  },

  validGenerationForm: {
    prompt: 'A futuristic spaceship',
    settings: {
      size: 'medium',
      style: 'realistic',
      quality: 'standard'
    }
  },

  validOrderForm: {
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    shippingAddress: {
      name: 'Test User',
      street: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      zip: '12345'
    },
    quantity: 1,
    color: 'Red',
    material: 'PLA'
  }
}

// Error test data
export const mockErrors = {
  networkError: new Error('Network request failed'),
  authError: new Error('Authentication failed'),
  validationError: new Error('Validation failed'),
  notFoundError: new Error('Resource not found'),
  serverError: new Error('Internal server error')
}

// Helper functions for creating test data
export const createTestModel = (overrides: Partial<GeneratedModel> = {}): GeneratedModel => ({
  ...mockModels.completedModel,
  ...overrides
})

export const createTestUser = (overrides: Partial<User> = {}): User => ({
  ...mockUsers.defaultUser,
  ...overrides
})

export const createTestFile = (
  name = 'test.jpg',
  type = 'image/jpeg',
  content = 'test content',
  size = 1024
): File => {
  const file = new File([content], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
} 