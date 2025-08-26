import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GLTFLoader } from 'https://esm.sh/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { STLExporter } from 'https://esm.sh/three@0.158.0/examples/jsm/exporters/STLExporter.js';
import * as THREE from 'https://esm.sh/three@0.158.0';
Deno.serve(async (req)=>{
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    const { glbUrl, modelId } = await req.json();
    if (!glbUrl || !modelId) {
      return new Response(JSON.stringify({
        error: 'Missing glbUrl or modelId'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Download GLB from Meshy
    const glbResponse = await fetch(glbUrl);
    if (!glbResponse.ok) {
      return new Response(JSON.stringify({
        error: 'Failed to download GLB from Meshy'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const glbData = await glbResponse.arrayBuffer();
    // Convert GLB to STL
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject)=>{
      loader.parse(glbData, '', resolve, reject);
    });
    // Create a scene and add the GLTF model
    const scene = new THREE.Scene();
    scene.add(gltf.scene);
    // Export to STL
    const exporter = new STLExporter();
    const stlData = exporter.parse(scene, {
      binary: true
    });
    // Convert STL data to ArrayBuffer
    const stlArrayBuffer = new TextEncoder().encode(stlData).buffer;
    // Upload STL to Supabase Storage
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const upload = await supabase.storage.from('3d-models').upload(`models/${modelId}.stl`, stlArrayBuffer, {
      contentType: 'application/octet-stream',
      upsert: true
    });
    if (upload.error) {
      return new Response(JSON.stringify({
        error: upload.error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const publicUrl = supabase.storage.from('3d-models').getPublicUrl(`models/${modelId}.stl`).data.publicUrl;
    // Update DB with STL URL
    const { error: updateError } = await supabase.from('generated_models').update({
      stl_url: publicUrl
    }).eq('id', modelId);
    if (updateError) {
      return new Response(JSON.stringify({
        error: updateError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      stlUrl: publicUrl
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});