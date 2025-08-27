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
      .select('meshy_task_id')
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
    console.log(`Looking up Meshy task: ${meshyTaskId} for database record: ${taskId}`);

    // Use the correct API version based on the generation type
    let apiUrl;
    if (type === 'image-to-3d') {
      apiUrl = `https://api.meshy.ai/v1/image-to-3d/${meshyTaskId}`;
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

    // If the task is complete, update the database record
    if (meshyData.status === 'SUCCEEDED') {
        const { error: dbError } = await supabase
          .from('generated_models')
          .update({
            status: 'completed',
            model_url: meshyData.model_urls?.glb,
            glb_url: meshyData.model_urls?.glb,
            obj_url: meshyData.model_urls?.obj,
            stl_url: meshyData.model_urls?.stl,
            thumbnail_url: meshyData.thumbnail_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        if (dbError) {
          console.error('⚠️ Database update error (non-critical):', dbError);
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
