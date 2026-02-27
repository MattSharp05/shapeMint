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
  } catch (error: any) {
    // Provide better error message for timeout/abort errors
    if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
      throw new Error(`request_timeout: The request to ${resource} timed out after ${timeoutMs}ms. This may be due to a slow network connection or the server taking too long to respond.`);
    }
    throw error;
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
  // Check Content-Length header first to avoid loading large files
  const headResp = await fetchWithTimeout(modelUrl, { method: 'HEAD', timeoutMs: 5000 });
  const contentLength = headResp.headers.get('content-length');
  const fileSizeBytes = contentLength ? parseInt(contentLength, 10) : null;
  
  // Edge functions have ~150MB memory limit, but we need headroom for processing
  // Base64 encoding increases size by ~33%, and we need memory for other operations
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
  if (fileSizeBytes && fileSizeBytes > MAX_FILE_SIZE) {
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    console.error(JSON.stringify({ evt: 'file_too_large', fileSizeBytes, fileSizeMB, maxSizeMB: MAX_FILE_SIZE / (1024 * 1024) }));
    throw new Error(`file_too_large: File size (${fileSizeMB}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / (1024 * 1024)}MB). Please use a smaller file or compress the model.`);
  }

  // Fetch file - increased timeout for large files or slow connections
  const resp = await fetchWithTimeout(modelUrl, { timeoutMs: 60000 }); // 60 seconds for file download
  if (!resp.ok) throw new Error(`model_fetch_${resp.status}`);
  
  // Get actual file size from response if not available from HEAD
  const actualFileSize = fileSizeBytes || (resp.headers.get('content-length') ? parseInt(resp.headers.get('content-length')!, 10) : null);
  if (actualFileSize && actualFileSize > MAX_FILE_SIZE) {
    const fileSizeMB = (actualFileSize / (1024 * 1024)).toFixed(2);
    throw new Error(`file_too_large: File size (${fileSizeMB}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / (1024 * 1024)}MB).`);
  }

  const arrayBuf = await resp.arrayBuffer();
  const fileHash = await sha256Hex(arrayBuf);

  // Cache lookup
  const { data: cacheEntry } = await client.from('sw_models_cache').select('shapeways_model_id').eq('file_hash', fileHash).maybeSingle();
  if (cacheEntry) {
    console.log(JSON.stringify({ evt: 'model_cache', hit: true, file_hash: fileHash, shapeways_model_id: cacheEntry.shapeways_model_id }));
    return { fileHash, shapewaysModelId: cacheEntry.shapeways_model_id };
  }

  // Upload - use streaming base64 conversion to minimize memory usage
  const fileName = modelUrl.split('/').pop()?.split('?')[0] || 'model.stl';
  
  // Optimized base64 conversion that processes in chunks to minimize memory spikes
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000; // 32KB chunks
    let binary = '';
    
    // Process in chunks to avoid memory spikes
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      // Use apply with spread for smaller chunks to avoid call stack issues
      if (chunk.length < 8192) {
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      } else {
        // For larger chunks, process in sub-chunks
        for (let j = 0; j < chunk.length; j += 8192) {
          const subChunk = chunk.subarray(j, Math.min(j + 8192, chunk.length));
          binary += String.fromCharCode.apply(null, Array.from(subChunk));
        }
      }
    }
    return btoa(binary);
  }
  
  console.log(JSON.stringify({ evt: 'converting_to_base64', fileSizeBytes: arrayBuf.byteLength }));
  const b64 = arrayBufferToBase64(arrayBuf);
  
  // Clear arrayBuf from memory before creating JSON payload
  // Note: In JavaScript, we can't force GC, but we can help by not holding references
  const uploadPayload = {
    fileName,
    file: b64,
    hasRightsToModel: 1,
    acceptTermsAndConditions: 1,
    description: 'Uploaded via ShapeMint'
  };
  
  // Clear b64 reference after creating payload (though it's still in the object)
  console.log(JSON.stringify({ evt: 'uploading_to_shapeways', fileName, payloadSizeBytes: JSON.stringify(uploadPayload).length }));
  
  const uploadResp = await fetchWithTimeout(`${SHAPEWAYS_API}/models/v1`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(uploadPayload),
    timeoutMs: 60000 // Longer timeout for large files
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
  // Large files can take longer to process, so we poll for up to 2 minutes
  const maxAttempts = 30; // Increased from 20 to allow more time for large files
  const delayMs = 4000; // Increased from 2500ms to 4 seconds between attempts
  let lastJson: any = null;
  let lastSeenPrice: number | null = null;
  let consecutiveValidPrices = 0;
  const requiredConsecutive = 2; // Require 2 consecutive valid prices
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const resp = await fetchWithTimeout(`${SHAPEWAYS_API}/models/${modelId}/v1`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeoutMs: 15000 // Increased timeout for model info polling (15 seconds per request)
    });
    const json = await resp.json();
    lastJson = json;
    if (!resp.ok || json.result !== 'success') {
      // If transient server error, retry a few times
      console.error(JSON.stringify({ evt: 'model_info_fetch_failed', status: resp.status, attempt }));
      consecutiveValidPrices = 0; // Reset on error
    } else {
      const mat = json.materials?.[materialId];
      // Log material object for debugging
      try { console.log(JSON.stringify({ evt: 'model_material_entry', attempt, modelId, materialId, mat })); } catch {}
      if (!mat) {
        console.warn(JSON.stringify({ evt: 'material_not_found_in_response', attempt, modelId, materialId, availableMaterials: Object.keys(json.materials || {}) }));
        consecutiveValidPrices = 0;
      } else {
        // Prefer canonical basePrice when present; fall back to price fields
        const rawPrice = (mat.basePrice ?? mat.base_price ?? mat.price);
        const price = Number(rawPrice);
        const isPrintable = Boolean(mat.isPrintable || mat.is_printable || json.printable === 'true' || json.printable === true || json.printable === 'printable');
        // isActive can be explicitly false during processing, so only treat as true if explicitly true
        const isActive = mat.isActive === true || mat.is_active === true;
        
        // Check if we have a basePrice (more reliable indicator than flags)
        const hasBasePrice = !!(mat.basePrice || mat.base_price);
        const basePriceValue = Number(mat.basePrice ?? mat.base_price ?? 0);

        // Check if we have a valid price
        // Accept price if:
        // 1. Price > 0 AND (isPrintable OR isActive) - standard case
        // 2. Price > 0 AND hasBasePrice - if there's a basePrice, it's likely valid even if flags are false
        // 3. basePrice > 0 - basePrice is the most reliable indicator
        // 4. Price >= 0 AND isPrintable AND isActive - zero price but explicitly printable
        const hasValidPrice = !isNaN(price) && (
          (price > 0 && (isPrintable || isActive)) || 
          (price > 0 && hasBasePrice && basePriceValue > 0) ||
          (basePriceValue > 0) ||
          (price >= 0 && isPrintable && isActive)
        );

        if (hasValidPrice) {
          // If we've seen the same price in the previous successful poll, increment counter
          if (lastSeenPrice !== null && Math.abs(lastSeenPrice - price) < 0.000001) {
            consecutiveValidPrices++;
            // If we have enough consecutive valid prices, return
            if (consecutiveValidPrices >= requiredConsecutive) {
              console.log(JSON.stringify({ evt: 'price_stabilized', attempt, price, consecutiveValidPrices }));
              return price;
            }
          } else {
            // Price changed or first valid price - reset counter
            consecutiveValidPrices = 1;
            lastSeenPrice = price;
          }
        } else {
          // Invalid price (0 or negative, or not printable/active) - reset counter
          consecutiveValidPrices = 0;
          lastSeenPrice = null;
          console.log(JSON.stringify({ evt: 'invalid_price', attempt, price, basePrice: basePriceValue, hasBasePrice, isPrintable, isActive }));
        }
      }
    }
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  
  // Exhausted retries - check if we have any valid price data in the last response
  if (lastJson?.materials?.[materialId]) {
    const mat = lastJson.materials[materialId];
    const rawPrice = (mat.basePrice ?? mat.base_price ?? mat.price);
    const price = Number(rawPrice);
    const basePriceValue = Number(mat.basePrice ?? mat.base_price ?? 0);
    const hasBasePrice = !!(mat.basePrice || mat.base_price);
    const isPrintable = Boolean(mat.isPrintable || mat.is_printable);
    const isActive = mat.isActive === true || mat.is_active === true; // Only true if explicitly true
    
    console.log(JSON.stringify({ evt: 'checking_fallback_price', price, basePrice: basePriceValue, hasBasePrice, isPrintable, isActive, mat }));
    
    // If we have a valid price in the last response, use it even if not stabilized
    // Accept if: price > 0 AND (flags OR hasBasePrice) OR basePrice > 0
    if (!isNaN(price) && (
      (price > 0 && (isPrintable || isActive || (hasBasePrice && basePriceValue > 0))) ||
      (basePriceValue > 0)
    )) {
      const finalPrice = basePriceValue > 0 ? basePriceValue : price;
      console.warn(JSON.stringify({ evt: 'using_unstabilized_price', price: finalPrice, isPrintable, isActive, hasBasePrice }));
      return finalPrice;
    }
    
    // Check if model is still processing (price is 0 and not printable/active and no basePrice)
    if (price === 0 && basePriceValue === 0 && !isPrintable && !isActive) {
      console.error(JSON.stringify({ evt: 'model_still_processing', modelId, materialId, attempt: maxAttempts, totalWaitTimeSeconds: (maxAttempts * delayMs) / 1000 }));
      throw new Error('model_still_processing: Shapeways is still processing this model. Large files can take 2-3 minutes to process. Please try again in a few minutes.');
    }
  }
  
  // Exhausted retries - log full material data for debugging
  const lastMat = lastJson?.materials?.[materialId];
  console.error(JSON.stringify({ 
    evt: 'model_info_poll_timeout', 
    modelId, 
    materialId, 
    lastSeenPrice, 
    lastMaterial: lastMat ? {
      price: lastMat.price,
      basePrice: lastMat.basePrice,
      isPrintable: lastMat.isPrintable,
      isActive: lastMat.isActive,
      name: lastMat.name
    } : null,
    hasLastJson: !!lastJson,
    hasMaterials: !!lastJson?.materials,
    materialKeys: lastJson?.materials ? Object.keys(lastJson.materials) : []
  }));
  
  throw new Error('material_price_unavailable: Unable to get price for this material. The model may still be processing or the material may not be available for this model.');
}

