import { http, HttpResponse } from 'msw'

const BASE_URL = 'http://localhost:5175'
const SUPABASE_URL = 'https://your-project.supabase.co'

export const handlers = [
  // Supabase Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z'
      }
    })
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        name: 'Test User'
      }
    })
  }),

  // Supabase database endpoints
  http.get(`${SUPABASE_URL}/rest/v1/generated_models`, () => {
    return HttpResponse.json([
      {
        id: 'model-1',
        user_id: 'user-123',
        name: 'Test Model 1',
        prompt: 'A futuristic car',
        status: 'completed',
        glb_url: 'https://example.com/model1.glb',
        thumbnail_url: 'https://example.com/thumb1.jpg',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'model-2',
        user_id: 'user-123',
        name: 'Test Model 2',
        prompt: 'A modern house',
        status: 'processing',
        glb_url: null,
        thumbnail_url: null,
        created_at: '2024-01-02T00:00:00Z'
      }
    ])
  }),

  http.post(`${SUPABASE_URL}/rest/v1/generated_models`, () => {
    return HttpResponse.json({
      id: 'new-model-123',
      user_id: 'user-123',
      name: 'New Model',
      status: 'processing',
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  // Supabase Edge Functions
  http.post(`${SUPABASE_URL}/functions/v1/generate-3d-model`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        task_id: 'task-123',
        status: 'processing',
        model_id: 'model-123'
      }
    })
  }),

  http.post(`${SUPABASE_URL}/functions/v1/generate-thumbnail`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        thumbnail_url: 'https://example.com/generated-thumbnail.jpg',
        angles: {
          front: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...',
          side: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...'
        }
      }
    })
  }),

  // Meshy API endpoints (via proxy)
  http.post(`${BASE_URL}/api/meshy/text-to-3d`, () => {
    return HttpResponse.json({
      id: 'meshy-task-123',
      status: 'pending'
    })
  }),

  http.get(`${BASE_URL}/api/meshy/text-to-3d/:taskId`, ({ params }) => {
    const { taskId } = params
    return HttpResponse.json({
      id: taskId,
      status: 'succeeded',
      model_urls: {
        glb: `https://assets.meshy.ai/models/${taskId}.glb`,
        obj: `https://assets.meshy.ai/models/${taskId}.obj`
      },
      thumbnail_url: `https://assets.meshy.ai/thumbnails/${taskId}.jpg`
    })
  }),

  http.post(`${BASE_URL}/api/meshy/image-to-3d`, () => {
    return HttpResponse.json({
      id: 'meshy-image-task-123',
      status: 'pending'
    })
  }),

  // File download endpoints
  http.get(`${BASE_URL}/api/meshy/glb`, ({ request }) => {
    const url = new URL(request.url)
    const modelUrl = url.searchParams.get('url')
    
    // Return mock GLB binary data
    const mockGlbData = new ArrayBuffer(1024)
    return HttpResponse.arrayBuffer(mockGlbData, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Length': '1024'
      }
    })
  }),

  // Slant3D API endpoints
  http.post(`${SUPABASE_URL}/functions/v1/slant3d-quote`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        quote_id: 'quote-123',
        price: 25.99,
        estimated_days: 3
      }
    })
  }),

  http.post(`${SUPABASE_URL}/functions/v1/slant3d-order`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        order_id: 'order-123',
        status: 'processing',
        tracking_number: 'TRACK123456'
      }
    })
  }),

  // Thumbnail generation endpoints
  http.get(/.*\.(jpg|jpeg|png|webp)$/, () => {
    // Return a mock image
    const imageBuffer = new ArrayBuffer(2048)
    return HttpResponse.arrayBuffer(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': '2048'
      }
    })
  }),

  // Error scenarios for testing
  http.post(`${BASE_URL}/api/error-test`, () => {
    return HttpResponse.json(
      { error: 'Test error for error handling' },
      { status: 500 }
    )
  })
] 