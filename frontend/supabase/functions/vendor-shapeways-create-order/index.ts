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
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getShapewaysMaterialId } from '../_shared/material-mapping.ts';
const SHAPEWAYS_API = 'https://api.shapeways.com';
async function fetchWithTimeout(resource, options = {}) {
  const { timeoutMs = 10000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeoutMs);
  try {
    return await fetch(resource, {
      ...rest,
      signal: controller.signal
    });
  } finally{
    clearTimeout(timer);
  }
}
async function getAuthToken() {
  const resp = await fetchWithTimeout(`${SHAPEWAYS_API}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
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
function validateInput(body) {
  if (!body || typeof body !== 'object') throw new Error('invalid_payload');
  const { model, selections, quantity, shippingAddress } = body;
  if (!model || typeof model !== 'object' || !('url' in model) && !('storagePath' in model)) throw new Error('invalid_model');
  if (!selections?.baseMaterialId) throw new Error('missing_baseMaterialId');
  if (!quantity || quantity <= 0 || quantity > 100) throw new Error('invalid_quantity');
  const sa = shippingAddress;
  const required = [
    'firstName',
    'lastName',
    'email',
    'address1',
    'city',
    'state',
    'zipCode',
    'country',
    'phone'
  ];
  for (const f of required)if (!sa?.[f]) throw new Error(`missing_${f}`);
  return body;
}
async function sha256Hex(buf) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b)=>b.toString(16).padStart(2, '0')).join('');
}
async function ensureModelUploaded(token, modelUrl, client) {
  const resp = await fetchWithTimeout(modelUrl, {
    timeoutMs: 10000
  });
  if (!resp.ok) throw new Error(`model_fetch_${resp.status}`);
  const arrayBuf = await resp.arrayBuffer();
  const fileHash = await sha256Hex(arrayBuf);
  const { data: cacheEntry } = await client.from('sw_models_cache').select('shapeways_model_id').eq('file_hash', fileHash).maybeSingle();
  if (cacheEntry) {
    try {
      console.log(JSON.stringify({
        evt: 'order_model_cache_hit',
        file_hash: fileHash
      }));
    } catch  {}
    return {
      fileHash,
      shapewaysModelId: cacheEntry.shapeways_model_id
    };
  }
  // Convert to base64 in chunks
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for(let i = 0; i < bytes.length; i += chunkSize){
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  const fileName = modelUrl.split('/').pop()?.split('?')[0] || 'model.glb';
  const uploadResp = await fetchWithTimeout(`${SHAPEWAYS_API}/models/v1`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileName,
      file: arrayBufferToBase64(arrayBuf),
      hasRightsToModel: 1,
      acceptTermsAndConditions: 1,
      description: 'Uploaded via ShapeMint'
    })
  });
  const uploadJson = await uploadResp.json();
  if (!uploadResp.ok || uploadJson.result !== 'success') throw new Error('upload_failed');
  const shapewaysModelId = uploadJson.modelId?.toString();
  await client.from('sw_models_cache').insert({
    file_hash: fileHash,
    shapeways_model_id: shapewaysModelId
  }).select().maybeSingle();
  return {
    fileHash,
    shapewaysModelId
  };
}
// Pricing stabilization logic aligned with quote function to avoid zero-price drift.
// Requires two consecutive identical non-zero prices (or zero only when explicitly printable)
// before accepting, reducing mismatches between quote and order phases.
async function getModelMaterialPrice(token, modelId, materialId) {
  const maxAttempts = 20;
  const delayMs = 2500;
  let lastSeenPrice = null;
  let lastJson = null;
  for(let attempt = 1; attempt <= maxAttempts; attempt++){
    const resp = await fetchWithTimeout(`${SHAPEWAYS_API}/models/${modelId}/v1`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const json = await resp.json();
    lastJson = json;
    if (!resp.ok || json.result !== 'success') {
      try {
        console.error(JSON.stringify({
          evt: 'order_model_info_fetch_failed',
          status: resp.status,
          attempt
        }));
      } catch  {}
    } else {
      const mat = json.materials?.[materialId];
      if (!mat) throw new Error('material_not_found');
      const rawPrice = mat.basePrice ?? mat.base_price ?? mat.price ?? mat.base_price;
      const price = Number(rawPrice);
      const isPrintable = Boolean(mat.isPrintable || mat.is_printable || json.printable === 'true' || json.printable === true || json.printable === 'printable');
      // Only consider price if > 0, or accept 0 explicitly when printable.
      if (!isNaN(price) && (price > 0 || isPrintable && price >= 0)) {
        if (lastSeenPrice !== null && Math.abs(lastSeenPrice - price) < 0.000001) {
          try {
            console.log(JSON.stringify({
              evt: 'order_price_stabilized',
              modelId,
              materialId,
              price,
              attempt
            }));
          } catch  {}
          return price;
        }
        lastSeenPrice = price;
      }
      try {
        console.log(JSON.stringify({
          evt: 'order_price_poll',
          attempt,
          modelId,
          materialId,
          price,
          isPrintable
        }));
      } catch  {}
    }
    if (attempt < maxAttempts) await new Promise((r)=>setTimeout(r, delayMs));
  }
  try {
    console.error(JSON.stringify({
      evt: 'order_model_info_poll_timeout',
      modelId,
      materialId,
      lastJson
    }));
  } catch  {}
  throw new Error('material_price_unavailable');
}
async function getCheapestShipping(token, country, zip) {
  const resp = await fetchWithTimeout(`${SHAPEWAYS_API}/cart/shipping-options/v1?country=${encodeURIComponent(country)}&zipCode=${encodeURIComponent(zip)}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const json = await resp.json();
  if (!resp.ok || json.result !== 'success') throw new Error('shipping_options_failed');
  const options = json.shippingOptions || json.shipping_options || {};
  let cheapest = null;
  for (const key of Object.keys(options)){
    const o = options[key];
    const price = Number(o.price);
    if (isNaN(price)) continue;
    if (!cheapest || price < cheapest.price) cheapest = {
      price,
      optionId: key
    };
  }
  if (!cheapest) throw new Error('no_shipping_options');
  return cheapest;
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: corsHeaders
  });
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({
    error: 'unauthorized'
  }), {
    status: 401,
    headers: corsHeaders
  });
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({
    error: 'server_misconfigured'
  }), {
    status: 500,
    headers: corsHeaders
  });
  const client = createClient(supabaseUrl, serviceKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
  let body;
  try {
    body = validateInput(await req.json());
  } catch (e) {
    return new Response(JSON.stringify({
      error: 'validation_failed',
      message: e.message
    }), {
      status: 400,
      headers: corsHeaders
    });
  }
  const { model, selections, quantity, shippingAddress, priorQuote } = body;
  const modelUrl = 'url' in model ? model.url : model.storagePath;
  let userId;
  try {
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1] || 'e30='));
    userId = payload.sub;
  } catch  {}
  if (!userId) return new Response(JSON.stringify({
    error: 'unauthorized'
  }), {
    status: 401,
    headers: corsHeaders
  });
  try {
    const materialId = getShapewaysMaterialId(selections.baseMaterialId, selections.colorId, selections.finishId);
    if (!materialId) return new Response(JSON.stringify({
      error: 'mapping_not_found'
    }), {
      status: 400,
      headers: corsHeaders
    });
    const token = await getAuthToken();
    const { fileHash, shapewaysModelId } = await ensureModelUploaded(token, modelUrl, client);
    const originalFileName = modelUrl.split('/').pop()?.split('?')[0] || 'model.glb';
    const materialPrice = await getModelMaterialPrice(token, shapewaysModelId, materialId);
    const { price: shippingPrice, optionId } = await getCheapestShipping(token, shippingAddress.country || 'US', shippingAddress.zipCode);
    const US_MULTIPLIER = 1.029999743654534201978254580344162098224258337636275;
    let appliedMaterialPrice = materialPrice;
    if ((shippingAddress.country || 'US').toUpperCase() === 'US') appliedMaterialPrice = Number((materialPrice * US_MULTIPLIER).toFixed(6));
    const itemSubtotal = Number((appliedMaterialPrice * quantity).toFixed(2));
    const MIN_ORDER = 25.0;
    const surcharge = itemSubtotal < MIN_ORDER ? Number((MIN_ORDER - itemSubtotal).toFixed(2)) : 0;
    const totalPrice = Number((itemSubtotal + surcharge + shippingPrice).toFixed(2));
    if (priorQuote) {
      const drift = priorQuote.total !== totalPrice || priorQuote.itemTotal !== itemSubtotal || priorQuote.surcharge !== surcharge;
      if (drift) {
        return new Response(JSON.stringify({
          error: 'price_changed',
          message: 'Price changed since quote. Please confirm new price.',
          current: {
            itemSubtotal,
            surcharge,
            totalPrice
          }
        }), {
          status: 409,
          headers: corsHeaders
        });
      }
    }
    // Insert pending order
    const { data: inserted, error: insErr } = await client.from('orders').insert({
      user_id: userId,
      vendor: 'shapeways',
      quote_id: body.quoteId || null,
      model_url: modelUrl,
      file_url: modelUrl,
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
    try {
      await client.from('order_events').insert({
        order_id: inserted.id,
        user_id: userId,
        evt_type: 'order_created',
        evt_data: {
          totalPrice,
          itemSubtotal,
          surcharge,
          shippingPrice
        }
      });
    } catch  {}
    // Call Shapeways create order endpoint
    // Minimal payload: modelId, materialId, quantity, address
    const orderPayload = {
      // Required address + contact fields per Shapeways API docs
      firstName: shippingAddress.firstName,
      lastName: shippingAddress.lastName,
      country: shippingAddress.country,
      state: shippingAddress.state,
      city: shippingAddress.city,
      address1: shippingAddress.address1,
      zipCode: shippingAddress.zipCode,
      phoneNumber: shippingAddress.phone,
      // Order line items
      items: [
        {
          modelId: Number(shapewaysModelId),
          materialId: Number(materialId),
          quantity
        }
      ],
      shippingOption: optionId,
      paymentMethod: 'credit_card',
      // Optional fields
      email: shippingAddress.email
    };
    const vendorResp = await fetchWithTimeout(`${SHAPEWAYS_API}/orders/v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload),
      timeoutMs: 15000
    });
    const vendorJson = await vendorResp.json();
    if (!vendorResp.ok || vendorJson.result !== 'success') {
      // Mark order failed and log payload for troubleshooting
      try {
        console.error(JSON.stringify({
          evt: 'vendor_order_failed',
          status: vendorResp.status,
          vendorJson,
          orderPayload
        }));
      } catch  {}
      await client.from('orders').update({
        status: 'failed',
        last_vendor_status: vendorJson
      }).eq('id', inserted.id);
      return new Response(JSON.stringify({
        error: 'vendor_order_failed',
        vendorStatus: vendorJson
      }), {
        status: 502,
        headers: corsHeaders
      });
    }
    const vendorOrderId = vendorJson.orderId?.toString();
    const { error: updErr } = await client.from('orders').update({
      vendor_order_id: vendorOrderId,
      vendor_order_raw: vendorJson,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    }).eq('id', inserted.id);
    if (updErr) throw new Error(`db_update_failed:${updErr.message}`);
    try {
      await client.from('order_events').insert({
        order_id: inserted.id,
        user_id: userId,
        evt_type: 'order_submitted',
        evt_data: {
          vendorOrderId
        }
      });
    } catch  {}
    return new Response(JSON.stringify({
      orderId: inserted.id,
      orderNumber: inserted.order_number,
      vendorOrderId,
      totalPrice,
      currency: 'USD',
      status: 'submitted'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (e) {
    const err = e;
    try {
      console.error(JSON.stringify({
        evt: 'create_order_error',
        message: err.message,
        name: err.name
      }));
    } catch  {}
    return new Response(JSON.stringify({
      error: 'order_creation_failed',
      message: err.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});