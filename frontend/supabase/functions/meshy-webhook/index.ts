// deno-lint-ignore-file no-explicit-any
// Meshy Webhook Handler
// Receives global webhook callbacks from Meshy when tasks complete.
// Orchestrates: fetch model URLs → GLB storage → scaling → CraftCloud quotes → email notification
declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CRAFTCLOUD_API = 'https://api.craftcloud3d.com';
const COLOR_CONFIG_ID = 'a69b05d8-39b9-5f3e-bd47-9df42b4b84c3';
const MONO_CONFIG_ID = '6250ed03-5e96-5de8-bf06-44a13b952058';
const SLS_CONFIG_ID = '6c633df0-aca1-5b95-aaab-5c19b4e0d24f';

// ── Helpers ─────────────────────────────────────────────────────────────

async function fetchWithTimeout(
  resource: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${resource}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Meshy webhook often sends SUCCEEDED with empty model_urls.
// We need to poll the Meshy API to get the actual URLs.
async function fetchMeshyTaskDetails(
  meshyTaskId: string,
  taskType: string,
  meshyApiKey: string,
  reqId: string,
): Promise<{ glb?: string; obj?: string; stl?: string; mtl?: string; fbx?: string; usdz?: string; thumbnail?: string }> {
  // Determine the correct API endpoint based on task type
  let apiUrl: string;
  if (taskType === 'multi-image-to-3d' || taskType === 'multi_image_to_3d') {
    apiUrl = `https://api.meshy.ai/v1/multi-image-to-3d/${meshyTaskId}`;
  } else if (taskType === 'image-to-3d' || taskType === 'image_to_3d') {
    apiUrl = `https://api.meshy.ai/v1/image-to-3d/${meshyTaskId}`;
  } else {
    apiUrl = `https://api.meshy.ai/v2/text-to-3d/${meshyTaskId}`;
  }

  console.log(`[${reqId}] 🔍 Polling Meshy API for task details: ${apiUrl}`);

  // Poll up to 10 times (30 seconds) in case files aren't ready yet
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const resp = await fetchWithTimeout(apiUrl, {
        headers: { 'Authorization': `Bearer ${meshyApiKey}` },
        timeoutMs: 10000,
      });

      if (!resp.ok) {
        console.warn(`[${reqId}] ⚠️ Meshy API poll attempt ${attempt + 1} failed: ${resp.status}`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      const data = await resp.json();
      console.log(`[${reqId}] Meshy API response (attempt ${attempt + 1}): status=${data.status}, model_urls=${JSON.stringify(data.model_urls)}, thumbnail=${data.thumbnail_url || '(empty)'}`);

      const urls = data.model_urls || {};
      const hasUrls = urls.glb || urls.obj || urls.stl;

      if (hasUrls) {
        console.log(`[${reqId}] ✅ Got model URLs from Meshy API`);
        return {
          glb: urls.glb || undefined,
          obj: urls.obj || undefined,
          stl: urls.stl || undefined,
          mtl: urls.mtl || undefined,
          fbx: urls.fbx || undefined,
          usdz: urls.usdz || undefined,
          thumbnail: data.thumbnail_url || undefined,
        };
      }

      // Status is SUCCEEDED but no URLs yet — files may still be processing
      if (data.status === 'SUCCEEDED' || data.status === 'COMPLETED') {
        console.log(`[${reqId}] Task SUCCEEDED but no URLs yet — waiting 3s (attempt ${attempt + 1}/10)`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      // Task still processing
      if (data.status === 'IN_PROGRESS' || data.status === 'PENDING') {
        console.log(`[${reqId}] Task still ${data.status} — waiting 3s (attempt ${attempt + 1}/10)`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      // Failed or unknown status
      console.error(`[${reqId}] ❌ Unexpected task status: ${data.status}`);
      return {};
    } catch (err: any) {
      console.warn(`[${reqId}] ⚠️ Meshy API poll error (attempt ${attempt + 1}):`, err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.error(`[${reqId}] ❌ Failed to get model URLs after 10 attempts`);
  return {};
}

async function storeGlbInSupabase(
  meshyGlbUrl: string,
  recordId: string,
  userId: string | null,
  supabase: any
): Promise<string> {
  try {
    console.log('📦 Downloading GLB from Meshy CDN...');
    const resp = await fetch(meshyGlbUrl);
    if (!resp.ok) { console.error('❌ GLB download failed:', resp.status); return meshyGlbUrl; }

    const glbData = await resp.arrayBuffer();
    const storagePath = userId ? `models/${userId}/${recordId}.glb` : `models/${recordId}.glb`;

    console.log(`📤 Uploading GLB to Supabase: ${storagePath} (${glbData.byteLength} bytes)`);
    const { error: uploadError } = await supabase.storage
      .from('3d-models')
      .upload(storagePath, glbData, { contentType: 'model/gltf-binary', upsert: true });

    if (uploadError) { console.error('❌ Supabase upload error:', uploadError); return meshyGlbUrl; }

    const { data: { publicUrl } } = supabase.storage.from('3d-models').getPublicUrl(storagePath);
    console.log('✅ GLB stored:', publicUrl);
    return publicUrl;
  } catch (err: any) {
    console.error('❌ storeGlbInSupabase error:', err.message);
    return meshyGlbUrl;
  }
}

// ── CraftCloud quoting (inline — avoids cross-function HTTP) ────────

async function uploadModelToCraftcloud(fileBytes: Uint8Array, fileName: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', new Blob([fileBytes], { type: 'application/octet-stream' }), fileName);
  formData.append('unit', 'mm');

  const resp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/model`, { method: 'POST', body: formData, timeoutMs: 60000 });
  if (!resp.ok) throw new Error(`CC upload failed (${resp.status})`);

  const data = await resp.json();
  const modelId = Array.isArray(data) ? data[0]?.modelId : data?.modelId;
  if (!modelId) throw new Error('CC upload: no modelId');
  return modelId;
}

async function pollModelReady(modelId: string): Promise<void> {
  for (let i = 0; i < 15; i++) {
    const resp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/model/${modelId}`, { timeoutMs: 10000 });
    if (resp.status === 200) return;
    if (resp.status === 206) { await new Promise(r => setTimeout(r, 2000)); continue; }
    throw new Error(`CC model poll failed (${resp.status})`);
  }
  throw new Error('CC model parsing timed out');
}

async function requestPrices(modelId: string, materialConfigId: string, quantity: number, countryCode: string): Promise<string> {
  const resp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency: 'USD', countryCode, models: [{ modelId, quantity, scale: 1 }], materialConfigIds: [materialConfigId] }),
    timeoutMs: 15000,
  });
  if (!resp.ok) throw new Error(`CC price request failed (${resp.status})`);
  const data = await resp.json();
  if (!data?.priceId) throw new Error('CC price: no priceId');
  return data.priceId;
}

async function pollPrices(priceId: string): Promise<{ quotes: any[]; shippings: any[] }> {
  let lastQuotes: any[] = [];
  let lastShippings: any[] = [];
  for (let i = 0; i < 30; i++) {
    const resp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/price/${priceId}`, { timeoutMs: 15000 });
    if (!resp.ok) { await new Promise(r => setTimeout(r, 3000)); continue; }
    const data = await resp.json();
    lastQuotes = data?.quotes || [];
    lastShippings = data?.shippings || [];
    const complete = data?.complete === true || data?.isComplete === true;
    if (complete || lastQuotes.length > 0) {
      if (!complete && i < 5) { await new Promise(r => setTimeout(r, 3000)); continue; }
      return { quotes: lastQuotes, shippings: lastShippings };
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  if (lastQuotes.length > 0) return { quotes: lastQuotes, shippings: lastShippings };
  throw new Error('CC price polling timed out');
}

async function buildVendorOptions(quotes: any[], shippings: any[]) {
  const options = quotes.map(q => {
    const vendorShips = shippings.filter(s => s.vendorId === q.vendorId);
    const cheapest = vendorShips.length > 0 ? vendorShips.reduce((b, s) => s.price < b.price ? s : b) : null;
    const shipPrice = cheapest?.price ?? 0;
    return {
      vendorId: q.vendorId,
      itemPrice: q.price,
      shippingPrice: shipPrice,
      totalPrice: Number((q.price + shipPrice).toFixed(2)),
      productionTimeFast: q.productionTimeFast,
      productionTimeSlow: q.productionTimeSlow,
      craftcloudQuoteId: q.quoteId,
      craftcloudShippingId: cheapest?.shippingId ?? '',
      shippingName: cheapest?.name ?? '',
      shippingDeliveryTime: cheapest?.deliveryTime ?? '',
      minimumFee: undefined as number | undefined,
      cartId: undefined as string | undefined,
    };
  }).sort((a, b) => a.totalPrice - b.totalPrice);

  // Verify real totals via cart creation for top vendors (catches minimum order fees)
  const topVendors = options.slice(0, 8);
  const cartResults = await Promise.allSettled(
    topVendors.map(async (v) => {
      const cartPayload: any = {
        quotes: [{ id: v.craftcloudQuoteId }],
        currency: 'USD',
      };
      if (v.craftcloudShippingId) {
        cartPayload.shippingIds = [v.craftcloudShippingId];
      }
      const resp = await fetchWithTimeout(`https://api.craftcloud3d.com/v5/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartPayload),
        timeoutMs: 10000,
      });
      if (!resp.ok) return null;
      return resp.json();
    })
  );

  for (let i = 0; i < topVendors.length; i++) {
    const result = cartResults[i];
    if (result.status !== 'fulfilled' || !result.value) continue;
    const cartData = result.value;

    const amounts = cartData?.amounts?.total;
    const cartQuote = cartData?.quotes?.[0];
    const cartShipping = cartData?.shippings?.[0];
    const cartTotal = amounts?.totalNetPrice
      ?? Number(((cartQuote?.price ?? 0) + (cartShipping?.price ?? 0)).toFixed(2));

    const rawTotal = topVendors[i].totalPrice;
    const minProd = cartData?.minimumProductionPrice;
    let minimumFee = 0;

    // Check for minimum production fee (explicit or derived)
    if (minProd) {
      const vendorMin = minProd[topVendors[i].vendorId];
      if (vendorMin?.productionFee) minimumFee = vendorMin.productionFee;
    }
    if (minimumFee === 0 && cartTotal > rawTotal + 0.01) {
      minimumFee = Number((cartTotal - rawTotal).toFixed(2));
    }

    topVendors[i].totalPrice = Number(cartTotal.toFixed(2));
    topVendors[i].minimumFee = minimumFee > 0 ? Number(minimumFee.toFixed(2)) : undefined;
    topVendors[i].cartId = cartData.cartId;
  }

  // Re-sort after price adjustments
  options.sort((a, b) => a.totalPrice - b.totalPrice);
  return options;
}

