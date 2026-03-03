import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

// Explicitly declare Deno namespace for Edge Function environment
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Download a GLB file from Meshy CDN and upload it to Supabase storage.
 * Returns the public Supabase URL, or falls back to the original Meshy URL on failure.
 */
async function storeGlbInSupabase(
  meshyGlbUrl: string,
  taskId: string,
  userId: string | null,
  supabase: any
): Promise<string> {
  try {
    console.log('📦 Downloading GLB from Meshy CDN...');
    const glbResponse = await fetch(meshyGlbUrl);

    if (!glbResponse.ok) {
      console.error('❌ Failed to download GLB:', glbResponse.status);
      return meshyGlbUrl; // Fallback to Meshy URL
    }

    const glbData = await glbResponse.arrayBuffer();
    const storagePath = userId
      ? `models/${userId}/${taskId}.glb`
      : `models/${taskId}.glb`;

    console.log(`📤 Uploading GLB to Supabase storage: ${storagePath} (${glbData.byteLength} bytes)`);

    const { error: uploadError } = await supabase.storage
      .from('3d-models')
      .upload(storagePath, glbData, {
        contentType: 'model/gltf-binary',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      return meshyGlbUrl; // Fallback to Meshy URL
    }

    const { data: { publicUrl } } = supabase.storage
      .from('3d-models')
      .getPublicUrl(storagePath);

    console.log('✅ GLB stored in Supabase:', publicUrl);
    return publicUrl;
  } catch (err: any) {
    console.error('❌ storeGlbInSupabase error:', err.message);
    return meshyGlbUrl; // Fallback to Meshy URL
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { taskId, type } = await req.json();

    if (!taskId || !type) {
      return new Response(JSON.stringify({ error: 'taskId and type are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const MESHY_API_KEY = Deno.env.get('MESHY_API_KEY');
    if (!MESHY_API_KEY) {
      return new Response(JSON.stringify({ error: 'Meshy API key is not configured.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // First, look up the database record to get the actual Meshy task ID
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Supabase configuration missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('🔍 Looking up database record for taskId:', taskId);

    const { data: modelRecord, error: lookupError } = await supabase
      .from('generated_models')
      .select('meshy_task_id, user_id')
      .eq('id', taskId)
      .single();

    console.log('📊 Database lookup result:', { modelRecord, lookupError });

    if (lookupError || !modelRecord?.meshy_task_id) {
      console.error('❌ Model record not found or missing Meshy task ID:', { lookupError, modelRecord });
      return new Response(JSON.stringify({ error: 'Model record not found or missing Meshy task ID.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const meshyTaskId = modelRecord.meshy_task_id;
    const userId = modelRecord.user_id;
    console.log(`Looking up Meshy task: ${meshyTaskId} for database record: ${taskId}`);

    // Use the correct API version based on the generation type
    let apiUrl;
    if (type === 'image-to-3d') {
      apiUrl = `https://api.meshy.ai/v1/image-to-3d/${meshyTaskId}`;
    } else if (type === 'multi-image-to-3d') {
      apiUrl = `https://api.meshy.ai/openapi/v1/multi-image-to-3d/${meshyTaskId}`;
    } else if (type === 'text-to-3d') {
      apiUrl = `https://api.meshy.ai/v2/text-to-3d/${meshyTaskId}`; // Use v2 for text-to-3d tasks
    } else {
      throw new Error(`Unsupported task type: ${type}`);
    }

    const meshyResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${MESHY_API_KEY}`,
      },
    });

    if (!meshyResponse.ok) {
      const errorData = await meshyResponse.text();
      return new Response(JSON.stringify({ error: `Failed to fetch from Meshy: ${errorData}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: meshyResponse.status,
      });
    }

    const meshyData = await meshyResponse.json();

    // If the task is complete, download GLB and store in Supabase storage
    if (meshyData.status === 'SUCCEEDED') {
      const meshyGlbUrl = meshyData.model_urls?.glb;
      let storedGlbUrl = meshyGlbUrl;

      // Download from Meshy CDN and upload to Supabase storage
      if (meshyGlbUrl) {
        storedGlbUrl = await storeGlbInSupabase(meshyGlbUrl, taskId, userId, supabase);
      }

      const { error: dbError } = await supabase
        .from('generated_models')
        .update({
          status: 'completed',
          model_url: storedGlbUrl,
          glb_url: storedGlbUrl,
          obj_url: meshyData.model_urls?.obj,
          stl_url: meshyData.model_urls?.stl,
          thumbnail_url: meshyData.thumbnail_url,
          notes: meshyGlbUrl !== storedGlbUrl
            ? `Original Meshy URL: ${meshyGlbUrl}`
            : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (dbError) {
        console.error('⚠️ Database update error (non-critical):', dbError);
      }

      // Override the Meshy response with our Supabase URL so the frontend uses it
      if (storedGlbUrl !== meshyGlbUrl) {
        meshyData.model_urls.glb = storedGlbUrl;
      }
    }

    // IMPORTANT: Wrap the response in a `data` object for the frontend
    return new Response(JSON.stringify({ data: meshyData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
