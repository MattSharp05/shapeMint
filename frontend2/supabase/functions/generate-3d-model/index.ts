// Updated Edge Function that stores models in Supabase Storage
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MESHY_TEXT_TO_3D_URL = 'https://api.meshy.ai/openapi/v2/text-to-3d';
const MESHY_IMAGE_TO_3D_URL = 'https://api.meshy.ai/openapi/v2/image-to-3d';

Deno.serve(async (req) => {
  try {
    console.log('=== INCOMING REQUEST ===');
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
    let prompt, imageData, mode;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      prompt = formData.get('prompt')?.toString();
      imageData = formData.get('image');
      mode = formData.get('mode')?.toString() || 'preview';
    } else {
      const jsonData = await req.json();
      prompt = jsonData.prompt;
      mode = jsonData.mode || 'preview';
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
    
    console.log('=== STARTING MODEL GENERATION ===');
    console.log('Prompt:', prompt);
    console.log('Mode:', mode);
    
    // Generate model with Meshy API
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
    
    // Poll for completion
    const statusUrl = isImageTo3D ? MESHY_IMAGE_TO_3D_URL : MESHY_TEXT_TO_3D_URL;
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
          const originalModelUrl = statusData.model_urls?.glb;
          
          if (!originalModelUrl) {
            return new Response(JSON.stringify({
              success: false,
              error: 'No model URL in response'
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          console.log('=== MODEL GENERATION COMPLETE ===');
          console.log('Original URL:', originalModelUrl);
          
          // Download the model file
          console.log('=== DOWNLOADING MODEL ===');
          const modelResponse = await fetch(originalModelUrl);
          
          if (!modelResponse.ok) {
            throw new Error(`Failed to download model: ${modelResponse.status}`);
          }
          
          const modelData = await modelResponse.arrayBuffer();
          console.log('Model downloaded, size:', modelData.byteLength, 'bytes');
          
          // Upload to Supabase Storage
          console.log('=== UPLOADING TO SUPABASE STORAGE ===');
          const fileName = `models/${taskId}.glb`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('3d-models') // Make sure this bucket exists
            .upload(fileName, modelData, {
              contentType: 'model/gltf-binary',
              cacheControl: '3600',
              upsert: true
            });
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload model: ${uploadError.message}`);
          }
          
          console.log('Upload successful:', uploadData);
          
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('3d-models')
            .getPublicUrl(fileName);
          
          const publicUrl = publicUrlData.publicUrl;
          console.log('Public URL:', publicUrl);
          
          return new Response(JSON.stringify({
            success: true,
            data: {
              taskId: taskId,
              modelUrl: publicUrl, // Return the Supabase Storage URL
              originalModelUrl: originalModelUrl,
              fileName: fileName,
              fileSize: modelData.byteLength,
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
    console.error('Edge Function error:', error);
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