import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GLTFLoader } from 'https://esm.sh/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'https://esm.sh/three@0.158.0/examples/jsm/exporters/GLTFExporter.js';
import * as THREE from 'https://esm.sh/three@0.158.0';
import { corsHeaders } from '../_shared/cors.ts';

// Convert value to meters
function toMeters(value: number, unit: 'cm' | 'mm' | 'inches'): number {
  switch (unit) {
    case 'cm':
      return value / 100;
    case 'mm':
      return value / 1000;
    case 'inches':
      return value * 0.0254;
    default:
      return value / 100;
  }
}

// Get bounding box dimensions
function getBoundingBoxDimensions(object: THREE.Object3D): { width: number; height: number; depth: number } {
  const box = new THREE.Box3().setFromObject(object);
  return {
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z
  };
}

// Get current dimension based on target
function getCurrentDimension(
  dimensions: { width: number; height: number; depth: number },
  target: 'height' | 'width' | 'depth' | 'longest'
): number {
  switch (target) {
    case 'height':
      return dimensions.height;
    case 'width':
      return dimensions.width;
    case 'depth':
      return dimensions.depth;
    case 'longest':
      return Math.max(dimensions.width, dimensions.height, dimensions.depth);
    default:
      return dimensions.height;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { glbUrl, modelId, userId, targetValue, unit, target } = await req.json();

    if (!glbUrl || !modelId || !userId || !targetValue || !unit || !target) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔧 Starting model scaling...', { glbUrl, modelId, targetValue, unit, target });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch GLB from Meshy (server-side, no CORS issues)
    console.log('📥 Fetching GLB from Meshy...');
    const glbResponse = await fetch(glbUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*'
      }
    });

    if (!glbResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to download GLB: ${glbResponse.statusText}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const glbData = await glbResponse.arrayBuffer();
    console.log('✅ GLB downloaded, size:', glbData.byteLength);

    // Load GLB model
    console.log('📦 Loading GLB model...');
    const loader = new GLTFLoader();
    const gltf: any = await new Promise((resolve, reject) => {
      loader.parse(glbData, '', resolve, reject);
    });

    // Extract scene from GLTF
    const scene = gltf.scene;
    if (!scene) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse GLB model: no scene found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Update matrices before measuring
    scene.updateMatrixWorld(true);

    // Get original dimensions
    const originalDimensions = getBoundingBoxDimensions(scene);
    console.log('📐 Original dimensions (meters):', originalDimensions);

    // Validate dimensions
    if (originalDimensions.width <= 0 || originalDimensions.height <= 0 || originalDimensions.depth <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid model dimensions: model appears to have zero or negative size' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Convert target value to meters
    const targetMeters = toMeters(targetValue, unit);
    console.log(`🎯 Target: ${targetValue}${unit} = ${targetMeters}m`);

    // Get current dimension for the target axis
    const currentDimension = getCurrentDimension(originalDimensions, target);
    console.log(`📏 Current ${target}: ${currentDimension}m`);

    // Validate current dimension
    if (currentDimension <= 0) {
      return new Response(
        JSON.stringify({ error: `Invalid current dimension for ${target}: ${currentDimension}m` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate scale factor
    const scaleFactor = targetMeters / currentDimension;
    console.log(`⚖️ Scale factor: ${scaleFactor}`);

    // Validate scale factor
    if (!isFinite(scaleFactor) || scaleFactor <= 0) {
      return new Response(
        JSON.stringify({ error: `Invalid scale factor: ${scaleFactor}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (scaleFactor > 1000 || scaleFactor < 0.001) {
      console.warn(`⚠️ Extreme scale factor detected: ${scaleFactor}`);
    }

    // Reset scale to identity first, then apply uniform scaling
    scene.scale.set(1, 1, 1);
    scene.scale.multiplyScalar(scaleFactor);

    // Update matrices
    scene.updateMatrixWorld(true);

    // Get final dimensions
    const finalDimensions = getBoundingBoxDimensions(scene);
    console.log('📐 Final dimensions (meters):', finalDimensions);

    // Export scaled model to GLB
    console.log('💾 Exporting scaled model...');
    const exporter = new GLTFExporter();
    const exportedData = await new Promise((resolve, reject) => {
      exporter.parse(
        scene,
        (result) => resolve(result),
        (error) => reject(error),
        { binary: true }
      );
    });

    let scaledGlbBuffer: ArrayBuffer;
    if (exportedData instanceof ArrayBuffer) {
      scaledGlbBuffer = exportedData;
    } else {
      // Convert JSON to binary GLB if needed
      return new Response(
        JSON.stringify({ error: 'Failed to export model in binary format' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Scaled model exported, size:', scaledGlbBuffer.byteLength);

    // Upload to Supabase storage
    const filename = `scaled_${modelId}_${Date.now()}.glb`;
    const storagePath = `models/${userId}/${filename}`;

    console.log('📤 Uploading to storage:', storagePath);
    const { error: uploadError } = await supabase.storage
      .from('3d-models')
      .upload(storagePath, scaledGlbBuffer, {
        contentType: 'model/gltf-binary',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Failed to upload scaled model: ${uploadError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('3d-models')
      .getPublicUrl(storagePath);

    console.log('✅ Scaled model uploaded:', publicUrl);

    // Update the database with the scaled URL (using service role, bypasses RLS)
    console.log('💾 Updating database with scaled model URL...');
    const { error: updateError } = await supabase
      .from('generated_models')
      .update({
        glb_url: publicUrl,
        model_url: publicUrl,
        notes: `Scaled model. Original: ${glbUrl}. Target: ${targetValue}${unit} ${target}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', modelId);

    if (updateError) {
      console.error('⚠️ Failed to update database with scaled URL:', updateError);
      // Don't fail the whole operation - the file is uploaded, just log the error
    } else {
      console.log('✅ Database updated with scaled model URL');
    }

    // Convert dimensions to the requested unit
    function fromMeters(meters: number, unit: 'cm' | 'mm' | 'inches'): number {
      switch (unit) {
        case 'cm':
          return meters * 100;
        case 'mm':
          return meters * 1000;
        case 'inches':
          return meters / 0.0254;
        default:
          return meters * 100;
      }
    }

    // Return result
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          scaledUrl: publicUrl,
          originalDimensions: {
            width: fromMeters(originalDimensions.width, unit),
            height: fromMeters(originalDimensions.height, unit),
            depth: fromMeters(originalDimensions.depth, unit)
          },
          finalDimensions: {
            width: fromMeters(finalDimensions.width, unit),
            height: fromMeters(finalDimensions.height, unit),
            depth: fromMeters(finalDimensions.depth, unit)
          },
          scaleFactor
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Scale model error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to scale model' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
