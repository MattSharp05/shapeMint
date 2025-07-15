// supabase/functions/generate-3d-model/index.ts
// Main 3D model generation function that calls OBJ-to-STL converter
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MESHY_TEXT_TO_3D_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d';
const MESHY_IMAGE_TO_3D_URL = 'https://api.meshy.ai/openapi/v1/image-to-3d'; // ✅ Changed to v1

Deno.serve(async (req) => {
  try {
    console.log('=== MAIN MODEL GENERATION FUNCTION ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);

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
    let prompt, imageData, mode;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      prompt = formData.get('prompt')?.toString() || ''; // ✅ Default to empty string
      imageData = formData.get('image');
      mode = formData.get('mode')?.toString() || 'preview';
    } else {
      const jsonData = await req.json();
      prompt = jsonData.prompt || ''; // ✅ Default to empty string
      imageData = jsonData.image;
      mode = jsonData.mode || 'preview';
    }

    if (!prompt && !imageData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either prompt or image is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('=== STARTING MODEL GENERATION ===');
    console.log('Prompt:', prompt);
    console.log('Image:', !!imageData);
    console.log('Mode:', mode);

    // Generate model with Meshy API
    const authHeader = `Bearer ${meshyApiKey}`;
    let meshyResponse;
    let isImageTo3D = false;

    if (imageData && imageData instanceof File) {
      isImageTo3D = true;
      
      // Convert File to base64 data URI for Meshy API
      const arrayBuffer = await imageData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const dataUri = `data:${imageData.type};base64,${base64}`;
      
      console.log('=== IMAGE-TO-3D REQUEST ===');
      console.log('Data URI length:', dataUri.length);
      console.log('Image type:', imageData.type);
      console.log('Prompt for texture:', prompt);
      
      // ✅ Use correct Image-to-3D API parameters matching the sample
      const imageBody: any = {
        image_url: dataUri,
        enable_pbr: true,  
        ai_model: "meshy-4",
        should_remesh: true,
        should_texture: true
      };
      
      // Add texture prompt if provided
      if (prompt) {
        imageBody.texture_prompt = prompt;
      }
      
      meshyResponse = await fetch(MESHY_IMAGE_TO_3D_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(imageBody)
      });
    } else {
      const body = {
        mode: mode,
        prompt: prompt,
        art_style: "realistic",
        should_remesh: true,
        negative_prompt: "low quality, low resolution, low poly, ugly"
      };
      meshyResponse = await fetch(MESHY_TEXT_TO_3D_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(body)
      });
    }

    if (!meshyResponse.ok) {
      const errorText = await meshyResponse.text();
      console.error('❌ Meshy API Error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to start 3D model generation',
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
        error: 'No task ID received'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('=== MODEL GENERATION STARTED ===');
    console.log('Task ID:', taskId);

    // ✅ Poll for completion with correct URL
    const statusUrl = isImageTo3D ? MESHY_IMAGE_TO_3D_URL : MESHY_TEXT_TO_3D_URL;
    let attempts = 0;
    const maxAttempts = 60;

    while(attempts < maxAttempts){
      console.log(`=== POLLING ATTEMPT ${attempts + 1} ===`);
      const statusResponse = await fetch(`${statusUrl}/${taskId}`, {
        headers: {
          'Authorization': authHeader
        }
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
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          // Continue with the rest of your existing code...
          // (The rest remains the same)
          
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
              data: {
                taskId: taskId,
                modelUrl: glbPublicUrl,
                downloadUrl: objPublicUrl,
                objUrl: objPublicUrl,
                stlUrl: null,
                originalUrls: {
                  glb: glbUrl,
                  obj: objUrl
                },
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
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          const converterResult = await converterResponse.json();

          if (!converterResult.success) {
            console.error('❌ STL conversion failed:', converterResult.error);
            // Continue without STL
            return new Response(JSON.stringify({
              success: true,
              data: {
                taskId: taskId,
                modelUrl: glbPublicUrl,
                downloadUrl: objPublicUrl,
                objUrl: objPublicUrl,
                stlUrl: null,
                formats: {
                  web: 'glb',
                  download: 'obj',
                  printing: 'failed'
                },
                status: statusData.status,
                progress: 100,
                note: 'STL conversion failed'
              }
            }), {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          console.log('✅ STL conversion successful:', converterResult.data.stlUrl);

          // Return all URLs with STL as the download URL
          return new Response(JSON.stringify({
            success: true,
            data: {
              taskId: taskId,
              modelUrl: glbPublicUrl,
              downloadUrl: converterResult.data.stlUrl,
              objUrl: objPublicUrl,
              stlUrl: converterResult.data.stlUrl,
              originalUrls: {
                glb: glbUrl,
                obj: objUrl
              },
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
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        } else if (statusData.status === 'FAILED') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Model generation failed',
            details: statusData
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Still processing, wait and try again
        console.log('Model still processing, waiting...');
      }

      attempts++;
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Model generation timeout'
    }), {
      status: 408,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Main function error:', error);
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