// supabase/functions/refine-model/index.ts
// Refine a Meshy preview model, upload results, and convert OBJ to STL
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const MESHY_TEXT_TO_3D_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d';
Deno.serve(async (req)=>{
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get environment variables
    const meshyApiKey = Deno.env.get('MESHY_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!meshyApiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required environment variables'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Parse request
    const contentType = req.headers.get('content-type') || '';
    let preview_task_id, texture_prompt, enable_pbr, ai_model, texture_image_url;
    if (contentType.includes('application/json')) {
      const jsonData = await req.json();
      preview_task_id = jsonData.preview_task_id;
      texture_prompt = jsonData.texture_prompt;
      enable_pbr = jsonData.enable_pbr;
      ai_model = jsonData.ai_model;
      texture_image_url = jsonData.texture_image_url;
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid content type'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!preview_task_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'preview_task_id is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Build Meshy refine request (concise, extensible)
    const body = {
      mode: 'refine',
      preview_task_id,
      ...texture_prompt ? {
        texture_prompt
      } : {},
      ...enable_pbr !== undefined ? {
        enable_pbr
      } : {},
      ...ai_model ? {
        ai_model
      } : {},
      ...texture_image_url ? {
        texture_image_url
      } : {}
    };
    const authHeader = `Bearer ${meshyApiKey}`;
    // Start Meshy refine task
    console.log('=== Starting Meshy refine task ===');
    const meshyResponse = await fetch(MESHY_TEXT_TO_3D_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(body)
    });
    if (!meshyResponse.ok) {
      const errorText = await meshyResponse.text();
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to start Meshy refine task',
        details: errorText
      }), {
        status: meshyResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const meshyData = await meshyResponse.json();
    const taskId = meshyData.result || meshyData.task_id || meshyData.id;
    if (!taskId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No task ID received from Meshy refine'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60;
    let statusData;
    while(attempts < maxAttempts){
      console.log(`Polling Meshy refine status (attempt ${attempts + 1})...`);
      const statusResponse = await fetch(`${MESHY_TEXT_TO_3D_URL}/${taskId}`, {
        headers: {
          'Authorization': authHeader
        }
      });
      if (statusResponse.ok) {
        statusData = await statusResponse.json();
        if (statusData.status === 'SUCCEEDED') {
          break;
        } else if (statusData.status === 'FAILED') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Refine task failed',
            details: statusData
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise((resolve)=>setTimeout(resolve, 5000));
      }
    }
    if (!statusData || statusData.status !== 'SUCCEEDED') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Refine task timeout'
      }), {
        status: 408,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Download GLB and OBJ
    const glbUrl = statusData.model_urls?.glb;
    const objUrl = statusData.model_urls?.obj;
    if (!glbUrl || !objUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Required model formats not available',
        availableFormats: Object.keys(statusData.model_urls || {})
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const [glbResponse, objResponse] = await Promise.all([
      fetch(glbUrl),
      fetch(objUrl)
    ]);
    if (!glbResponse.ok || !objResponse.ok) {
      throw new Error(`Failed to download models - GLB: ${glbResponse.status}, OBJ: ${objResponse.status}`);
    }
    const [glbData, objText] = await Promise.all([
      glbResponse.arrayBuffer(),
      objResponse.text()
    ]);
    // Upload to Supabase Storage (with _refined suffix)
    const refinedId = `${taskId}_refined`;
    const [glbUpload, objUpload] = await Promise.all([
      supabase.storage.from('3d-models').upload(`models/${refinedId}.glb`, glbData, {
        contentType: 'model/gltf-binary',
        cacheControl: '3600',
        upsert: true
      }),
      supabase.storage.from('3d-models').upload(`models/${refinedId}.obj`, objText, {
        contentType: 'text/plain',
        cacheControl: '3600',
        upsert: true
      })
    ]);
    if (glbUpload.error || objUpload.error) {
      throw new Error(`Upload failed: ${glbUpload.error?.message || objUpload.error?.message}`);
    }
    const glbPublicUrl = supabase.storage.from('3d-models').getPublicUrl(`models/${refinedId}.glb`).data.publicUrl;
    const objPublicUrl = supabase.storage.from('3d-models').getPublicUrl(`models/${refinedId}.obj`).data.publicUrl;
    // Call OBJ-to-STL converter
    const converterResponse = await fetch(`${supabaseUrl}/functions/v1/obj-to-stl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        objUrl: objPublicUrl,
        taskId: refinedId,
        fileName: `models/${refinedId}.stl`
      })
    });
    let stlUrl = null, stlFileSize = null, scalingInfo = null, printingSpecs = null, stlNote = null;
    if (converterResponse.ok) {
      const converterResult = await converterResponse.json();
      if (converterResult.success) {
        stlUrl = converterResult.data.stlUrl;
        stlFileSize = converterResult.data.fileSize;
        scalingInfo = converterResult.data.scalingInfo;
        printingSpecs = converterResult.data.printingSpecs;
      } else {
        stlNote = 'STL conversion failed';
      }
    } else {
      stlNote = 'STL conversion failed, using OBJ for download';
    }
    // Return all URLs and status
    return new Response(JSON.stringify({
      success: true,
      data: {
        taskId: refinedId,
        modelUrl: glbPublicUrl,
        downloadUrl: stlUrl || objPublicUrl,
        objUrl: objPublicUrl,
        stlUrl: stlUrl,
        originalUrls: {
          glb: glbUrl,
          obj: objUrl
        },
        fileNames: {
          glb: `models/${refinedId}.glb`,
          obj: `models/${refinedId}.obj`,
          stl: stlUrl ? `models/${refinedId}.stl` : null
        },
        fileSizes: {
          glb: glbData.byteLength,
          obj: objText.length,
          stl: stlFileSize
        },
        formats: {
          web: 'glb',
          download: stlUrl ? 'stl' : 'obj',
          alternative: 'obj',
          printing: stlUrl ? 'stl' : 'obj'
        },
        scalingInfo,
        printingSpecs,
        status: statusData.status,
        progress: 100,
        note: stlNote
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Refine function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
});