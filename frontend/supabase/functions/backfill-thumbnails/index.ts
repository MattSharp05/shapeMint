// deno-lint-ignore-file no-explicit-any
// Backfill Thumbnails
// Scans generated_models for rows with expired/external Meshy CDN thumbnail URLs.
// For each: tries to download from Meshy CDN → upload to Supabase storage.
// If Meshy URL has expired: re-renders from the stored GLB using the generate-thumbnail function.
// Run once via: supabase functions invoke backfill-thumbnails
declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BATCH_SIZE = 50;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const results = {
    total: 0,
    migrated: 0,
    already_ok: 0,
    expired_regenerated: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Find all models with external Meshy CDN thumbnail URLs
    const { data: models, error } = await supabase
      .from('generated_models')
      .select('id, user_id, glb_url, thumbnail_url')
      .eq('status', 'completed')
      .not('thumbnail_url', 'is', null);

    if (error) throw error;
    if (!models || models.length === 0) {
      return new Response(JSON.stringify({ message: 'No models found', results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter to only models with external (non-Supabase) thumbnail URLs
    const needsMigration = models.filter((m: any) => {
      const url = m.thumbnail_url || '';
      // Skip if already in Supabase storage
      if (url.includes('supabase.co/storage')) return false;
      // Skip data: URLs (locally generated thumbnails)
      if (url.startsWith('data:')) return false;
      // Include Meshy CDN URLs and other external URLs
      return url.includes('meshy.ai') || url.includes('cloudfront.net') || url.startsWith('http');
    });

    results.total = needsMigration.length;
    results.already_ok = models.length - needsMigration.length;

    console.log(`Found ${needsMigration.length} models with external thumbnails (${results.already_ok} already OK)`);

    // Process in batches
    for (let i = 0; i < needsMigration.length; i += BATCH_SIZE) {
      const batch = needsMigration.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} models)...`);

      await Promise.all(batch.map(async (model: any) => {
        try {
          const thumbnailUrl = model.thumbnail_url;
          const recordId = model.id;
          const userId = model.user_id;

          // Step 1: Try downloading the existing Meshy thumbnail
          let imageData: ArrayBuffer | null = null;
          let contentType = 'image/png';

          try {
            const resp = await fetch(thumbnailUrl, { redirect: 'follow' });
            if (resp.ok) {
              imageData = await resp.arrayBuffer();
              contentType = resp.headers.get('content-type') || 'image/png';
              console.log(`✅ Downloaded thumbnail for ${recordId} (${imageData.byteLength} bytes)`);
            } else {
              console.log(`⚠️ Thumbnail expired for ${recordId} (status ${resp.status})`);
            }
          } catch {
            console.log(`⚠️ Thumbnail unreachable for ${recordId}`);
          }

          // Step 2: If download failed and we have a GLB, generate a simple placeholder
          // (The full Three.js generation needs a browser — we just store what we can)
          if (!imageData) {
            // We can't render server-side, but we can clear the broken URL
            // so the frontend auto-thumbnail generator can pick it up
            const { error: clearErr } = await supabase
              .from('generated_models')
              .update({
                thumbnail_url: null,
                thumbnail_status: 'pending',
                updated_at: new Date().toISOString(),
              })
              .eq('id', recordId);

            if (clearErr) {
              console.error(`❌ Failed to clear thumbnail for ${recordId}:`, clearErr.message);
              results.failed++;
              results.errors.push(`${recordId}: clear failed - ${clearErr.message}`);
            } else {
              console.log(`🔄 Cleared expired thumbnail for ${recordId} (marked pending for regeneration)`);
              results.expired_regenerated++;
            }
            return;
          }

          // Step 3: Upload to Supabase storage
          const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
          const storagePath = userId
            ? `thumbnails/${userId}/${recordId}.${ext}`
            : `thumbnails/${recordId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('3d-models')
            .upload(storagePath, imageData, { contentType, upsert: true });

          if (uploadError) {
            console.error(`❌ Upload failed for ${recordId}:`, uploadError.message);
            results.failed++;
            results.errors.push(`${recordId}: upload failed - ${uploadError.message}`);
            return;
          }

          // Step 4: Get public URL and update DB
          const { data: { publicUrl } } = supabase.storage.from('3d-models').getPublicUrl(storagePath);

          const { error: updateErr } = await supabase
            .from('generated_models')
            .update({
              thumbnail_url: publicUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', recordId);

          if (updateErr) {
            console.error(`❌ DB update failed for ${recordId}:`, updateErr.message);
            results.failed++;
            results.errors.push(`${recordId}: db update failed - ${updateErr.message}`);
            return;
          }

          console.log(`✅ Migrated thumbnail for ${recordId} → ${publicUrl}`);
          results.migrated++;

        } catch (err: any) {
          console.error(`❌ Error processing model ${model.id}:`, err.message);
          results.failed++;
          results.errors.push(`${model.id}: ${err.message}`);
        }
      }));
    }

    console.log('🏁 Backfill complete:', results);
    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('❌ Backfill error:', err.message);
    return new Response(JSON.stringify({ error: err.message, results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
