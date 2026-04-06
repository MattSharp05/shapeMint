/**
 * Process Model: Scale + Hollow via Blender (Modal).
 * Replaces the old scale-model function.
 * Exports OBJ (with UVs for color printing) + STL (for mono printing).
 *
 * This function is SYNCHRONOUS — it waits for Modal to finish, updates the DB,
 * and returns the results. The webhook uses the returned URLs directly.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const t0 = Date.now();
  console.log('🔧 [ProcessModel] Invoked at', new Date().toISOString());

  try {
    const body = await req.json();
    const {
      objUrl,
      glbUrl,
      modelId,
      userId,
      scaleValue = 0,
      scaleUnit = 'cm',
      scaleTarget = 'height',
      wallThickness = 2.0,
      drainHoles = 2,
      holeDiameter = 3.0,
    } = body;

    console.log('🔧 [ProcessModel] Params:', JSON.stringify({
      objUrl: objUrl ? `${objUrl.slice(0, 60)}...` : 'MISSING',
      modelId, userId: userId || 'anon',
      scaleValue, scaleUnit, scaleTarget,
      wallThickness, drainHoles, holeDiameter,
    }));

    if ((!objUrl && !glbUrl) || !modelId) {
      return new Response(JSON.stringify({ error: 'Missing objUrl/glbUrl or modelId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const modalUrl = Deno.env.get('MODAL_PROCESS_ENDPOINT_URL');

    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase config');
    if (!modalUrl) throw new Error('Missing MODAL_PROCESS_ENDPOINT_URL');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Idempotency: if already processed, return existing URLs
    const { data: existing } = await supabase.from('generated_models')
      .select('processing_status, scaled_obj_url, scaled_stl_url, scaled_glb_url, processing_report')
      .eq('id', modelId).single();

    if (existing?.processing_status === 'completed' && existing.scaled_stl_url) {
      console.log('⚡ [ProcessModel] Already completed — returning existing URLs');
      return new Response(JSON.stringify({
        success: true,
        status: 'completed',
        scaledObjUrl: existing.scaled_obj_url,
        scaledStlUrl: existing.scaled_stl_url,
        scaledGlbUrl: existing.scaled_glb_url,
        report: existing.processing_report,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Set processing status (only if not already processing — avoid overwriting 'completed')
    await supabase.from('generated_models').update({
      processing_status: 'processing',
      updated_at: new Date().toISOString(),
    }).eq('id', modelId).neq('processing_status', 'completed');
    console.log('📝 [ProcessModel] Status set to processing');

    // Create signed upload URLs for OBJ, STL, and GLB (with upsert to handle duplicate runs)
    const basePath = userId ? `models/${userId}` : 'models';
    const objPath = `${basePath}/${modelId}_scaled.obj`;
    const stlPath = `${basePath}/${modelId}_scaled.stl`;
    const glbPath = `${basePath}/${modelId}_scaled.glb`;

    const [objSigned, stlSigned, glbSigned] = await Promise.all([
      supabase.storage.from('3d-models').createSignedUploadUrl(objPath, { upsert: true }),
      supabase.storage.from('3d-models').createSignedUploadUrl(stlPath, { upsert: true }),
      supabase.storage.from('3d-models').createSignedUploadUrl(glbPath, { upsert: true }),
    ]);

    if (stlSigned.error || !stlSigned.data?.signedUrl) {
      throw new Error(`STL signed URL failed: ${stlSigned.error?.message}`);
    }

    const objPublic = supabase.storage.from('3d-models').getPublicUrl(objPath).data.publicUrl;
    const stlPublic = supabase.storage.from('3d-models').getPublicUrl(stlPath).data.publicUrl;
    const glbPublic = supabase.storage.from('3d-models').getPublicUrl(glbPath).data.publicUrl;

    console.log('📝 [ProcessModel] Signed URLs created');
    console.log('📦 [ProcessModel] STL will be at:', stlPublic.slice(0, 80));
    console.log('📦 [ProcessModel] GLB will be at:', glbPublic.slice(0, 80));

    // Call Modal synchronously — wait for it to finish
    // Prefer GLB input (has embedded colors/textures), fall back to OBJ
    const modalPayload: Record<string, unknown> = {
      scale_value: scaleValue,
      scale_unit: scaleUnit,
      scale_target: scaleTarget,
      wall_thickness: wallThickness,
      drain_holes: drainHoles,
      hole_diameter: holeDiameter,
      upload_url_obj: objSigned.data?.signedUrl || '',
      upload_url_stl: stlSigned.data.signedUrl,
      upload_url_glb: glbSigned.data?.signedUrl || '',
      obj_public_url: objPublic,
      stl_public_url: stlPublic,
      glb_public_url: glbPublic,
      model_id: modelId,
    };
    if (glbUrl) {
      modalPayload.glb_url = glbUrl;
      console.log('📦 [ProcessModel] Using GLB input (has colors)');
    } else {
      modalPayload.obj_url = objUrl;
      console.log('📦 [ProcessModel] Using OBJ input (no GLB available)');
    }

    console.log('🚀 [ProcessModel] Calling Modal (synchronous)...');
    const mt0 = Date.now();

    const modalResp = await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modalPayload),
    });

    const modalData = await modalResp.json();
    const modalDuration = ((Date.now() - mt0) / 1000).toFixed(1);

    console.log(`🔧 [ProcessModel] Modal responded in ${modalDuration}s:`, JSON.stringify({
      success: modalData.success,
      uploaded_obj: modalData.uploaded_obj,
      uploaded_stl: modalData.uploaded_stl,
      uploaded_glb: modalData.uploaded_glb,
      material_saved: modalData.report?.material_saved_percent,
      obj_size: modalData.obj_size_bytes,
      stl_size: modalData.stl_size_bytes,
      glb_size: modalData.glb_size_bytes,
      error: modalData.error,
    }));

    if (!modalData.success) {
      console.error('❌ [ProcessModel] Modal failure:', modalData.error);
      await supabase.from('generated_models').update({
        processing_status: 'failed',
        processing_report: modalData.report || { error: modalData.error },
        updated_at: new Date().toISOString(),
      }).eq('id', modelId);

      return new Response(JSON.stringify({
        success: false,
        error: modalData.error || 'Processing failed',
        report: modalData.report,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Modal succeeded — update DB with results (single authoritative write)
    const dbUpdate: Record<string, unknown> = {
      processing_status: 'completed',
      processing_report: modalData.report,
      updated_at: new Date().toISOString(),
    };
    if (modalData.uploaded_obj) {
      dbUpdate.scaled_obj_url = objPublic;
    }
    if (modalData.uploaded_stl) {
      dbUpdate.scaled_stl_url = stlPublic;
    }
    if (modalData.uploaded_glb) {
      dbUpdate.scaled_glb_url = glbPublic;
    }

    console.log('📝 [ProcessModel] Writing DB update:', JSON.stringify({
      processing_status: 'completed',
      scaled_obj_url: dbUpdate.scaled_obj_url ? 'yes' : 'no',
      scaled_stl_url: dbUpdate.scaled_stl_url ? 'yes' : 'no',
      scaled_glb_url: dbUpdate.scaled_glb_url ? 'yes' : 'no',
    }));

    const { error: dbError } = await supabase.from('generated_models')
      .update(dbUpdate)
      .eq('id', modelId);

    if (dbError) {
      console.error('❌ [ProcessModel] DB update failed:', dbError.message);
    } else {
      console.log('✅ [ProcessModel] DB updated: processing_status=completed');
    }

    console.log(`📤 [ProcessModel] Done (total: ${((Date.now() - t0) / 1000).toFixed(1)}s, modal: ${modalDuration}s)`);

    return new Response(JSON.stringify({
      success: true,
      status: 'completed',
      scaledObjUrl: modalData.uploaded_obj ? objPublic : null,
      scaledStlUrl: modalData.uploaded_stl ? stlPublic : null,
      scaledGlbUrl: modalData.uploaded_glb ? glbPublic : null,
      report: modalData.report,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(`❌ [ProcessModel] Error after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, error.message);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
