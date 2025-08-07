// supabase/functions/generate-3d-model-v2/index.ts
// Modified version that routes image requests to ComfyUI and text requests to MeshyAI
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MESHY_TEXT_TO_3D_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d';

Deno.serve(async (req) => {
  try {
    console.log('=== GENERATE-3D-MODEL-V2 (ROUTING VERSION) ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request
    const contentType = req.headers.get('content-type') || '';
    let prompt, imageData, mode, userId;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      prompt = formData.get('prompt')?.toString() || '';
      imageData = formData.get('image');
      mode = formData.get('mode')?.toString() || 'preview';
      userId = formData.get('user_id')?.toString();
    } else {
      const jsonData = await req.json();
      prompt = jsonData.prompt || '';
      imageData = jsonData.image;
      mode = jsonData.mode || 'preview';
      userId = jsonData.user_id;
    }

    // Validation
    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (!prompt && !imageData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either prompt or image is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('=== ROUTING DECISION ===');
    console.log('Has image:', !!imageData);
    console.log('Has prompt:', !!prompt);
    
    // NEW ROUTING LOGIC: Route based on input type
    if (imageData && imageData instanceof File) {
      console.log('🔀 ROUTING TO COMFYUI (Image-to-3D)');
      return await handleComfyUIGeneration(imageData, prompt, userId, supabaseUrl, supabaseServiceKey, corsHeaders);
    } else {
      console.log('🔀 ROUTING TO MESHYAI (Text-to-3D)');
      return await handleMeshyGeneration(prompt, mode, meshyApiKey, supabaseUrl, supabaseServiceKey, corsHeaders);
    }
    
  } catch (error) {
    console.error('❌ Main routing function error:', error);
    
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

/**
 * Handle ComfyUI generation (Image-to-3D)
 * This routes to the existing start-comfyui-job function and returns job info
 */
async function handleComfyUIGeneration(imageData, prompt, userId, supabaseUrl, supabaseServiceKey, corsHeaders) {
  try {
    console.log('=== COMFYUI ROUTING ===');
    console.log('Image type:', imageData.type);
    console.log('Image size:', imageData.size);
    console.log('Prompt:', prompt);
    
    // Prepare form data for ComfyUI
    const formData = new FormData();
    formData.append('image', imageData);
    if (prompt?.trim()) {
      formData.append('prompt', prompt.trim());
    }
    formData.append('user_id', userId);
    
    // Call the existing start-comfyui-job function
    const comfyUIResponse = await fetch(`${supabaseUrl}/functions/v1/start-comfyui-job`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: formData
    });
    
    if (!comfyUIResponse.ok) {
      const errorText = await comfyUIResponse.text();
      console.error('❌ ComfyUI job start failed:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to start ComfyUI generation',
        details: errorText
      }), {
        status: comfyUIResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const comfyUIData = await comfyUIResponse.json();
    console.log('✅ ComfyUI job started:', comfyUIData);
    
    // Return job info - frontend will handle polling
    return new Response(JSON.stringify({
      success: true,
      type: 'comfyui',
      data: {
        jobId: comfyUIData.data?.jobId,
        promptId: comfyUIData.data?.promptId,
        status: 'processing',
        progress: comfyUIData.data?.progress || 10,
        message: 'ComfyUI generation started. Frontend will handle polling.',
        workflowType: 'image-to-3d'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ ComfyUI routing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'ComfyUI routing failed',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle MeshyAI generation (Text-to-3D) 
 * This is the existing MeshyAI logic (unchanged)
 */
async function handleMeshyGeneration(prompt, mode, meshyApiKey, supabaseUrl, supabaseServiceKey, corsHeaders) {
  try {
    console.log('=== MESHYAI GENERATION (Text-to-3D) ===');
    console.log('Prompt:', prompt);
    console.log('Mode:', mode);
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate model with Meshy API (existing logic)
    const authHeader = `Bearer ${meshyApiKey}`;
    
    const body = {
      mode: mode,
      prompt: prompt,
      art_style: "realistic",
      should_remesh: true,
      negative_prompt: "low quality, low resolution, low poly, ugly"
    };
    
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
      console.error('❌ Meshy API Error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to start 3D model generation',
        details: errorText
      }), {
        status: meshyResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const meshyData = await meshyResponse.json();
    const taskId = meshyData.result || meshyData.task_id || meshyData.id;
    
    if (!taskId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No task ID received'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('=== MODEL GENERATION STARTED ===');
    console.log('Task ID:', taskId);
    
    // Poll for completion (existing logic)
    const statusUrl = MESHY_TEXT_TO_3D_URL;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      console.log(`=== POLLING ATTEMPT ${attempts + 1} ===`);
      
      const statusResponse = await fetch(`${statusUrl}/${taskId}`, {
        headers: { 'Authorization': authHeader }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('Status:', statusData.status);
        
        if (statusData.status === 'SUCCEEDED') {
          console.log('=== MODEL GENERATION COMPLETE ===');
          console.log('Available formats:', Object.keys(statusData.model_urls || {}));
          
          // Get both GLB and OBJ URLs
          const glbUrl = statusData.model_urls?.glb;
          const objUrl = statusData.model_urls?.obj;
          
          if (!glbUrl || !objUrl) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Required model formats not available',
              availableFormats: Object.keys(statusData.model_urls || {})
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          console.log('GLB URL:', glbUrl);
          console.log('OBJ URL:', objUrl);
          
          // Download both models
          console.log('=== DOWNLOADING MODELS ===');
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
          
          console.log('Downloaded - GLB:', glbData.byteLength, 'bytes, OBJ:', objText.length, 'characters');
          
          // Upload GLB and OBJ to Supabase Storage
          console.log('=== UPLOADING GLB AND OBJ ===');
          const [glbUpload, objUpload] = await Promise.all([
            supabase.storage.from('3d-models').upload(`models/${taskId}.glb`, glbData, {
              contentType: 'model/gltf-binary',
              cacheControl: '3600',
              upsert: true
            }),
            supabase.storage.from('3d-models').upload(`models/${taskId}.obj`, objText, {
              contentType: 'text/plain',
              cacheControl: '3600',
              upsert: true
            })
          ]);
          
          if (glbUpload.error || objUpload.error) {
            throw new Error(`Upload failed: ${glbUpload.error?.message || objUpload.error?.message}`);
          }
          
          // Get public URLs
          const glbPublicUrl = supabase.storage.from('3d-models').getPublicUrl(`models/${taskId}.glb`).data.publicUrl;
          const objPublicUrl = supabase.storage.from('3d-models').getPublicUrl(`models/${taskId}.obj`).data.publicUrl;
          
          console.log('✅ GLB and OBJ uploaded successfully');
          console.log('GLB URL:', glbPublicUrl);
          console.log('OBJ URL:', objPublicUrl);
          
          // Call the OBJ-to-STL converter function
          console.log('=== CALLING STL CONVERTER ===');
          const converterResponse = await fetch(`${supabaseUrl}/functions/v1/obj-to-stl`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              objUrl: objPublicUrl,
              taskId: taskId,
              fileName: `models/${taskId}.stl`
            })
          });
          
          if (!converterResponse.ok) {
            const converterError = await converterResponse.text();
            console.error('❌ STL conversion failed:', converterError);
            
            // Continue without STL but log the error
            console.log('⚠️ Continuing without STL conversion');
            
            return new Response(JSON.stringify({
              success: true,
              type: 'meshy',
              data: {
                taskId: taskId,
                modelUrl: glbPublicUrl,      // GLB for web display
                downloadUrl: objPublicUrl,   // Fallback to OBJ
                objUrl: objPublicUrl,
                stlUrl: null,
                originalUrls: { glb: glbUrl, obj: objUrl },
                fileNames: {
                  glb: `models/${taskId}.glb`,
                  obj: `models/${taskId}.obj`
                },
                fileSizes: {
                  glb: glbData.byteLength,
                  obj: objText.length
                },
                formats: {
                  web: 'glb',
                  download: 'obj',
                  printing: 'failed'
                },
                status: statusData.status,
                progress: 100,
                note: 'STL conversion failed, using OBJ for download'
              }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          const converterResult = await converterResponse.json();
          
          if (!converterResult.success) {
            console.error('❌ STL conversion failed:', converterResult.error);
            
            // Continue without STL
            return new Response(JSON.stringify({
              success: true,
              type: 'meshy',
              data: {
                taskId: taskId,
                modelUrl: glbPublicUrl,
                downloadUrl: objPublicUrl,
                objUrl: objPublicUrl,
                stlUrl: null,
                formats: { web: 'glb', download: 'obj', printing: 'failed' },
                status: statusData.status,
                progress: 100,
                note: 'STL conversion failed'
              }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          console.log('✅ STL conversion successful:', converterResult.data.stlUrl);
          
          // Return all URLs with STL as the download URL
          return new Response(JSON.stringify({
            success: true,
            type: 'meshy',
            data: {
              taskId: taskId,
              modelUrl: glbPublicUrl,                    
              downloadUrl: converterResult.data.stlUrl,  
              objUrl: objPublicUrl,                      
              stlUrl: converterResult.data.stlUrl,       
              originalUrls: { glb: glbUrl, obj: objUrl },
              fileNames: {
                glb: `models/${taskId}.glb`,
                obj: `models/${taskId}.obj`,
                stl: `models/${taskId}.stl`
              },
              fileSizes: {
                glb: glbData.byteLength,
                obj: objText.length,
                stl: converterResult.data.fileSize
              },
              formats: {
                web: 'glb',
                download: 'stl',
                alternative: 'obj',
                printing: 'stl'
              },
              scalingInfo: converterResult.data.scalingInfo,
              printingSpecs: converterResult.data.printingSpecs,
              status: statusData.status,
              progress: 100
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
          
        } else if (statusData.status === 'FAILED') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Model generation failed',
            details: statusData
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Still processing, wait and try again
        console.log('Model still processing, waiting...');
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Model generation timeout'
    }), {
      status: 408,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ MeshyAI generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'MeshyAI generation failed',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
} 