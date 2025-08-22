// deno-lint-ignore-file no-explicit-any
declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getShapewaysMaterialId } from '../_shared/material-mapping.ts';

interface QuoteInput {
  userId?: string; // Provided implicitly by auth
  model: { url: string } | { storagePath: string };
  selections: { baseMaterialId: string; colorId?: string; finishId?: string };
  quantity: number;
  shippingAddress: { firstName: string; lastName: string; email: string; address1: string; city: string; state: string; zipCode: string; country: string; phone: string };
}

interface ErrorResponse { error: string; details?: unknown }

const SHAPEWAYS_API = 'https://api.shapeways.com';

// Utility: timeout fetch
async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getAuthToken(): Promise<string> {
  const resp = await fetchWithTimeout(`${SHAPEWAYS_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: Deno.env.get('SHAPEWAYS_CLIENT_ID') || '',
      client_secret: Deno.env.get('SHAPEWAYS_CLIENT_SECRET') || ''
    })
  });
  if (!resp.ok) throw new Error(`auth_failed_${resp.status}`);
  const json = await resp.json();
  return json.access_token;
}

function validateInput(body: any): QuoteInput {
  if (!body || typeof body !== 'object') throw new Error('invalid_payload');
  const { model, selections, quantity, shippingAddress } = body;
  if (!model || typeof model !== 'object' || !('url' in model) && !('storagePath' in model)) throw new Error('invalid_model');
  if (!selections?.baseMaterialId) throw new Error('missing_baseMaterialId');
  if (!quantity || quantity <= 0 || quantity > 100) throw new Error('invalid_quantity');
  const sa = shippingAddress;
  const required = ['firstName','lastName','email','address1','city','state','zipCode','country','phone'];
  for (const f of required) if (!sa?.[f]) throw new Error(`missing_${f}`);
  return body as QuoteInput;
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

async function getExistingQuote(client: any, userId: string, modelUrl: string, materialId: string, zip: string, quantity: number) {
  const { data, error } = await client.from('quotes').select('*').eq('user_id', userId).eq('model_url', modelUrl).eq('material_id', materialId).eq('shipping_zip', zip).eq('quantity', quantity).eq('status','quoted').gt('expires_at', new Date().toISOString()).order('created_at',{ ascending: false }).limit(1).maybeSingle();
  if (error) console.error(JSON.stringify({ evt: 'reuse_query_error', message: error.message }));
  return data;
}

async function ensureModelUploaded(token: string, modelUrl: string, client: any) {
  // Fetch GLB
  const resp = await fetchWithTimeout(modelUrl, { timeoutMs: 10000 });
  if (!resp.ok) throw new Error(`model_fetch_${resp.status}`);
  const arrayBuf = await resp.arrayBuffer();
  const fileHash = await sha256Hex(arrayBuf);

  // Cache lookup
  const { data: cacheEntry } = await client.from('sw_models_cache').select('shapeways_model_id').eq('file_hash', fileHash).maybeSingle();
  if (cacheEntry) {
    console.log(JSON.stringify({ evt: 'model_cache', hit: true, file_hash: fileHash, shapeways_model_id: cacheEntry.shapeways_model_id }));
    return { fileHash, shapewaysModelId: cacheEntry.shapeways_model_id };
  }

  // Upload
  const fileName = modelUrl.split('/').pop()?.split('?')[0] || 'model.glb';
  // Previous implementation used String.fromCharCode(...Uint8Array) which overflows the call stack for large files.
  // Use a chunked conversion to base64 to avoid RangeError: Maximum call stack size exceeded.
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }
  const b64 = arrayBufferToBase64(arrayBuf);
  const uploadResp = await fetchWithTimeout(`${SHAPEWAYS_API}/models/v1`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      file: b64,
      hasRightsToModel: 1,
      acceptTermsAndConditions: 1,
      description: 'Uploaded via ShapeMint'
    })
  });
  const uploadJson = await uploadResp.json();
  if (!uploadResp.ok || uploadJson.result !== 'success') {
    console.error(JSON.stringify({ evt: 'upload_failed', status: uploadResp.status, body: uploadJson }));
    throw new Error('upload_failed');
  }
  const shapewaysModelId = uploadJson.modelId?.toString();
  // Insert cache (ignore conflict)
  await client.from('sw_models_cache').insert({ file_hash: fileHash, shapeways_model_id: shapewaysModelId }).select().maybeSingle();
  console.log(JSON.stringify({ evt: 'upload_success', shapeways_model_id: shapewaysModelId }));
  return { fileHash, shapewaysModelId };
}

async function getModelMaterialPrice(token: string, modelId: string, materialId: string): Promise<number> {
  // Poll the model info for the material price because newly uploaded models can be "processing".
  // To avoid transient prices, prefer basePrice when available and require two consecutive
  // identical non-zero price reads (stabilization) before returning.
  const maxAttempts = 20;
  const delayMs = 2500;
  let lastJson: any = null;
  let lastSeenPrice: number | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const resp = await fetchWithTimeout(`${SHAPEWAYS_API}/models/${modelId}/v1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await resp.json();
    lastJson = json;
    if (!resp.ok || json.result !== 'success') {
      // If transient server error, retry a few times
      console.error(JSON.stringify({ evt: 'model_info_fetch_failed', status: resp.status, attempt }));
    } else {
      const mat = json.materials?.[materialId];
      // Log material object for debugging
      try { console.log(JSON.stringify({ evt: 'model_material_entry', attempt, modelId, materialId, mat })); } catch {}
      if (!mat) throw new Error('material_not_found');
      // Prefer canonical basePrice when present; fall back to price fields
      const rawPrice = (mat.basePrice ?? mat.base_price ?? mat.price ?? mat.base_price);
      const price = Number(rawPrice);
      const isPrintable = Boolean(mat.isPrintable || mat.is_printable || json.printable === 'true' || json.printable === true || json.printable === 'printable');

      // If price is a valid non-negative number, consider it; prefer non-zero but accept zero when explicitly printable.
      if (!isNaN(price) && (price > 0 || (isPrintable && price >= 0))) {
        // If we've seen the same price in the previous successful poll, treat it as stabilized and return.
        if (lastSeenPrice !== null && Math.abs(lastSeenPrice - price) < 0.000001) {
          return price;
        }
        // Otherwise, record this price and continue polling for stabilization.
        lastSeenPrice = price;
      }
      // otherwise wait and retry
    }
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  // Exhausted retries
  console.error(JSON.stringify({ evt: 'model_info_poll_timeout', modelId, materialId, lastJson }));
  throw new Error('material_price_unavailable');
}

async function getCheapestShipping(token: string, country: string, zip: string): Promise<{ price: number; optionId: string }> {
  const resp = await fetchWithTimeout(`${SHAPEWAYS_API}/cart/shipping-options/v1?country=${encodeURIComponent(country)}&zipCode=${encodeURIComponent(zip)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const json = await resp.json();
  if (!resp.ok || json.result !== 'success') throw new Error('shipping_options_failed');
  const options = json.shippingOptions || json.shipping_options || {};
  let cheapest: { price: number; optionId: string } | null = null;
  for (const key of Object.keys(options)) {
    const o = options[key];
    const price = Number(o.price);
    if (isNaN(price)) continue;
    if (!cheapest || price < cheapest.price) cheapest = { price, optionId: key };
  }
  if (!cheapest) throw new Error('no_shipping_options');
  return cheapest;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  // Expect request context for auth from Supabase edge runtime
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

  // Create Supabase service client (needed for RLS bypass on insert + still propagate user context headers for row policies referencing auth.uid())
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error(JSON.stringify({ evt: 'config_error', missing: !supabaseUrl ? 'SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY' }));
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), { status: 500, headers: corsHeaders });
  }
  const supabaseClient = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });

  let body: QuoteInput;
  try {
    body = validateInput(await req.json());
  } catch (e) {
    return new Response(JSON.stringify({ error: 'validation_failed', message: (e as Error).message }), { status: 400, headers: corsHeaders });
  }

  const { model, selections, quantity, shippingAddress } = body;
  const modelUrl = 'url' in model ? model.url : model.storagePath; // For now we treat storagePath as direct URL
  const { baseMaterialId, colorId, finishId } = selections;

  try {
    const materialId = getShapewaysMaterialId(baseMaterialId, colorId, finishId);
    if (!materialId) return new Response(JSON.stringify({ error: 'mapping_not_found' }), { status: 400, headers: corsHeaders });

    // Derive user id from JWT (email-> user lookup would be fallback). Expect auth.uid exposed in request context soon; placeholder below.
    const jwt = authHeader.replace('Bearer ', '');
    let userId: string | undefined = undefined;
    try { const payload = JSON.parse(atob(jwt.split('.')[1] || 'e30=')); userId = payload.sub; } catch {}
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

    // Reuse logic (disabled temporarily)
    // NOTE: reusing existing quotes caused stale pricing/confusing UX; disable for now.
    // TODO: Reintroduce intelligent reuse with strict validation (match file_hash, material price snapshot, shipping option id, and a TTL) and ensure recalculation if any component changed.
    /*
    const existing = await getExistingQuote(supabaseClient, userId, modelUrl, materialId, shippingAddress.zipCode, quantity);
    if (existing) {
      return new Response(JSON.stringify({ quoteId: existing.id, priceTotal: existing.price_total, currency: existing.currency, reused: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    */

    const token = await getAuthToken();
    const { fileHash, shapewaysModelId } = await ensureModelUploaded(token, modelUrl, supabaseClient);

    // Pre-check full color support if user selected full-color MJF
    if (baseMaterialId === 'full-color-nylon-12-mjf') {
      // Fetch model info once (lightweight) to validate supportsColorFiles / printable
      const infoResp = await fetchWithTimeout(`${SHAPEWAYS_API}/models/${shapewaysModelId}/v1`, { headers: { 'Authorization': `Bearer ${token}` } });
      const infoJson = await infoResp.json();
      if (infoResp.ok && infoJson.result === 'success') {
        const mat = infoJson.materials?.[materialId];
        // Detect explicit negative signals (we only want to block on explicit denial)
        const explicitNoColorSignals = [
          mat?.supportsColorFiles === false,
          mat?.supports_color_files === false,
          mat?.colorTextureSupport === false,
          mat?.supportsColorTexture === false
        ];
        const explicitNoColor = explicitNoColorSignals.some(Boolean);

        const explicitNotPrintableSignals = [
          mat?.isPrintable === false,
          mat?.is_printable === false,
          infoJson.printable === false,
          infoJson.printable === 'false'
        ];
        const explicitNotPrintable = explicitNotPrintableSignals.some(Boolean);

        // Detect any texture/file evidence (various possible shapes in Shapeways response)
        const hasTextureArray = Array.isArray(infoJson.textures) && infoJson.textures.length > 0;
        const hasTextureFilesObj = infoJson.textureFiles && Object.keys(infoJson.textureFiles || {}).length > 0;
        const hasFilesWithImageMime = Array.isArray(infoJson.files) && infoJson.files.some((f: any) => typeof f.mimeType === 'string' && f.mimeType.startsWith('image/'));
        const hasAnyTextureEvidence = hasTextureArray || hasTextureFilesObj || hasFilesWithImageMime;

        // If the response explicitly denies both color support and printability and there's no texture evidence, block.
        if (explicitNoColor && explicitNotPrintable && !hasAnyTextureEvidence) {
          try { console.log(JSON.stringify({ evt: 'full_color_not_printable', modelId: shapewaysModelId, materialId, userId, reason: 'explicit_negative_signals', summary: { explicitNoColor, explicitNotPrintable, textures: infoJson.textures?.length || 0, hasTextureFiles: Boolean(infoJson.textureFiles), filesCount: infoJson.files?.length || 0 } })); } catch {}
          return new Response(JSON.stringify({ error: 'material_not_printable', message: 'Full Color Nylon (MJF) not available: model lacks texture/color data.', details: { modelId: shapewaysModelId, materialId, reason: 'no_color_support' } }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // Otherwise, don't block here; we will rely on the price-polling which is more permissive and checks for ready price.
      } else {
        // If model info fetch fails here, fall back to price polling which has its own retry logic
        try { console.log(JSON.stringify({ evt: 'full_color_precheck_skip', modelId: shapewaysModelId, status: infoResp.status })); } catch {}
      }
    }

    const materialPrice = await getModelMaterialPrice(token, shapewaysModelId, materialId);
    const { price: shippingPrice, optionId } = await getCheapestShipping(token, shippingAddress.country || 'US', shippingAddress.zipCode);
    // Apply US multiplier observed on Shapeways site; Multiplier unexplained on website
    const US_MULTIPLIER = 1.029999743654534201978254580344162098224258337636275;
    let appliedMaterialPrice = materialPrice;
    if ((shippingAddress.country || 'US').toUpperCase() === 'US') {
      appliedMaterialPrice = Number((materialPrice * US_MULTIPLIER).toFixed(6));
    }
    // Calculate item total and minimum-order surcharge (ensure items subtotal >= $25 before shipping)
    const itemTotal = Number((appliedMaterialPrice * quantity).toFixed(2));
    const MIN_ORDER = 25.0;
    const surcharge = itemTotal < MIN_ORDER ? Number((MIN_ORDER - itemTotal).toFixed(2)) : 0;
    // Debug log to help diagnose pricing issues
    try {
      console.log(JSON.stringify({ evt: 'price_debug', materialId, materialPrice, appliedMaterialPrice, multiplierApplied: (shippingAddress.country || 'US').toUpperCase() === 'US', quantity, itemTotal, surcharge, shippingPrice }));
    } catch {}
    const priceTotal = Number((itemTotal + surcharge + shippingPrice).toFixed(2));

    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const { data: inserted, error: insertErr } = await supabaseClient.from('quotes').insert({
      user_id: userId,
      vendor: 'shapeways',
      model_url: modelUrl,
      file_hash: fileHash,
      shapeways_model_id: shapewaysModelId,
      material_id: materialId,
      selections: selections,
      quantity,
      shipping_address: shippingAddress,
      shipping_zip: shippingAddress.zipCode,
      shapeways: { shippingOptionId: optionId, surcharge, item_total: itemTotal },
      price_total: priceTotal,
      currency: 'USD',
      status: 'quoted',
      expires_at: expiresAt
    }).select().maybeSingle();
    if (insertErr) throw new Error(`db_insert_failed:${insertErr.message}`);

  return new Response(JSON.stringify({ quoteId: inserted.id, priceTotal, currency: 'USD', expiresAt, reused: false, itemTotal, surcharge }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
  const err = e as Error;
  const isRange = err && err.name === 'RangeError' && /call stack|stack size/i.test(err.message || '');
  console.error(JSON.stringify({ evt: 'quote_error', message: err.message, name: err.name }));
  return new Response(JSON.stringify({ error: 'quote_failed', message: isRange ? 'file_encoding_failed' : err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
