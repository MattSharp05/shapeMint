// deno-lint-ignore-file no-explicit-any
// Creates a Shapeways order after performing a fresh re-quote and price discrepancy check.
// Flow:
// 1. Validate input (matches quote request shape + quoteId optional for UX reference)
// 2. Fresh model upload (cached) + material price poll + cheapest shipping (same logic as quote function)
// 3. Recompute pricing (item subtotal, surcharge, shipping, total)
// 4. If client supplied priorQuote {itemTotal,surcharge,total} ensure values match; else reject
// 5. Insert pending order row (idempotent via vendor_order_id null until vendor call succeeds)
// 6. Call Shapeways create order endpoint
// 7. Update order with vendor_order_id, status=submitted, timestamps, store raw vendor payload
// 8. Return order summary to client

// Provide Deno ambient for type-check context (edge runtime supplies it at execution time)
declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getShapewaysMaterialId } from '../_shared/material-mapping.ts';

interface CreateOrderInput {
  model: { url: string } | { storagePath: string };
  selections: { baseMaterialId: string; colorId?: string; finishId?: string };
  quantity: number;
  shippingAddress: { firstName: string; lastName: string; email: string; address1: string; city: string; state: string; zipCode: string; country: string; phone: string };
  priorQuote?: { itemTotal: number; surcharge: number; total: number };
  quoteId?: string; // For reference only
}

const SHAPEWAYS_API = 'https://api.shapeways.com';