async function getCheapestShipping(token: string, country: string, zip: string): Promise<{ price: number; optionId: string }> {
  const resp = await fetchWithTimeout(`${SHAPEWAYS_API}/cart/shipping-options/v1?country=${encodeURIComponent(country)}&zipCode=${encodeURIComponent(zip)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    timeoutMs: 15000 // Increased timeout for shipping options
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
  
  // Log all headers for debugging (excluding sensitive data)
  const allHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'authorization') {
      allHeaders[key] = value.substring(0, 20) + '...'; // Only log first 20 chars
    } else {
      allHeaders[key] = value;
    }
  });
  console.log(JSON.stringify({ evt: 'request_headers', headers: Object.keys(allHeaders), hasAuth: req.headers.has('Authorization') }));
  
  // Expect request context for auth from Supabase edge runtime
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error(JSON.stringify({ evt: 'missing_auth_header', allHeaders: Object.keys(allHeaders) }));
    return new Response(JSON.stringify({ error: 'unauthorized', message: 'Missing Authorization header. Please ensure you are logged in.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

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
      const infoResp = await fetchWithTimeout(`${SHAPEWAYS_API}/models/${shapewaysModelId}/v1`, { 
        headers: { 'Authorization': `Bearer ${token}` },
        timeoutMs: 15000 // Increased timeout for model info check
      });
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

    // Build response object - ensure all numeric values are properly formatted
    const responseData = { 
      quoteId: inserted.id, 
      priceTotal: Number(priceTotal.toFixed(2)), 
      currency: 'USD', 
      expiresAt, 
      reused: false, 
      itemTotal: Number(itemTotal.toFixed(2)), 
      surcharge: Number(surcharge.toFixed(2)), 
      shippingTotal: Number(shippingPrice.toFixed(2)) // Explicitly format and ensure it's a number
    };
    
    // Debug: Log what we're returning
    try { 
      console.log(JSON.stringify({ 
        evt: 'quote_response_data', 
        quoteId: responseData.quoteId,
        priceTotal: responseData.priceTotal,
        itemTotal: responseData.itemTotal,
        surcharge: responseData.surcharge,
        shippingTotal: responseData.shippingTotal,
        shippingPrice: shippingPrice, // Also log the original variable
        shippingPriceType: typeof shippingPrice,
        hasShippingTotal: 'shippingTotal' in responseData,
        responseDataKeys: Object.keys(responseData)
      })); 
    } catch {}
    
    // Double-check the response before sending
    const responseJson = JSON.stringify(responseData);
    try {
      const parsed = JSON.parse(responseJson);
      console.log(JSON.stringify({ evt: 'quote_response_verification', parsedShippingTotal: parsed.shippingTotal, parsedSurcharge: parsed.surcharge }));
    } catch {}
    
    return new Response(responseJson, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
  const err = e as Error;
  const isRange = err && err.name === 'RangeError' && /call stack|stack size/i.test(err.message || '');
  const isFileTooLarge = err.message?.includes('file_too_large');
  const isMemoryError = err.message?.includes('Memory limit exceeded') || err.message?.includes('memory');
  const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout') || err.message?.includes('aborted');
  
  console.error(JSON.stringify({ evt: 'quote_error', message: err.message, name: err.name, isFileTooLarge, isMemoryError, isTimeout }));
  
  // Provide helpful error messages
  let errorMessage = err.message;
  let statusCode = 500;
  
  if (isTimeout) {
    statusCode = 504; // Gateway Timeout
    errorMessage = 'The request timed out. This may happen with large files or when Shapeways is processing the model. Please try again in a few moments, or use a smaller file.';
  } else if (isFileTooLarge) {
    statusCode = 400;
    errorMessage = err.message || 'File is too large. Please use a file smaller than 50MB.';
  } else if (isMemoryError || isRange) {
    statusCode = 413; // Payload Too Large
    errorMessage = 'File is too large to process. Please use a smaller file or compress the model.';
  }
  
  return new Response(JSON.stringify({ 
    error: isTimeout ? 'request_timeout' : isFileTooLarge ? 'file_too_large' : isMemoryError ? 'file_too_large' : 'quote_failed', 
    message: errorMessage 
  }), { 
    status: statusCode, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
  }
});
