import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ThumbnailRequest {
  modelId: string
  glbUrl: string
  angles: (number | string)[]
  quality: 'fast' | 'high'
}

interface ThumbnailResult {
  modelId: string
  angles: {
    [key: string]: string // URL to thumbnail
  }
  selectedAngle: number | string
  error?: string
}

const THUMBNAIL_CONFIG = {
  fast: {
    width: 400,
    height: 200,
    samples: 1,
    antialias: false,
    shadowMap: false
  },
  high: {
    width: 800,
    height: 400,
    samples: 4,
    antialias: true,
    shadowMap: true
  }
}

// Mock Three.js rendering for Deno environment
// In a real implementation, you'd use a headless Three.js renderer
async function renderModelToCanvas(glbUrl: string, angle: number | string, config: any): Promise<Blob> {
  // For now, we'll create a placeholder image
  // In production, this would use Three.js to render the actual 3D model
  
  // Create a canvas with the specified dimensions
  const canvas = new OffscreenCanvas(config.width, config.height)
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }
  
  // Create a gradient background
  const gradient = ctx.createLinearGradient(0, 0, config.width, config.height)
  gradient.addColorStop(0, '#f3f4f6')
  gradient.addColorStop(1, '#e5e7eb')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, config.width, config.height)
  
  // Draw a placeholder 3D model representation
  ctx.fillStyle = '#8b5cf6'
  ctx.strokeStyle = '#7c3aed'
  ctx.lineWidth = 2
  
  // Draw a simple 3D cube representation
  const centerX = config.width / 2
  const centerY = config.height / 2
  const size = Math.min(config.width, config.height) * 0.3
  
  // Front face
  ctx.fillRect(centerX - size/2, centerY - size/2, size, size)
  ctx.strokeRect(centerX - size/2, centerY - size/2, size, size)
  
  // Side face (perspective)
  ctx.fillStyle = '#a855f7'
  ctx.fillRect(centerX + size/4, centerY - size/2, size/2, size)
  ctx.strokeRect(centerX + size/4, centerY - size/2, size/2, size)
  
  // Top face
  ctx.fillStyle = '#9333ea'
  ctx.fillRect(centerX - size/2, centerY - size/2, size, size/2)
  ctx.strokeRect(centerX - size/2, centerY - size/2, size, size/2)
  
  // Add angle label
  ctx.fillStyle = '#374151'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(`Angle: ${angle}`, centerX, config.height - 10)
  
  // Convert canvas to blob
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
}

async function generateThumbnails(request: ThumbnailRequest): Promise<ThumbnailResult> {
  const config = THUMBNAIL_CONFIG[request.quality]
  const results: { [key: string]: string } = {}
  
  try {
    // Generate thumbnails for each angle
    for (const angle of request.angles) {
      const blob = await renderModelToCanvas(request.glbUrl, angle, config)
      
      // Upload to Supabase Storage
      const fileName = `${request.modelId}/angle-${angle}.jpg`
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data, error } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        })
      
      if (error) {
        console.error(`Failed to upload thumbnail for angle ${angle}:`, error)
        continue
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName)
      
      results[angle.toString()] = urlData.publicUrl
    }
    
    // Default to first angle if available, otherwise 45 degrees
    const defaultAngle = request.angles[0] || 45
    
    return {
      modelId: request.modelId,
      angles: results,
      selectedAngle: defaultAngle
    }
    
  } catch (error) {
    console.error('Error generating thumbnails:', error)
    return {
      modelId: request.modelId,
      angles: {},
      selectedAngle: 0,
      error: error.message
    }
  }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const { modelId, glbUrl, angles = [0, 45, 90, 135, 'isometric'], quality = 'fast' } = await req.json()
    
    if (!modelId || !glbUrl) {
      return new Response(JSON.stringify({ 
        error: 'modelId and glbUrl are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const result = await generateThumbnails({
      modelId,
      glbUrl,
      angles,
      quality
    })
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Error in generate-thumbnail function:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}) 