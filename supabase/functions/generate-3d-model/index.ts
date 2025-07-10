// Define the correct Meshy API endpoints
// @ts-expect-error Deno types
const MESHY_TEXT_TO_3D_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d';
// @ts-expect-error Deno types
const MESHY_IMAGE_TO_3D_URL = 'https://api.meshy.ai/openapi/v2/image-to-3d';

// @ts-expect-error Deno types
Deno.serve(async (req) => {
  try {
    console.log('=== INCOMING REQUEST DEBUG ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // CORS headers for browser requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Handle model proxying (GET requests)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const modelUrl = url.searchParams.get('proxy');
      
      if (modelUrl && modelUrl.includes('assets.meshy.ai')) {
        console.log('=== PROXYING MODEL ===');
        console.log('Model URL:', modelUrl);
        
        try {
          const response = await fetch(modelUrl);
          console.log('Proxy response status:', response.status);
          
          if (response.ok) {
            const modelData = await response.arrayBuffer();
            console.log('Model data size:', modelData.byteLength, 'bytes');
            
            return new Response(modelData, {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename="model.glb"',
                'Cache-Control': 'public, max-age=3600'
              }
            });
          } else {
            console.error('Failed to fetch model:', response.status, response.statusText);
            return new Response('Failed to fetch model', { 
              status: response.status,
              headers: { 'Access-Control-Allow-Origin': '*' }
            });
          }
        } catch (error) {
          console.error('Proxy error:', error);
          return new Response('Proxy error', { 
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
          });
        }
      }
      
      return new Response('Invalid GET request', { 
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // Handle model generation (POST requests) - your existing code
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // @ts-expect-error Deno types
    const meshyApiKey = Deno.env.get('MESHY_API_KEY');
    if (!meshyApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const contentType = req.headers.get('content-type') || '';
    let prompt, imageData, mode;
    let jsonData: any = {};
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      prompt = formData.get('prompt')?.toString();
      imageData = formData.get('image');
      mode = formData.get('mode')?.toString() || 'preview';
    } else {
      jsonData = await req.json();
      prompt = (jsonData as any).prompt;
      mode = (jsonData as any).mode || 'preview';
    }
    
    if (!prompt && !imageData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either prompt or image is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const authHeader = `Bearer ${meshyApiKey}`;
    let meshyResponse;
    let isImageTo3D = false;
    
    if (imageData && imageData instanceof File) {
      isImageTo3D = true;
      const formData = new FormData();
      formData.append('image', imageData);
      if (prompt) formData.append('prompt', prompt);
      
      meshyResponse = await fetch(MESHY_IMAGE_TO_3D_URL, {
        method: 'POST',
        headers: { 'Authorization': authHeader },
        body: formData
      });
    } else {
      const body = {
        mode: mode,
        prompt: prompt,
        art_style: "realistic",
        should_remesh: true,
        negative_prompt: "low quality, low resolution, low poly, ugly"
      };
      
      if (mode === 'refine') {
        const previewTaskId = (jsonData as any).preview_task_id;
        if (!previewTaskId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'preview_task_id is required for refine mode'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        (body as any).preview_task_id = previewTaskId;
        delete (body as any).prompt;
        delete (body as any).art_style;
        delete (body as any).should_remesh;
        delete (body as any).negative_prompt;
      }
      
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
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to start 3D model generation',
        status: meshyResponse.status
      }), {
        status: meshyResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
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
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Poll for completion
    const statusUrl = isImageTo3D ? MESHY_IMAGE_TO_3D_URL : MESHY_TEXT_TO_3D_URL;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`${statusUrl}/${taskId}`, {
        headers: { 'Authorization': authHeader }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        
        if (statusData.status === 'SUCCEEDED') {
          const originalModelUrl = statusData.model_urls?.glb;
          
          if (!originalModelUrl) {
            return new Response(JSON.stringify({
              success: false,
              error: 'No model URL in response'
            }), {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }

          // Create proxied URL
          const baseUrl = req.url.split('?')[0];
          const proxyUrl = `${baseUrl}?proxy=${encodeURIComponent(originalModelUrl)}`;
          
          console.log('=== CREATING PROXIED URL ===');
          console.log('Original URL:', originalModelUrl);
          console.log('Proxied URL:', proxyUrl);
          
          return new Response(JSON.stringify({
            success: true,
            data: {
              taskId: taskId,
              modelUrl: proxyUrl, // Return proxied URL
              originalModelUrl: originalModelUrl,
              status: statusData.status,
              progress: 100
            }
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } else if (statusData.status === 'FAILED') {
          return new Response(JSON.stringify({
            success: false,
            error: 'Generation failed'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Generation timeout'
    }), {
      status: 408,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}); 