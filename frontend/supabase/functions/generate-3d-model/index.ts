import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== HIGH-QUALITY 3D MODEL GENERATION ===')
    
    // Handle both JSON and FormData requests
    let prompt, imageData, userId, mode = 'preview'
    
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (image uploads)
      console.log('📦 Processing FormData request')
      const formData = await req.formData()
      
      prompt = formData.get('prompt')?.toString() || ''
      userId = formData.get('user_id')?.toString()
      mode = formData.get('mode')?.toString() || 'preview'
      
      // Handle image file
      const imageFile = formData.get('image') as File
      if (imageFile) {
        console.log('🖼️ Processing uploaded image:', {
          name: imageFile.name,
          size: imageFile.size,
          type: imageFile.type
        })
        
        // Convert image file to base64 data URL (safe for large images)
        const arrayBuffer = await imageFile.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // Safe base64 conversion that won't cause stack overflow
        let binary = ''
        const chunkSize = 8192 // Process in chunks to avoid stack overflow
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.slice(i, i + chunkSize)
          binary += String.fromCharCode.apply(null, Array.from(chunk))
        }
        const base64 = btoa(binary)
        imageData = `data:${imageFile.type};base64,${base64}`
        
        console.log('✅ Image converted to base64, size:', Math.round(base64.length * 0.75 / 1024), 'KB')
      }
    } else {
      // Handle JSON request (text-to-3D)
      console.log('📄 Processing JSON request')
      const jsonData = await req.json()
      prompt = jsonData.prompt
      imageData = jsonData.image
      userId = jsonData.user_id
      mode = jsonData.mode || 'preview'
    }
    
    // Environment validation
    const meshyApiKey = Deno.env.get('MESHY_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!meshyApiKey) {
      throw new Error('MESHY_API_KEY not configured')
    }
    
    if (!userId) {
      throw new Error('User ID is required')
    }

    if (!prompt && !imageData) {
      throw new Error('Either prompt or image is required')
    }

    console.log('🎨 Generation request:', { 
      hasPrompt: !!prompt, 
      hasImage: !!imageData, 
      mode,
      userId 
    })

    // Initialize Supabase client for database operations
    const supabase = supabaseUrl && supabaseServiceKey 
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null

    // Determine API configuration based on input type
    let apiUrl, requestBody, generationType

    if (imageData) {
      // 🖼️ IMAGE-TO-3D: Use v1 API with enhanced quality settings
      generationType = 'image-to-3d'
      apiUrl = 'https://api.meshy.ai/openapi/v1/image-to-3d'
      
      // 🔧 Simplified image validation to prevent recursion
      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        console.log('📸 Processing base64 image')
        
        try {
          // Simple validation without complex processing
          const parts = imageData.split(',')
          if (parts.length !== 2) {
            throw new Error('Invalid base64 image format')
          }
          
          const header = parts[0]
          const base64Data = parts[1]
          
          // Basic size check
          if (base64Data.length > 15000000) { // ~10MB in base64
            throw new Error('Image too large. Please use a smaller image.')
          }
          
          console.log('✅ Image validation passed')
        } catch (validationError) {
          console.error('❌ Image validation failed:', validationError)
          throw new Error('Image validation failed: ' + validationError.message)
        }
      }
      
      // 🚀 Enhanced quality settings for image-to-3D
      requestBody = {
        image_url: imageData,
        enable_pbr: true,           // Physical Based Rendering
        should_remesh: true,        // Better topology
        should_texture: true,       // Enhanced texturing
        topology: 'quad',           // Better mesh quality
        target_polycount: 20000,    // Higher polygon count for quality
        texture_resolution: 1024    // Higher texture resolution
      }
      
      console.log('🎯 Using v1 Image-to-3D API with enhanced quality settings')
      
    } else {
      // 📝 TEXT-TO-3D: Use v2 API with quality optimizations
      generationType = 'text-to-3d'
      apiUrl = 'https://api.meshy.ai/openapi/v2/text-to-3d'
      
      requestBody = {
        mode: mode === 'refine' ? 'refine' : 'preview', // Support both modes
        prompt: prompt.trim(),
        art_style: 'realistic',
        should_remesh: true,
        negative_prompt: 'low quality, low resolution, low poly, ugly, blurry, pixelated, deformed, distorted',
        topology: 'quad',
        target_polycount: mode === 'refine' ? 50000 : 20000 // Higher quality for refine mode
      }
      
      console.log('🎯 Using v2 Text-to-3D API with quality optimizations')
    }

    // 🚀 Start generation with Meshy API
    console.log('⚡ Starting generation...')
    
    const startTime = Date.now()
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${meshyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseTime = Date.now() - startTime
    console.log(`📡 Meshy API response time: ${responseTime}ms`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Meshy API error:', errorText)
      throw new Error(`Meshy API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const taskId = data.result || data.task_id || data.id

    if (!taskId) {
      console.error('❌ No task ID in response:', data)
      throw new Error('No task ID received from Meshy API')
    }

    console.log('✅ Generation started successfully!')
    console.log('🆔 Task ID:', taskId)

    // 💾 Save task to database for tracking (if Supabase is available)
    if (supabase) {
      try {
        const taskRecord = {
          id: taskId,
          user_id: userId,
          prompt: prompt || 'Image-to-3D generation',
          name: prompt || `Generated Model ${new Date().toLocaleDateString()}`,
          type: generationType,
          status: 'processing',
          mode: mode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { error: dbError } = await supabase
          .from('generated_models')
          .upsert(taskRecord)

        if (dbError) {
          console.error('⚠️ Database save error (non-critical):', dbError)
        } else {
          console.log('💾 Task saved to database')
        }
      } catch (dbError) {
        console.error('⚠️ Database operation failed (non-critical):', dbError)
      }
    }

    // 🎉 IMMEDIATE RETURN - No polling, no timeout risk
    const responseData = {
      success: true,
      data: {
        taskId: taskId,
        id: taskId,
        status: 'processing',
        type: generationType,
        mode: mode,
        message: 'High-quality 3D model generation started successfully',
        estimated_time: generationType === 'image-to-3d' ? '2-5 minutes' : '3-8 minutes',
        // Provide polling endpoint for frontend
        poll_url: `${apiUrl}/${taskId}`,
        // Return task info for frontend tracking
        generation_info: {
          started_at: new Date().toISOString(),
          quality_settings: 'enhanced',
          api_version: generationType === 'image-to-3d' ? 'v1' : 'v2'
        }
      }
    }

    console.log('🚀 Returning immediate response - generation continues in background')
    
    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202 // Accepted - processing started
      }
    )

  } catch (error) {
    console.error('💥 Edge function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        details: {
          timestamp: new Date().toISOString(),
          function: 'generate-3d-model'
        }
      }),
      {
        status: error.message.includes('required') || error.message.includes('Unsupported') ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
