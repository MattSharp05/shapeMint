import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Use the correct API version based on the generation type
    let apiUrl;
    if (type === 'image-to-3d') {
      apiUrl = `https://api.meshy.ai/v1/image-to-3d/${taskId}`;
    } else if (type === 'text-to-3d') {
      apiUrl = `https://api.meshy.ai/v2/text-to-3d/${taskId}`; // Use v2 for text-to-3d tasks
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

    // If the model has finished processing, update our database
    if (meshyData.status === 'SUCCEEDED') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const updatePayload = {
          status: 'completed',
          glb_url: meshyData.model_urls?.glb,
          obj_url: meshyData.model_urls?.obj,
          stl_url: meshyData.model_urls?.stl,
          updated_at: new Date().toISOString(),
        };

        const { error: dbError } = await supabase
          .from('generated_models')
          .update(updatePayload)
          .eq('id', taskId);

        if (dbError) {
          console.error(`⚠️ Database update failed for task ${taskId}:`, dbError);
        } else {
          console.log(`✅ Task ${taskId} marked as completed in database.`);
        }
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
