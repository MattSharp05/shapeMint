/**
 * Hollow Test: Experimental hollowing via the test Modal app.
 *
 * Completely separate from production — calls shapemint-hollow-test Modal app.
 * Used from the Testing Environment page to iterate on hollowing params.
 *
 * Accepts JSON:
 *   {
 *     modelUrl: string,           // GLB/STL URL to hollow
 *     wallThickness?: number,     // mm, default 2.0
 *     drainHoles?: number,        // default 2
 *     holeDiameter?: number,      // mm, default 3.0
 *     voxelSize?: number,         // mm, default 0.5 (0 to skip remesh)
 *     modelId?: string,           // optional, for storage path
 *     userId?: string,            // optional, for storage path
 *   }
 *
 * Returns JSON:
 *   {
 *     success: boolean,
 *     stlUrl?: string,            // public URL of hollowed STL
 *     report?: object,            // processing report from Blender
 *     error?: string,
 *   }
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
  console.log('[HollowTest] Invoked at', new Date().toISOString());

  try {
    const body = await req.json();
    const {
      modelUrl,
      wallThickness = 2.0,
      drainHoles = 2,
      holeDiameter = 3.0,
      voxelSize = 0.5,
      modelId,
      userId,
    } = body;

    console.log('[HollowTest] Params:', JSON.stringify({
      modelUrl: modelUrl ? `${modelUrl.slice(0, 60)}...` : 'MISSING',
      wallThickness, drainHoles, holeDiameter, voxelSize,
      modelId: modelId || 'none', userId: userId || 'anon',
    }));

    if (!modelUrl) {
      return new Response(JSON.stringify({ error: 'Missing modelUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const modalUrl = Deno.env.get('MODAL_HOLLOW_TEST_ENDPOINT_URL');

    if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase config');
    if (!modalUrl) throw new Error('Missing MODAL_HOLLOW_TEST_ENDPOINT_URL — set this to the hollow-v2 Modal endpoint');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create signed upload URL for the hollowed STL
    const id = modelId || crypto.randomUUID();
    const basePath = userId ? `models/${userId}` : 'models/test';
    const stlPath = `${basePath}/${id}_hollowed_test.stl`;

    const { data: stlSigned, error: signError } = await supabase.storage
      .from('3d-models')
      .createSignedUploadUrl(stlPath, { upsert: true } as any);

    if (signError || !stlSigned?.signedUrl) {
      throw new Error(`Signed URL failed: ${signError?.message}`);
    }

    const stlPublic = supabase.storage.from('3d-models').getPublicUrl(stlPath).data.publicUrl;
    console.log('[HollowTest] STL will be at:', stlPublic.slice(0, 80));

    // Call test Modal app
    const modalPayload = {
      model_url: modelUrl,
      wall_thickness: wallThickness,
      drain_holes: drainHoles,
      hole_diameter: holeDiameter,
      voxel_size: voxelSize,
      upload_url: stlSigned.signedUrl,
      stl_public_url: stlPublic,
    };

    console.log('[HollowTest] Calling Modal hollow-v2...');
    const mt0 = Date.now();

    const modalResp = await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modalPayload),
    });

    const modalData = await modalResp.json();
    const modalDuration = ((Date.now() - mt0) / 1000).toFixed(1);

    console.log(`[HollowTest] Modal responded in ${modalDuration}s:`, JSON.stringify({
      success: modalData.success,
      uploaded: modalData.uploaded,
      material_saved: modalData.report?.material_saved_percent,
      stl_size: modalData.stl_size_bytes,
      error: modalData.error,
    }));

    if (!modalData.success) {
      console.error('[HollowTest] Modal failure:', modalData.error);
      return new Response(JSON.stringify({
        success: false,
        error: modalData.error || 'Hollowing failed',
        report: modalData.report,
        stderr: modalData.stderr,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[HollowTest] Done (total: ${totalTime}s, modal: ${modalDuration}s)`);

    return new Response(JSON.stringify({
      success: true,
      stlUrl: stlPublic,
      report: modalData.report,
      stlSizeBytes: modalData.stl_size_bytes,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(`[HollowTest] Error after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, error.message);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