async function getQuoteForMaterial(
  fileBytes: Uint8Array,
  fileName: string,
  ccModelId: string,
  materialConfigId: string,
  countryCode: string
): Promise<{ vendors: any[]; craftcloudPriceId: string; currency: string } | null> {
  try {
    const priceId = await requestPrices(ccModelId, materialConfigId, 1, countryCode);
    const { quotes, shippings } = await pollPrices(priceId);
    if (quotes.length === 0) return null;
    return { vendors: await buildVendorOptions(quotes, shippings), craftcloudPriceId: priceId, currency: 'USD' };
  } catch (err: any) {
    console.error(`Quote failed for material ${materialConfigId}:`, err.message);
    return null;
  }
}

// ── Main handler ────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  const reqId = crypto.randomUUID().slice(0, 8);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔔 [${reqId}] meshy-webhook invoked | method=${req.method} | url=${req.url}`);
  console.log(`🔔 [${reqId}] headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}`);

  if (req.method === 'OPTIONS') {
    console.log(`[${reqId}] CORS preflight — returning 200`);
    return new Response('ok', { headers: corsHeaders });
  }

  // Allow GET for health-check / manual testing
  if (req.method === 'GET') {
    console.log(`[${reqId}] GET health-check — returning 200`);
    return new Response(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate webhook secret
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  const expectedSecret = Deno.env.get('MESHY_WEBHOOK_SECRET');
  console.log(`[${reqId}] Secret check: received=${secret ? 'yes' : 'no'}, expected=${expectedSecret ? 'configured' : 'NOT SET'}, match=${secret === expectedSecret}`);
  if (expectedSecret && secret !== expectedSecret) {
    console.error(`❌ [${reqId}] Invalid webhook secret — rejecting`);
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const meshyApiKey = Deno.env.get('MESHY_API_KEY');
  console.log(`[${reqId}] Env vars: SUPABASE_URL=${supabaseUrl ? 'set' : 'MISSING'}, SERVICE_KEY=${serviceKey ? 'set' : 'MISSING'}, MESHY_KEY=${meshyApiKey ? 'set' : 'MISSING'}`);
  if (!supabaseUrl || !serviceKey) {
    console.error(`❌ [${reqId}] Server misconfigured — missing env vars`);
    return new Response('Server misconfigured', { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const rawBody = await req.text();
    console.log(`[${reqId}] Raw body (first 2000 chars): ${rawBody.slice(0, 2000)}`);

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr: any) {
      console.error(`❌ [${reqId}] JSON parse failed:`, parseErr.message);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const meshyTaskId = payload.id;
    const status = payload.status; // SUCCEEDED, FAILED, PENDING, IN_PROGRESS
    const taskType = payload.type; // e.g. "multi-image-to-3d", "image-to-3d", "text-to-3d"

    console.log(`[${reqId}] Parsed: meshyTaskId=${meshyTaskId}, status=${status}, taskType=${taskType}`);
    console.log(`[${reqId}] Full payload keys: ${Object.keys(payload).join(', ')}`);

    if (!meshyTaskId) {
      console.error(`❌ [${reqId}] No task ID in payload`);
      return new Response(JSON.stringify({ error: 'No task ID in payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Handle progress updates (IN_PROGRESS, PENDING, etc.)
    if (status !== 'SUCCEEDED' && status !== 'FAILED') {
      const progress = payload.progress ?? null;
      console.log(`⏳ [${reqId}] Non-terminal status "${status}", progress=${progress}`);

      // Update progress in DB if we have a value
      if (progress !== null && meshyTaskId) {
        const { data: progressRecord } = await supabase
          .from('generated_models')
          .select('id')
          .or(`meshy_task_id.eq.${meshyTaskId},meshy_refine_task_id.eq.${meshyTaskId}`)
          .limit(1)
          .maybeSingle();

        if (progressRecord) {
          const { error: progressErr } = await supabase.from('generated_models').update({
            progress: progress,
            updated_at: new Date().toISOString(),
          }).eq('id', progressRecord.id);
          if (progressErr) {
            console.warn(`[${reqId}] ⚠️ Progress update failed:`, progressErr.message);
          } else {
            console.log(`[${reqId}] ✅ Progress updated to ${progress}% for record ${progressRecord.id}`);
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Look up record by meshy_task_id OR meshy_refine_task_id
    console.log(`[${reqId}] Looking up DB record for meshy_task_id=${meshyTaskId}...`);
    const { data: record, error: lookupErr } = await supabase
      .from('generated_models')
      .select('*')
      .or(`meshy_task_id.eq.${meshyTaskId},meshy_refine_task_id.eq.${meshyTaskId}`)
      .limit(1)
      .maybeSingle();

    if (lookupErr || !record) {
      console.error(`❌ [${reqId}] No DB record found for meshy task: ${meshyTaskId}`, lookupErr?.message);
      return new Response(JSON.stringify({ received: true, warning: 'no_matching_record' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[${reqId}] Found DB record: id=${record.id}, status=${record.status}, type=${record.type}, meshy_task_id=${record.meshy_task_id}, meshy_refine_task_id=${record.meshy_refine_task_id}`);

    // Idempotency: skip if already completed or being processed by another webhook execution
    if (record.status === 'completed') {
      console.log(`⚡ [${reqId}] Record already completed — skipping duplicate webhook`);
      return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (record.processing_status === 'processing' || record.processing_status === 'completed') {
      console.log(`⚡ [${reqId}] Processing already ${record.processing_status} — skipping duplicate webhook`);
      return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const recordId = record.id;
    const userId = record.user_id;

    // ── Handle FAILED ──
    if (status === 'FAILED') {
      console.error(`❌ [${reqId}] Meshy task FAILED:`, payload.error_message || payload.task_error);
      await supabase.from('generated_models').update({
        status: 'failed',
        notes: `Meshy error: ${payload.error_message || payload.task_error || 'Unknown'}`,
        updated_at: new Date().toISOString(),
      }).eq('id', recordId);
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Handle SUCCEEDED ──
    console.log(`✅ [${reqId}] Meshy task SUCCEEDED — processing...`);
    console.log(`[${reqId}] Webhook payload model_urls: ${JSON.stringify(payload.model_urls)}`);
    console.log(`[${reqId}] Webhook payload thumbnail_url: ${payload.thumbnail_url || '(empty)'}`);

    // Text-to-3D refine chain: if this is a preview completion (no refine task yet), kick off refine
    const isPreviewCompletion = record.meshy_task_id === meshyTaskId && !record.meshy_refine_task_id && record.type === 'text-to-3d';
    console.log(`[${reqId}] isPreviewCompletion=${isPreviewCompletion} (type=${record.type}, hasRefineId=${!!record.meshy_refine_task_id})`);
    if (isPreviewCompletion && meshyApiKey) {
      console.log(`🎨 [${reqId}] Text-to-3D preview done — starting refine...`);
      try {
        const refineResp = await fetch('https://api.meshy.ai/v2/text-to-3d', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${meshyApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'refine', preview_task_id: meshyTaskId, enable_pbr: false }),
        });
        if (refineResp.ok) {
          const refineData = await refineResp.json();
          const refineTaskId = refineData?.result;
          if (refineTaskId) {
            console.log('✅ Refine task started:', refineTaskId);
            await supabase.from('generated_models').update({
              meshy_refine_task_id: refineTaskId,
              updated_at: new Date().toISOString(),
            }).eq('id', recordId);
            // Webhook will fire again when refine completes
            return new Response(JSON.stringify({ received: true, refine_started: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } else {
          console.error('❌ Refine request failed:', await refineResp.text());
        }
      } catch (refErr: any) {
        console.error('❌ Refine error:', refErr.message);
      }
      // Fall through to process the preview model if refine fails
    }

    // ── Step 1: Get model URLs ──
    // Meshy webhook often sends SUCCEEDED with empty model_urls.
    // Check the webhook payload first, then poll Meshy API if needed.
    let meshyGlbUrl = payload.model_urls?.glb || '';
    let meshyObjUrl = payload.model_urls?.obj || '';
    let meshyStlUrl = payload.model_urls?.stl || '';
    let meshyMtlUrl = payload.model_urls?.mtl || '';
    let meshyFbxUrl = payload.model_urls?.fbx || '';
    let meshyUsdzUrl = payload.model_urls?.usdz || '';
    let thumbnailUrl = payload.thumbnail_url || '';

    const hasUrlsFromWebhook = !!(meshyGlbUrl || meshyObjUrl || meshyStlUrl);
    console.log(`[${reqId}] Step 1a: URLs from webhook payload: ${hasUrlsFromWebhook ? 'YES' : 'NO (empty)'}`);

    if (!hasUrlsFromWebhook && meshyApiKey) {
      console.log(`[${reqId}] Step 1b: Polling Meshy API to get model URLs...`);
      const meshyDetails = await fetchMeshyTaskDetails(meshyTaskId, record.type || taskType || 'image-to-3d', meshyApiKey, reqId);
      meshyGlbUrl = meshyDetails.glb || '';
      meshyObjUrl = meshyDetails.obj || '';
      meshyStlUrl = meshyDetails.stl || '';
      meshyMtlUrl = meshyDetails.mtl || '';
      meshyFbxUrl = meshyDetails.fbx || '';
      meshyUsdzUrl = meshyDetails.usdz || '';
      thumbnailUrl = meshyDetails.thumbnail || thumbnailUrl;
      console.log(`[${reqId}] After API poll: glb=${meshyGlbUrl ? 'YES' : 'NO'}, obj=${meshyObjUrl ? 'YES' : 'NO'}, stl=${meshyStlUrl ? 'YES' : 'NO'}, thumbnail=${thumbnailUrl ? 'YES' : 'NO'}`);
    } else if (!hasUrlsFromWebhook && !meshyApiKey) {
      console.error(`[${reqId}] ❌ No model URLs and no MESHY_API_KEY to poll — cannot proceed`);
    }

    // ── Step 1c: Store GLB in Supabase (for ModelViewer — keeps colors in browser) ──
    let storedGlbUrl = meshyGlbUrl || '';
    console.log(`[${reqId}] Step 1c: Store GLB. meshyGlbUrl=${meshyGlbUrl ? 'present' : 'MISSING'}`);
    if (meshyGlbUrl) {
      storedGlbUrl = await storeGlbInSupabase(meshyGlbUrl, recordId, userId, supabase);
      console.log(`[${reqId}] GLB stored: ${storedGlbUrl === meshyGlbUrl ? 'kept original' : 'uploaded to Supabase'}`);
    }

    // ── Step 1d: Save Meshy CDN URLs to DB (skip downloading OBJ/MTL to save memory) ──
    const storedObjUrl = meshyObjUrl || '';
    const storedMtlUrl = meshyMtlUrl || '';
    const storedTextureUrls: string[] = [];
    console.log(`[${reqId}] Step 1d: Saving Meshy URLs to DB (OBJ/MTL not downloaded to save memory)`);

    // Update DB with model URLs (using Supabase GLB URL, Meshy CDN for others)
    const urlUpdate: any = {
      glb_url: storedGlbUrl || null,
      model_url: storedGlbUrl || null,  // Keep GLB as model_url for ModelViewer
      obj_url: storedObjUrl || meshyObjUrl || null,
      stl_url: meshyStlUrl || null,
      mtl_url: storedMtlUrl || meshyMtlUrl || null,
      fbx_url: meshyFbxUrl || null,
      usdz_url: meshyUsdzUrl || null,
      thumbnail_url: thumbnailUrl || null,
      texture_urls: storedTextureUrls.length > 0 ? storedTextureUrls : null,
      updated_at: new Date().toISOString(),
    };
    if (meshyGlbUrl && meshyGlbUrl !== storedGlbUrl) {
      urlUpdate.notes = `Original Meshy GLB: ${meshyGlbUrl}`;
    }
    const { error: urlUpdateErr } = await supabase.from('generated_models').update(urlUpdate).eq('id', recordId);
    if (urlUpdateErr) {
      console.error(`[${reqId}] ❌ URL update failed:`, urlUpdateErr.message);
    } else {
      console.log(`[${reqId}] ✅ Model URLs saved to DB (GLB stored, OBJ/MTL/STL as Meshy CDN URLs)`);
    }

    // ── Step 2: Scale model via Blender (hollowing disabled) ──
    // process-model is now SYNCHRONOUS — it waits for Modal and returns the results directly.
    let finalStlUrl: string | null = null;
    let finalGlbUrl: string | null = null;
    const dims = record.target_dimensions;
    console.log(`[${reqId}] Step 2: Process (scale). target_dimensions=${dims ? JSON.stringify(dims) : 'none'}, hasGlbUrl=${!!storedGlbUrl}`);
    if (dims && storedGlbUrl) {
      try {
        console.log(`📐 [${reqId}] Calling process-model (synchronous — waits for Blender)...`, dims);
        const processStart = Date.now();
        const { data: processData, error: processErr } = await supabase.functions.invoke('process-model', {
          body: {
            glbUrl: storedGlbUrl,
            modelId: recordId,
            userId: userId || '00000000-0000-0000-0000-000000000000',
            scaleValue: dims.value,
            scaleUnit: dims.unit,
            scaleTarget: dims.target,
            wallThickness: 0,   // Hollowing disabled for now — scale only
            drainHoles: 0,
            holeDiameter: 0,
          },
        });
        const processDuration = ((Date.now() - processStart) / 1000).toFixed(1);

        if (!processErr && processData?.success) {
          finalStlUrl = processData.scaledStlUrl || null;
          finalGlbUrl = processData.scaledGlbUrl || null;
          const report = processData.report;
          console.log(`✅ [${reqId}] Processing completed in ${processDuration}s.`);
          console.log(`✅ [${reqId}]   scaled_stl=${finalStlUrl ? finalStlUrl.slice(-60) : 'NONE'}`);
          console.log(`✅ [${reqId}]   scaled_glb=${finalGlbUrl ? finalGlbUrl.slice(-60) : 'NONE'}`);
          if (report) {
            console.log(`✅ [${reqId}]   dims=${report.final?.dimensions_m?.map((d: number) => (d * 100).toFixed(1) + 'cm')}, material_saved=${report.material_saved_percent}%`);
          }
        } else {
          console.warn(`⚠️ [${reqId}] Processing failed after ${processDuration}s:`, processErr?.message || processData?.error);
        }
      } catch (processErr: any) {
        console.warn(`⚠️ [${reqId}] Process error (non-critical):`, processErr.message);
      }
    }

    // Use scaled GLB for ALL quotes (has colors for color quotes, geometry for mono/SLS).
    // One upload to CraftCloud, reused for all 3 material types.
    const quoteModelUrl = finalGlbUrl || finalStlUrl || storedGlbUrl;

    // ── Step 3: Fetch CraftCloud quotes ──
    const shippingInfo = record.shipping_info;
    let quoteUpdate: Record<string, any> = {};
    console.log(`[${reqId}] Step 3: Quotes. shippingInfo=${shippingInfo ? 'present' : 'MISSING'}`);
    console.log(`[${reqId}]   quote url: ${quoteModelUrl ? quoteModelUrl.slice(-50) : 'NONE'} (${finalGlbUrl ? 'scaled_glb' : finalStlUrl ? 'scaled_stl' : 'original_glb'})`);

    if (shippingInfo && quoteModelUrl) {
      try {
        console.log(`💰 [${reqId}] Downloading model for quotes...`);
        const modelResp = await fetchWithTimeout(quoteModelUrl, { timeoutMs: 30000 });
        if (!modelResp.ok) throw new Error(`Model download failed (${modelResp.status})`);
        const modelBytes = new Uint8Array(await modelResp.arrayBuffer());
        const modelFileName = quoteModelUrl.split('/').pop()?.split('?')[0] || 'model.glb';
        console.log(`💰 [${reqId}] Downloaded ${modelFileName}: ${modelBytes.length.toLocaleString()} bytes`);

        // Upload to CraftCloud once, reuse for all materials
        const ccModelId = await uploadModelToCraftcloud(modelBytes, modelFileName);
        await pollModelReady(ccModelId);
        const countryCode = shippingInfo.country || 'US';

        // Fetch all 3 material quotes in parallel
        const [colorResult, monoResult, slsResult] = await Promise.allSettled([
          getQuoteForMaterial(modelBytes, modelFileName, ccModelId, COLOR_CONFIG_ID, countryCode),
          getQuoteForMaterial(modelBytes, modelFileName, ccModelId, MONO_CONFIG_ID, countryCode),
          getQuoteForMaterial(modelBytes, modelFileName, ccModelId, SLS_CONFIG_ID, countryCode),
        ]);

        if (colorResult.status === 'fulfilled' && colorResult.value) {
          quoteUpdate.color_quotes = colorResult.value;
          console.log(`✅ [${reqId}] Color quotes:`, colorResult.value.vendors.length, 'vendors, cheapest:', colorResult.value.vendors[0]?.totalPrice);
        } else {
          console.warn(`⚠️ [${reqId}] Color quotes failed:`, colorResult.status === 'rejected' ? colorResult.reason?.message : 'no vendors');
        }
        if (monoResult.status === 'fulfilled' && monoResult.value) {
          quoteUpdate.mono_quotes = monoResult.value;
          console.log(`✅ [${reqId}] Mono quotes:`, monoResult.value.vendors.length, 'vendors, cheapest:', monoResult.value.vendors[0]?.totalPrice);
        }
        if (slsResult.status === 'fulfilled' && slsResult.value) {
          quoteUpdate.sls_quotes = slsResult.value;
          console.log(`✅ [${reqId}] SLS quotes:`, slsResult.value.vendors.length, 'vendors, cheapest:', slsResult.value.vendors[0]?.totalPrice);
        }
      } catch (quoteErr: any) {
        console.error(`⚠️ [${reqId}] CraftCloud quoting failed (non-critical):`, quoteErr.message);
      }
    } else {
      if (!shippingInfo) console.log(`[${reqId}] ℹ️ No shipping info — skipping quotes`);
      if (!quoteModelUrl) console.log(`[${reqId}] ℹ️ No model URL available — skipping quotes`);
    }

    // ── Step 4: Mark completed ──
    console.log(`[${reqId}] Step 4: Marking completed with ${Object.keys(quoteUpdate).length} quote fields`);
    const { error: completeErr } = await supabase.from('generated_models').update({
      status: 'completed',
      ...quoteUpdate,
      updated_at: new Date().toISOString(),
    }).eq('id', recordId);
    if (completeErr) {
      console.error(`❌ [${reqId}] Failed to mark completed:`, completeErr.message);
    } else {
      console.log(`✅ [${reqId}] Model marked as completed: ${recordId}`);
    }

    // ── Step 5: Send notifications (fire and forget) ──
    if (shippingInfo?.email) {
      const colorQuoteData = quoteUpdate.color_quotes?.vendors?.[0]
        ? { totalPrice: quoteUpdate.color_quotes.vendors[0].totalPrice, vendorId: quoteUpdate.color_quotes.vendors[0].vendorId }
        : undefined;
      const monoQuoteData = quoteUpdate.mono_quotes?.vendors?.[0]
        ? { totalPrice: quoteUpdate.mono_quotes.vendors[0].totalPrice, vendorId: quoteUpdate.mono_quotes.vendors[0].vendorId }
        : undefined;
      const slsQuoteData = quoteUpdate.sls_quotes?.vendors?.[0]
        ? { totalPrice: quoteUpdate.sls_quotes.vendors[0].totalPrice, vendorId: quoteUpdate.sls_quotes.vendors[0].vendorId }
        : undefined;

      console.log(`📧 [${reqId}] Dispatching model-ready email to ${shippingInfo.email}`);
      supabase.functions.invoke('send-model-ready-email', {
        body: {
          email: shippingInfo.email,
          firstName: shippingInfo.firstName || '',
          modelId: recordId,
          prompt: record.prompt || 'AI-generated design',
          thumbnailUrl: record.selected_2d_preview || thumbnailUrl || undefined,
          colorQuote: colorQuoteData,
          monoQuote: monoQuoteData,
          slsQuote: slsQuoteData,
        },
      }).catch((err: any) => console.error(`⚠️ [${reqId}] Email failed:`, err.message));
    } else {
      console.log(`[${reqId}] No email to send (email=${shippingInfo?.email || 'none'})`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`🏁 [${reqId}] Webhook complete in ${elapsed}ms — recordId=${recordId}`);
    console.log(`${'='.repeat(60)}\n`);

    return new Response(
      JSON.stringify({ received: true, recordId, status: 'completed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`💥 [${reqId}] Webhook error after ${elapsed}ms:`, error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
