import { serve } from 'std/http/server.ts'
import { createClient } from '@supabase/supabase-js'

// Explicitly declare Deno namespace for Edge Function environment
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt = '', image: imageData, user_id: userId, type, mode = 'preview', dimensions, modelId: existingModelId } = await req.json()

    const meshyApiKey = Deno.env.get('MESHY_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!meshyApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables.')
    }

    const effectiveUserId = userId || null
    if (!type) throw new Error('Generation type is required.')
    if (!prompt && !imageData) throw new Error('Either prompt or image is required.')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let apiUrl: string
    let requestBody: object

    if (type === 'image-to-3d') {
      apiUrl = 'https://api.meshy.ai/v1/image-to-3d'
      requestBody = {
        image_url: imageData,
        enable_pbr: true,
        should_texture: true,
        auto_size: true,
      }
      console.log('🎯 Using v1 Image-to-3D API.')
    } else if (type === 'multi-image-to-3d') {
      apiUrl = 'https://api.meshy.ai/v1/multi-image-to-3d'
      requestBody = {
        image_urls: imageData, // imageData is string[] for multi-image
        enable_pbr: true,
        auto_size: true,
      }
      console.log('🎯 Using Multi-Image-to-3D API with', Array.isArray(imageData) ? imageData.length : 0, 'images.')
      console.log('📸 Image URLs:', JSON.stringify(imageData))
    } else if (type === 'text-to-3d') {
      apiUrl = 'https://api.meshy.ai/v2/text-to-3d' // Use v2 for Text-to-3D
      requestBody = {
        prompt: prompt.trim(),
        art_style: 'realistic', // v2 requires an art style
        mode: mode, // 'preview' or 'refine'
        enable_pbr: true,
        auto_size: true,
      }
      console.log('🎯 Using v2 Text-to-3D API.')
    } else {
      throw new Error('Invalid generation type specified.')
    }

    console.log('📤 Calling Meshy API:', apiUrl)
    console.log('📤 Request body:', JSON.stringify(requestBody))

    let meshyResponse: Response
    try {
      meshyResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${meshyApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
    } catch (fetchErr: any) {
      console.error('❌ Meshy fetch crashed:', fetchErr.message, fetchErr.stack)
      throw new Error(`Meshy API fetch failed: ${fetchErr.message}`)
    }

    console.log('📥 Meshy response status:', meshyResponse.status)

    if (!meshyResponse.ok) {
      const errorText = await meshyResponse.text()
      console.error(`❌ Meshy API Error: ${meshyResponse.status}`, errorText)
      throw new Error(`Meshy API request failed: ${errorText}`)
    }

    const meshyData = await meshyResponse.json()
    console.log('📥 Meshy response data:', JSON.stringify(meshyData))
    const taskId = meshyData?.result

    if (!taskId) {
      console.error('❌ No task ID found in Meshy response:', meshyData)
      throw new Error('Failed to get task ID from Meshy.')
    }

    console.log(`🎯 Meshy task created: ${taskId} (type=${type}, mode=${mode})`)
    console.log(`🎯 Webhook should fire at: meshy-webhook?secret=*** when task ${taskId} completes`)

    // Try to save to database
    let recordId: string | null = null

    // If we have a real user, ensure they exist in users table (FK constraint)
    if (effectiveUserId) {
      const { error: userError } = await supabase
        .from('users')
        .upsert({ id: effectiveUserId }, { onConflict: 'id', ignoreDuplicates: true })

      if (userError) {
        console.warn('⚠️ Could not ensure user record:', userError.message)
      }
    }

    const taskRecord: Record<string, any> = {
      user_id: effectiveUserId, // null for anonymous users
      prompt: prompt || 'Image-to-3D generation',
      type: type,
      status: 'processing',
      stage: 'generating_3d',
      mode: mode,
      meshy_task_id: taskId,
      notes: `Meshy task: ${taskId}`,
      is_marketplace_listed: true,
    }
    if (dimensions) {
      taskRecord.target_dimensions = dimensions
    }

    if (existingModelId) {
      // Phase 2: the client created a draft row earlier in the flow (when
      // 2D variations started generating). Update that row with the meshy
      // task info instead of inserting a duplicate.
      const { data: updatedRecord, error: updateErr } = await supabase
        .from('generated_models')
        .update(taskRecord)
        .eq('id', existingModelId)
        .select('id')
        .single()

      if (updateErr) {
        console.warn('⚠️ Draft update failed, falling back to insert:', updateErr.message)
      } else {
        recordId = updatedRecord?.id
        console.log(`✅ Draft model updated: recordId=${recordId}, meshyTaskId=${taskId}`)
      }
    }

    if (!recordId) {
      const { data: insertedRecord, error: dbError } = await supabase
        .from('generated_models')
        .insert(taskRecord)
        .select('id')
        .single()

      if (dbError) {
        console.warn('⚠️ Database save failed (non-critical):', dbError.message)
        console.warn('⚠️ DB error details:', JSON.stringify(dbError))
      } else {
        recordId = insertedRecord?.id
        console.log(`✅ Model saved to database: recordId=${recordId}, meshyTaskId=${taskId}`)
      }
    }

    // Use DB record ID if available, otherwise fall back to raw Meshy task ID
    const responseId = recordId || taskId
    if (!recordId) {
      console.log('ℹ️ No DB record — returning raw Meshy task ID:', taskId)
    }

    console.log(`📋 Summary: responseId=${responseId}, meshyTaskId=${taskId}, type=${type}, userId=${effectiveUserId || 'anonymous'}, dimensions=${dimensions ? JSON.stringify(dimensions) : 'none'}`)

    // Fire-and-forget: pre-warm the Blender repair container
    // so it's ready by the time Meshy finishes (1-5 minutes later)
    const modalWarmUrl = Deno.env.get('MODAL_WARM_ENDPOINT_URL')
    if (modalWarmUrl) {
      fetch(modalWarmUrl).catch((err: any) => {
        console.warn('⚠️ Modal warm-up ping failed (non-critical):', err.message)
      })
      console.log('🔥 Sent warm-up ping to Blender repair service')
    }

    return new Response(
      JSON.stringify({ success: true, data: { taskId: responseId, id: responseId, meshyTaskId: taskId, status: 'processing', type: type } }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202, // Accepted
      }
    )

  } catch (error: any) {
    console.error('Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
