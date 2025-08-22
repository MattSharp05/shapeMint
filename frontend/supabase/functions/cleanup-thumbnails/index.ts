import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
serve(async (req)=>{
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Find models with selected thumbnails that haven't been cleaned up
    const { data: models, error: modelsError } = await supabase.from('generated_models').select('id, thumbnail_angles, thumbnail_selected, thumbnail_custom').not('thumbnail_angles', 'is', null).not('thumbnail_selected', 'is', null).eq('thumbnail_status', 'completed');
    if (modelsError) {
      throw new Error(`Failed to fetch models: ${modelsError.message}`);
    }
    if (!models || models.length === 0) {
      return new Response(JSON.stringify({
        cleaned: 0,
        message: 'No models need cleanup'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let cleaned = 0;
    let errors = 0;
    for (const model of models){
      try {
        const angles = model.thumbnail_angles || {};
        const selectedAngle = model.thumbnail_selected;
        const isCustom = model.thumbnail_custom;
        // If user has uploaded a custom thumbnail, keep all auto-generated angles
        // as fallback options. Only clean up if user has selected from auto-generated.
        if (isCustom) {
          continue;
        }
        const filesToDelete = [];
        // Find unused angle images to delete
        for (const [angle, url] of Object.entries(angles)){
          if (angle !== selectedAngle.toString()) {
            const fileName = `${model.id}/angle-${angle}.jpg`;
            filesToDelete.push(fileName);
          }
        }
        if (filesToDelete.length > 0) {
          // Delete unused files from storage
          const { error: deleteError } = await supabase.storage.from('thumbnails').remove(filesToDelete);
          if (deleteError) {
            console.error(`Failed to delete files for model ${model.id}:`, deleteError);
            errors++;
            continue;
          }
          // Update model to remove deleted angles from thumbnail_angles
          const updatedAngles = {
            [selectedAngle.toString()]: angles[selectedAngle.toString()]
          };
          const { error: updateError } = await supabase.from('generated_models').update({
            thumbnail_angles: updatedAngles
          }).eq('id', model.id);
          if (updateError) {
            console.error(`Failed to update model ${model.id}:`, updateError);
            errors++;
            continue;
          }
          cleaned++;
        }
      } catch (error) {
        console.error(`Error cleaning up thumbnails for model ${model.id}:`, error);
        errors++;
      }
    }
    return new Response(JSON.stringify({
      cleaned,
      errors,
      total: models.length,
      message: `Cleaned up ${cleaned} models, ${errors} errors`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in cleanup-thumbnails function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      cleaned: 0,
      errors: 1
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});