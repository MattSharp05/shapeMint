import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// EdgeRuntime.waitUntil keeps the worker alive after sending the response
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { glbUrl, modelId, userId } = await req.json()

    if (!glbUrl || !modelId) {
      return new Response(
        JSON.stringify({ error: 'Missing glbUrl or modelId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const modalRepairUrl = Deno.env.get('MODAL_REPAIR_ENDPOINT_URL')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    if (!modalRepairUrl) {
      throw new Error('Missing MODAL_REPAIR_ENDPOINT_URL environment variable')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Create a signed upload URL so Modal can upload the STL directly
    const storagePath = userId
      ? `models/${userId}/${modelId}_repaired.stl`
      : `models/${modelId}_repaired.stl`

    console.log('📝 Creating signed upload URL for:', storagePath)

    const { data: signedUploadData, error: signedError } = await supabase.storage
      .from('3d-models')
      .createSignedUploadUrl(storagePath)

    if (signedError || !signedUploadData?.signedUrl) {
      throw new Error(`Failed to create signed upload URL: ${signedError?.message || 'no URL returned'}`)
    }

    // Calculate the public URL (doesn't require file to exist)
    const { data: { publicUrl } } = supabase.storage
      .from('3d-models')
      .getPublicUrl(storagePath)

    console.log('🔧 Dispatching repair to Modal:', glbUrl)

    // Step 2: Send request to Modal in the background
    // Modal will: repair mesh → upload STL via signed URL → update DB
    // EdgeRuntime.waitUntil keeps the worker alive after we send the response,
    // ensuring the fetch to Modal actually completes.
    const modalPromise = fetch(modalRepairUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        glb_url: glbUrl,
        upload_url: signedUploadData.signedUrl,
        stl_public_url: publicUrl,
        supabase_url: supabaseUrl,
        supabase_service_key: supabaseServiceKey,
        model_id: modelId,
        min_wall_thickness: 0.8,
        auto_solidify: true,
        voxel_fallback: true,
      }),
    })
      .then(async (resp) => {
        const data = await resp.json()
        console.log('✅ Modal completed:', { uploaded: data.uploaded, print_ready: data.report?.print_ready })
      })
      .catch((e: Error) => {
        console.error('❌ Modal request failed:', e.message)
      })

    // Keep the worker alive for the Modal request (runs after response is sent)
    EdgeRuntime.waitUntil(modalPromise)

    // Step 3: Return immediately to the client — repair runs in background
    return new Response(
      JSON.stringify({
        success: true,
        status: 'processing',
        stlUrl: publicUrl,
        message: 'Repair dispatched. STL will be available shortly.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ repair-and-export-stl error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
