import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

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

  const requestStart = Date.now();
  console.log('🔧 [Hollow] Edge function invoked at', new Date().toISOString());

  try {
    const body = await req.json();
    const {
      modelUrl,
      modelId,
      userId,
      wallThickness = 2.0,
      drainHoles = 2,
      holeDiameter = 3.0,
      iterations = 300,
      stepSize = 0.2,
    } = body;

    console.log('🔧 [Hollow] Request params:', JSON.stringify({
      modelUrl: modelUrl ? `${modelUrl.slice(0, 80)}...` : 'MISSING',
      modelId,
      userId: userId || 'anonymous',
      wallThickness,
      drainHoles,
      holeDiameter,
      iterations,
      stepSize,
    }));

    if (!modelUrl || !modelId) {
      console.error('❌ [Hollow] Missing required fields: modelUrl or modelId');
      return new Response(
        JSON.stringify({ error: 'Missing modelUrl or modelId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const modalHollowUrl = Deno.env.get('MODAL_HOLLOW_ENDPOINT_URL')

    console.log('🔧 [Hollow] Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseServiceKey,
      hasModalUrl: !!modalHollowUrl,
      modalUrl: modalHollowUrl ? `${modalHollowUrl.slice(0, 50)}...` : 'MISSING',
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    if (!modalHollowUrl) {
      throw new Error('Missing MODAL_HOLLOW_ENDPOINT_URL environment variable')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create a signed upload URL for the hollowed STL
    const storagePath = userId
      ? `models/${userId}/${modelId}_hollowed.stl`
      : `models/${modelId}_hollowed.stl`

    console.log('📝 [Hollow] Creating signed upload URL for:', storagePath);

    const { data: signedUploadData, error: signedError } = await supabase.storage
      .from('3d-models')
      .createSignedUploadUrl(storagePath)

    if (signedError || !signedUploadData?.signedUrl) {
      console.error('❌ [Hollow] Failed to create signed upload URL:', signedError?.message);
      throw new Error(`Failed to create signed upload URL: ${signedError?.message || 'no URL returned'}`)
    }

    console.log('✅ [Hollow] Signed upload URL created successfully');

    const { data: { publicUrl } } = supabase.storage
      .from('3d-models')
      .getPublicUrl(storagePath)

    console.log('📦 [Hollow] Public URL will be:', publicUrl.slice(0, 80) + '...');

    const modalPayload = {
      model_url: modelUrl,
      wall_thickness: wallThickness,
      drain_holes: drainHoles,
      hole_diameter: holeDiameter,
      iterations,
      step_size: stepSize,
      upload_url: signedUploadData.signedUrl,
      stl_public_url: publicUrl,
    };

    console.log('🚀 [Hollow] Dispatching to Modal:', JSON.stringify({
      ...modalPayload,
      model_url: modalPayload.model_url.slice(0, 80) + '...',
      upload_url: '[signed URL]',
    }));

    // Dispatch to Modal in the background
    const modalPromise = (async () => {
      const modalStart = Date.now();
      console.log('🔧 [Hollow] Modal request started at', new Date().toISOString());

      try {
        const resp = await fetch(modalHollowUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(modalPayload),
        });

        const modalTime = Date.now() - modalStart;
        console.log(`🔧 [Hollow] Modal responded in ${modalTime}ms with status ${resp.status}`);

        const data = await resp.json();
        console.log('📊 [Hollow] Modal response:', JSON.stringify({
          success: data.success,
          uploaded: data.uploaded,
          material_saved: data.report?.material_saved_percent,
          total_time: data.report?.total_time_seconds,
          converged: data.report?.expansion?.converged,
          original_volume: data.report?.original?.volume,
          hollowed_volume: data.report?.hollowed?.volume,
          stl_size: data.report?.hollowed?.stl_size_bytes,
          error: data.error,
        }));

        if (!data.success) {
          console.error('❌ [Hollow] Modal returned failure:', data.error);
          console.error('❌ [Hollow] Full report:', JSON.stringify(data.report));
          return;
        }

        // Update the generated_models table with hollowed STL URL
        if (data.uploaded) {
          console.log('💾 [Hollow] Updating DB with hollowed STL URL...');
          const { error: updateError } = await supabase
            .from('generated_models')
            .update({
              hollowed_stl_url: publicUrl,
              hollow_report: data.report,
              updated_at: new Date().toISOString(),
            })
            .eq('id', modelId)

          if (updateError) {
            console.error('❌ [Hollow] DB update failed:', updateError.message, updateError.details);
          } else {
            console.log('✅ [Hollow] DB updated successfully with hollowed_stl_url');
          }
        }

        const totalTime = Date.now() - requestStart;
        console.log(`✅ [Hollow] Full pipeline complete in ${totalTime}ms`);
        console.log(`✅ [Hollow] Material saved: ${data.report?.material_saved_percent}%`);

      } catch (e: any) {
        const modalTime = Date.now() - modalStart;
        console.error(`❌ [Hollow] Modal request failed after ${modalTime}ms:`, e.message);
        console.error('❌ [Hollow] Error stack:', e.stack);
      }
    })();

    EdgeRuntime.waitUntil(modalPromise)

    const setupTime = Date.now() - requestStart;
    console.log(`📤 [Hollow] Returning response to client (setup took ${setupTime}ms, hollowing continues in background)`);

    // Return immediately — hollowing runs in background
    return new Response(
      JSON.stringify({
        success: true,
        status: 'processing',
        hollowedStlUrl: publicUrl,
        message: 'Hollowing dispatched. Hollowed STL will be available shortly.',
        params: { wallThickness, drainHoles, holeDiameter, iterations, stepSize },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    const errorTime = Date.now() - requestStart;
    console.error(`❌ [Hollow] Edge function error after ${errorTime}ms:`, error.message);
    console.error('❌ [Hollow] Stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
