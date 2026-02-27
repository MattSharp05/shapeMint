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
    const { prompt = '', image: imageData, user_id: userId, type, mode = 'preview' } = await req.json()

    const meshyApiKey = Deno.env.get('MESHY_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!meshyApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables.')
    }

    const effectiveUserId = userId || '00000000-0000-0000-0000-000000000000'
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
      }
      console.log('🎯 Using v1 Image-to-3D API.')
    } else if (type === 'text-to-3d') {
      apiUrl = 'https://api.meshy.ai/v2/text-to-3d' // Use v2 for Text-to-3D
      requestBody = {
        prompt: prompt.trim(),
        art_style: 'realistic', // v2 requires an art style
        mode: mode, // 'preview' or 'refine'
        enable_pbr: true,
      }
      console.log('🎯 Using v2 Text-to-3D API.')
    } else {
      throw new Error('Invalid generation type specified.')
    }

    const meshyResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${meshyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!meshyResponse.ok) {
      const errorText = await meshyResponse.text()
      console.error(`❌ Meshy API Error: ${meshyResponse.status}`, errorText)
      throw new Error(`Meshy API request failed: ${errorText}`)
    }

    const meshyData = await meshyResponse.json()
    const taskId = meshyData?.result

    if (!taskId) {
      console.error('❌ No task ID found in Meshy response:', meshyData)
      throw new Error('Failed to get task ID from Meshy.')
    }

    // Ensure user exists in the users table (satisfies foreign key constraint)
    const { error: userError } = await supabase
      .from('users')
      .upsert({ id: effectiveUserId }, { onConflict: 'id', ignoreDuplicates: true })

    if (userError) {
      console.warn('⚠️ Could not ensure user record:', userError.message)
    }

    const taskRecord = {
      user_id: effectiveUserId,
      prompt: prompt || 'Image-to-3D generation',
      type: type,
      status: 'processing',
      mode: mode,
      meshy_task_id: taskId,
      notes: `Meshy task: ${taskId}`,
      is_marketplace_listed: true // Default to true for all generated models
    }

    const { data: insertedRecord, error: dbError } = await supabase
      .from('generated_models')
      .insert(taskRecord)
      .select('id')
      .single()

    if (dbError) {
      console.error('⚠️ Database save error (critical):', dbError)
      throw new Error(`Failed to save model to database: ${dbError.message}`)
    }

    const recordId = insertedRecord?.id
    if (!recordId) {
      throw new Error('Failed to get database record ID')
    }

    console.log('✅ Model saved to database with ID:', recordId)

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
      JSON.stringify({ success: true, data: { taskId: recordId, id: recordId, meshyTaskId: taskId, status: 'processing', type: type } }),
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
