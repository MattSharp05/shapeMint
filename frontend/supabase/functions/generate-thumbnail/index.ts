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

// Simple mock thumbnail generation
async function generateMockThumbnail(modelId: string, angle: number | string): Promise<string> {
  // Return a simple data URL for testing
  // In production, this would be a real 3D render
  const svg = `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="16" fill="#374151">
      Thumbnail ${angle}° for ${modelId.slice(0, 8)}
    </text>
  </svg>`
  
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

async function generateThumbnails(request: ThumbnailRequest): Promise<ThumbnailResult> {
  const results: { [key: string]: string } = {}
  
  try {
    // Generate thumbnails for each angle
    for (const angle of request.angles) {
      const thumbnailUrl = await generateMockThumbnail(request.modelId, angle)
      results[angle.toString()] = thumbnailUrl
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