async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { 
    return await fetch(resource, { ...rest, signal: controller.signal }); 
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${resource}`);
    }
    throw e;
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

function validateInput(body: any): CreateOrderInput {
  if (!body || typeof body !== 'object') throw new Error('invalid_payload');
  const { model, selections, quantity, shippingAddress } = body;
  if (!model || typeof model !== 'object' || !('url' in model) && !('storagePath' in model)) throw new Error('invalid_model');
  if (!selections?.baseMaterialId) throw new Error('missing_baseMaterialId');
  if (!quantity || quantity <= 0 || quantity > 100) throw new Error('invalid_quantity');
  const sa = shippingAddress;
  const required = ['firstName','lastName','email','address1','city','state','zipCode','country','phone'];
  for (const f of required) if (!sa?.[f]) throw new Error(`missing_${f}`);
  return body as CreateOrderInput;
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

async function ensureModelUploaded(token: string, modelUrl: string, client: any) {
  const resp = await fetchWithTimeout(modelUrl, { timeoutMs: 10000 });
  if (!resp.ok) throw new Error(`model_fetch_${resp.status}`);
  const arrayBuf = await resp.arrayBuffer();
  const fileHash = await sha256Hex(arrayBuf);
  const { data: cacheEntry } = await client.from('sw_models_cache').select('shapeways_model_id').eq('file_hash', fileHash).maybeSingle();
  if (cacheEntry) {
    try { console.log(JSON.stringify({ evt: 'order_model_cache_hit', file_hash: fileHash })); } catch {}
    return { fileHash, shapewaysModelId: cacheEntry.shapeways_model_id };
  }
  // Convert to base64 in chunks
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = ''; const bytes = new Uint8Array(buffer); const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  const fileName = modelUrl.split('/').pop()?.split('?')[0] || 'model.glb';
  const uploadResp = await fetchWithTimeout(`${SHAPEWAYS_API}/models/v1`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, file: arrayBufferToBase64(arrayBuf), hasRightsToModel: 1, acceptTermsAndConditions: 1, description: 'Uploaded via ShapeMint' })
  });
  const uploadJson = await uploadResp.json();
  if (!uploadResp.ok || uploadJson.result !== 'success') throw new Error('upload_failed');
  const shapewaysModelId = uploadJson.modelId?.toString();
  await client.from('sw_models_cache').insert({ file_hash: fileHash, shapeways_model_id: shapewaysModelId }).select().maybeSingle();
  return { fileHash, shapewaysModelId };
}

// Pricing stabilization logic aligned with quote function to avoid zero-price drift.
// Uses the same improved logic as the quote function for consistency.
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
      try { console.error(JSON.stringify({ evt: 'order_model_info_fetch_failed', status: resp.status, attempt })); } catch {}
      consecutiveValidPrices = 0; // Reset on error
    } else {
      const mat = json.materials?.[materialId];
      // Log material object for debugging
      try { console.log(JSON.stringify({ evt: 'order_model_material_entry', attempt, modelId, materialId, mat })); } catch {}
      if (!mat) {
        try { console.warn(JSON.stringify({ evt: 'order_material_not_found_in_response', attempt, modelId, materialId, availableMaterials: Object.keys(json.materials || {}) })); } catch {}
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
              try { console.log(JSON.stringify({ evt: 'order_price_stabilized', attempt, price, consecutiveValidPrices })); } catch {}
              return basePriceValue > 0 ? basePriceValue : price;
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
          try { console.log(JSON.stringify({ evt: 'order_invalid_price', attempt, price, basePrice: basePriceValue, hasBasePrice, isPrintable, isActive })); } catch {}
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
    
    try { console.log(JSON.stringify({ evt: 'order_checking_fallback_price', price, basePrice: basePriceValue, hasBasePrice, isPrintable, isActive, mat })); } catch {}
    
    // If we have a valid price in the last response, use it even if not stabilized
    // Accept if: price > 0 AND (flags OR hasBasePrice) OR basePrice > 0
    if (!isNaN(price) && (
      (price > 0 && (isPrintable || isActive || (hasBasePrice && basePriceValue > 0))) ||
      (basePriceValue > 0)
    )) {
      const finalPrice = basePriceValue > 0 ? basePriceValue : price;
      try { console.warn(JSON.stringify({ evt: 'order_using_unstabilized_price', price: finalPrice, isPrintable, isActive, hasBasePrice })); } catch {}
      return finalPrice;
    }
    
    // Check if model is still processing (price is 0 and not printable/active and no basePrice)
    if (price === 0 && basePriceValue === 0 && !isPrintable && !isActive) {
      try { console.error(JSON.stringify({ evt: 'order_model_still_processing', modelId, materialId, attempt: maxAttempts, totalWaitTimeSeconds: (maxAttempts * delayMs) / 1000 })); } catch {}
      throw new Error('model_still_processing: Shapeways is still processing this model. Large files can take 2-3 minutes to process. Please try again in a few minutes.');
    }
  }
  
  // Exhausted retries - log full material data for debugging
  const lastMat = lastJson?.materials?.[materialId];
  try { console.error(JSON.stringify({ 
    evt: 'order_model_info_poll_timeout', 
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
  })); } catch {}
  
  throw new Error('material_price_unavailable: Unable to get price for this material. The model may still be processing or the material may not be available for this model.');
}

async function getCheapestShipping(token: string, country: string, zip: string): Promise<{ price: number; optionId: string }> {
  const resp = await fetchWithTimeout(`${SHAPEWAYS_API}/cart/shipping-options/v1?country=${encodeURIComponent(country)}&zipCode=${encodeURIComponent(zip)}`, { headers: { 'Authorization': `Bearer ${token}` } });
  const json = await resp.json();
  if (!resp.ok || json.result !== 'success') throw new Error('shipping_options_failed');
  const options = json.shippingOptions || json.shipping_options || {};
  let cheapest: { price: number; optionId: string } | null = null;
  for (const key of Object.keys(options)) {
    const o = options[key]; const price = Number(o.price); if (isNaN(price)) continue;
    if (!cheapest || price < cheapest.price) cheapest = { price, optionId: key };
  }
  if (!cheapest) throw new Error('no_shipping_options');
  return cheapest;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ error: 'server_misconfigured' }), { status: 500, headers: corsHeaders });
  const client = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });

  let body: CreateOrderInput;
  try { body = validateInput(await req.json()); } catch (e) { return new Response(JSON.stringify({ error: 'validation_failed', message: (e as Error).message }), { status: 400, headers: corsHeaders }); }

  const { model, selections, quantity, shippingAddress, priorQuote } = body;
  const modelUrl = 'url' in model ? model.url : model.storagePath;

  let userId: string | undefined;
  try { const jwt = authHeader.replace('Bearer ',''); const payload = JSON.parse(atob(jwt.split('.')[1] || 'e30=')); userId = payload.sub; } catch {}
  if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

  try {
    const materialId = getShapewaysMaterialId(selections.baseMaterialId, selections.colorId, selections.finishId);
    if (!materialId) return new Response(JSON.stringify({ error: 'mapping_not_found' }), { status: 400, headers: corsHeaders });

    const token = await getAuthToken();
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'auth_token_obtained' })); } catch {}
    
  const { fileHash, shapewaysModelId } = await ensureModelUploaded(token, modelUrl, client);
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'model_uploaded', shapewaysModelId })); } catch {}
    
  const originalFileName = modelUrl.split('/').pop()?.split('?')[0] || 'model.glb';
    const materialPrice = await getModelMaterialPrice(token, shapewaysModelId, materialId);
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'material_price_obtained', materialPrice })); } catch {}
    
    const { price: shippingPrice, optionId } = await getCheapestShipping(token, shippingAddress.country || 'US', shippingAddress.zipCode);
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'shipping_obtained', shippingPrice, optionId })); } catch {}

    const US_MULTIPLIER = 1.029999743654534201978254580344162098224258337636275;
    let appliedMaterialPrice = materialPrice;
    if ((shippingAddress.country || 'US').toUpperCase() === 'US') appliedMaterialPrice = Number((materialPrice * US_MULTIPLIER).toFixed(6));
    const itemSubtotal = Number((appliedMaterialPrice * quantity).toFixed(2));
    const MIN_ORDER = 25.0;
    const surcharge = itemSubtotal < MIN_ORDER ? Number((MIN_ORDER - itemSubtotal).toFixed(2)) : 0;
    const totalPrice = Number((itemSubtotal + surcharge + shippingPrice).toFixed(2));

    if (priorQuote) {
      // Allow small tolerance for rounding differences (5 cents or 1% whichever is larger)
      // This prevents blocking orders due to minor price fluctuations or rounding
      const TOLERANCE_CENTS = 5; // 5 cents absolute tolerance
      const TOLERANCE_PERCENT = 0.01; // 1% relative tolerance
      
      const totalDiff = Math.abs(priorQuote.total - totalPrice);
      const itemDiff = Math.abs(priorQuote.itemTotal - itemSubtotal);
      const surchargeDiff = Math.abs(priorQuote.surcharge - surcharge);
      
      const totalTolerance = Math.max(TOLERANCE_CENTS / 100, priorQuote.total * TOLERANCE_PERCENT);
      const itemTolerance = Math.max(TOLERANCE_CENTS / 100, priorQuote.itemTotal * TOLERANCE_PERCENT);
      const surchargeTolerance = Math.max(TOLERANCE_CENTS / 100, (priorQuote.surcharge || 0) * TOLERANCE_PERCENT);
      
      const hasSignificantDrift = 
        totalDiff > totalTolerance || 
        itemDiff > itemTolerance || 
        surchargeDiff > surchargeTolerance;
      
      if (hasSignificantDrift) {
        try { console.log(JSON.stringify({ 
          evt: 'price_drift_detected', 
          priorQuote, 
          current: { itemSubtotal, surcharge, totalPrice }, 
          differences: { 
            total: totalDiff, 
            itemTotal: itemDiff, 
            surcharge: surchargeDiff 
          },
          tolerances: {
            total: totalTolerance,
            itemTotal: itemTolerance,
            surcharge: surchargeTolerance
          }
        })); } catch {}
        // Return 200 with error so frontend can parse it properly
        return new Response(JSON.stringify({ error: 'price_changed', message: 'Price changed significantly since quote. Please Get Quote again to confirm updated price.', current: { itemSubtotal, surcharge, totalPrice } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else if (totalDiff > 0 || itemDiff > 0 || surchargeDiff > 0) {
        // Log minor differences for monitoring but don't block
        try { console.log(JSON.stringify({ 
          evt: 'price_minor_drift_ignored', 
          priorQuote, 
          current: { itemSubtotal, surcharge, totalPrice }, 
          differences: { 
            total: totalDiff, 
            itemTotal: itemDiff, 
            surcharge: surchargeDiff 
          }
        })); } catch {}
      }
    }

    // Insert pending order
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'inserting_order', itemSubtotal, surcharge, shippingPrice, totalPrice })); } catch {}
  const { data: inserted, error: insErr } = await client.from('orders').insert({
      user_id: userId,
      vendor: 'shapeways',
      quote_id: body.quoteId || null,
      model_url: modelUrl,
  file_url: modelUrl, // legacy schema compatibility
  filename: originalFileName,
      file_hash: fileHash,
      shapeways_model_id: shapewaysModelId,
      material_id: materialId,
  // Populate legacy columns for backward compatibility (if they exist) to avoid NOT NULL violations
  customer_name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
  customer_email: shippingAddress.email,
      selections: selections,
      quantity,
      shipping_address: shippingAddress,
      shipping_zip: shippingAddress.zipCode,
      shipping_option_mode: 'Cheapest',
      shipping_option_id: optionId,
      item_subtotal: itemSubtotal,
      surcharge_amount: surcharge,
      shipping_price: shippingPrice,
      total_price: totalPrice,
      currency: 'USD',
      status: 'pending'
    }).select().maybeSingle();
  if (insErr) throw new Error(`db_insert_failed:${insErr.message}`);
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'order_inserted', orderId: inserted.id })); } catch {}
  try { await client.from('order_events').insert({ order_id: inserted.id, user_id: userId, evt_type: 'order_created', evt_data: { totalPrice, itemSubtotal, surcharge, shippingPrice } }); } catch {}

    // Call Shapeways create order endpoint
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'calling_shapeways_api' })); } catch {}
    // Minimal payload: modelId, materialId, quantity, address
    // Use shipping address for both shipping and billing (common case)
    const orderPayload: any = {
      // Required shipping address fields per Shapeways API docs
      firstName: shippingAddress.firstName,
      lastName: shippingAddress.lastName,
      country: shippingAddress.country,
      state: shippingAddress.state,
      city: shippingAddress.city,
      address1: shippingAddress.address1,
      zipCode: shippingAddress.zipCode,
      phoneNumber: shippingAddress.phone, // API expects phoneNumber
      // Order line items
      items: [
        { modelId: Number(shapewaysModelId), materialId: Number(materialId), quantity }
      ],
      // API expects a descriptor like "Cheapest" (docs) rather than internal option id; use descriptor
      shippingOption: 'Cheapest',
      paymentMethod: 'credit_card', // Required; using default credit card on file
      // Optional fields
      email: shippingAddress.email,
      // Try multiple billing address field formats (not documented but may be accepted)
      // Using same address as shipping - this might bypass the "default billing address" requirement
      // Try flat fields first (most common API pattern):
      billingFirstName: shippingAddress.firstName,
      billingLastName: shippingAddress.lastName,
      billingCountry: shippingAddress.country,
      billingState: shippingAddress.state,
      billingCity: shippingAddress.city,
      billingAddress1: shippingAddress.address1,
      billingZipCode: shippingAddress.zipCode,
      // Also try nested object format:
      billingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        country: shippingAddress.country,
        state: shippingAddress.state,
        city: shippingAddress.city,
        address1: shippingAddress.address1,
        zipCode: shippingAddress.zipCode
      }
    };
    try { console.log(JSON.stringify({ evt: 'order_shipping_choice', pickedOptionId: optionId, sendingDescriptor: 'Cheapest' })); } catch (err) { console.error('Failed to log order_shipping_choice event:', err); }

    const vendorResp = await fetchWithTimeout(`${SHAPEWAYS_API}/orders/v1`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
      timeoutMs: 15000
    });
    const vendorJson = await vendorResp.json();
    if (!vendorResp.ok || vendorJson.result !== 'success') {
      // Mark order failed and log payload for troubleshooting
      try { console.error(JSON.stringify({ evt: 'vendor_order_failed', status: vendorResp.status, vendorJson, orderPayload })); } catch {}
      await client.from('orders').update({ status: 'failed', last_vendor_status: vendorJson }).eq('id', inserted.id);
      
      // Provide user-friendly error messages for common issues
      let errorMessage = vendorJson.reason || vendorJson.message || 'Order creation failed';
      let errorCode = 'vendor_order_failed';
      
      // Check for specific error conditions
      if (vendorJson.reason && typeof vendorJson.reason === 'string') {
        const reasonLower = vendorJson.reason.toLowerCase();
        
        if (reasonLower.includes('billing address')) {
          // Extract username from error if present (e.g., "for user [matthew5]")
          const userMatch = vendorJson.reason.match(/user\s*\[([^\]]+)\]/i);
          const username = userMatch ? userMatch[1] : null;
          
          errorMessage = `A default billing address must be set up in your Shapeways account settings before placing orders. `;
          if (username) {
            errorMessage += `The API is using account "${username}". `;
          }
          errorMessage += `Please log in to shapeways.com with the account associated with your API credentials, go to Account Settings > Billing Address, and ensure you have a default billing address saved. If you already added one, make sure it's set as the default address.`;
          errorCode = 'billing_address_required';
        } else if (reasonLower.includes('stripe') || reasonLower.includes('stripe id')) {
          errorMessage = 'A payment method must be set up in your Shapeways account settings. Please log in to shapeways.com, go to Account Settings > Payment Methods, and add a credit card. The account needs to be connected to Stripe for payment processing.';
          errorCode = 'payment_method_required';
        } else if (reasonLower.includes('payment') || reasonLower.includes('credit card')) {
          errorMessage = 'A payment method must be set up in your Shapeways account settings. Please log in to shapeways.com and add a credit card in your account settings, then try again.';
          errorCode = 'payment_method_required';
        }
      }
      
      // Return 200 with error object so frontend can parse it properly
      return new Response(JSON.stringify({ 
        error: errorCode, 
        message: errorMessage,
        vendorStatus: vendorJson 
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const vendorOrderId = vendorJson.orderId?.toString();
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'shapeways_order_created', vendorOrderId })); } catch {}

  const { error: updErr } = await client.from('orders').update({
      vendor_order_id: vendorOrderId,
      vendor_order_raw: vendorJson,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    }).eq('id', inserted.id);
    if (updErr) throw new Error(`db_update_failed:${updErr.message}`);
  try { await client.from('order_events').insert({ order_id: inserted.id, user_id: userId, evt_type: 'order_submitted', evt_data: { vendorOrderId } }); } catch {}

    const responseData = {
      orderId: inserted.id,
      orderNumber: inserted.order_number,
      vendorOrderId,
      totalPrice,
      currency: 'USD',
      status: 'submitted'
    };
    try { console.log(JSON.stringify({ evt: 'order_step', step: 'returning_success', responseData })); } catch {}
    
    return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const err = e as Error;
    try { console.error(JSON.stringify({ evt: 'create_order_error', message: err.message, name: err.name, stack: err.stack })); } catch {}
    
    // Provide user-friendly error messages for common issues
    let errorMessage = err.message;
    let errorCode = 'order_creation_failed';
    
    if (err.name === 'AbortError' || err.message.includes('timeout') || err.message.includes('aborted')) {
      errorMessage = 'The order request timed out. This can happen if the model is still processing on Shapeways. Please wait a few minutes and try again, or get a fresh quote first.';
      errorCode = 'order_timeout';
    } else if (err.message.includes('model_still_processing')) {
      errorMessage = err.message; // Already user-friendly
      errorCode = 'model_processing';
    } else if (err.message.includes('material_price_unavailable')) {
      errorMessage = err.message; // Already user-friendly
      errorCode = 'price_unavailable';
    }
    
    return new Response(JSON.stringify({ error: errorCode, message: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
