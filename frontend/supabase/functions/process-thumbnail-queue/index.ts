import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey'
  }
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get next batch of pending thumbnails
    const { data: queue, error: queueError } = await supabase
      .from('thumbnail_processing_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10)
    
    if (queueError) {
      throw new Error(`Failed to fetch queue: ${queueError.message}`)
    }
    
    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ 
        processed: 0, 
        message: 'No pending thumbnails to process' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    let processed = 0
    let errors = 0
    
    for (const item of queue) {
      try {
        // Mark as processing
        await supabase
          .from('thumbnail_processing_queue')
          .update({ 
            status: 'processing',
            processing_started_at: new Date().toISOString()
          })
          .eq('id', item.id)
        
        // Get model data
        const { data: model, error: modelError } = await supabase
          .from('generated_models')
          .select('*')
          .eq('id', item.model_id)
          .single()
        
        if (modelError || !model) {
          throw new Error(`Model not found: ${modelError?.message || 'Unknown error'}`)
        }
        
        if (!model.glb_url) {
          throw new Error('Model has no GLB URL')
        }
        
        // Call the thumbnail generation function
        const thumbnailFunctionUrl = `${supabaseUrl}/functions/v1/generate-thumbnail`
        const response = await fetch(thumbnailFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            modelId: model.id,
            glbUrl: model.glb_url,
            angles: [0, 45, 90, 135, 'isometric'],
            quality: 'fast'
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`Thumbnail generation failed: ${errorData.error || response.statusText}`)
        }
        
        const thumbnailResult = await response.json()
        
        if (thumbnailResult.error) {
          throw new Error(thumbnailResult.error)
        }
        
        // Update model with thumbnail data
        const { error: updateError } = await supabase
          .from('generated_models')
          .update({
            thumbnail_url: thumbnailResult.angles[thumbnailResult.selectedAngle.toString()],
            thumbnail_angles: thumbnailResult.angles,
            thumbnail_selected: thumbnailResult.selectedAngle,
            thumbnail_status: 'completed',
            thumbnail_custom: false
          })
          .eq('id', model.id)
        
        if (updateError) {
          throw new Error(`Failed to update model: ${updateError.message}`)
        }
        
        // Mark queue item as completed
        await supabase
          .from('thumbnail_processing_queue')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
        
        processed++
        
      } catch (error) {
        console.error(`Error processing thumbnail for model ${item.model_id}:`, error)
        
        // Handle retry logic
        const attempts = item.attempts + 1
        const status = attempts >= item.max_attempts ? 'failed' : 'pending'
        
        await supabase
          .from('thumbnail_processing_queue')
          .update({
            status,
            attempts,
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
        
        errors++
      }
    }
    
    return new Response(JSON.stringify({ 
      processed, 
      errors,
      total: queue.length,
      message: `Processed ${processed} thumbnails, ${errors} errors`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Error in process-thumbnail-queue function:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      processed: 0,
      errors: 1
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}) 