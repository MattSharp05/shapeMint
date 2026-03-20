// deno-lint-ignore-file no-explicit-any
// Craftcloud Create Order edge function
// Flow: create cart → create order → get Stripe checkout URL → return
declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CRAFTCLOUD_API = 'https://api.craftcloud3d.com';

interface CreateOrderInput {
  craftcloudQuoteId: string;
  craftcloudShippingId: string;
  craftcloudPriceId: string;
  quantity: number;
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    address1: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  successUrl: string;
  cancelUrl: string;
  priorQuote?: {
    itemTotal: number;
    shippingTotal: number;
    total: number;
  };
  quoteId?: string; // Our internal quote ID for reference
  modelUrl?: string; // URL of the model file (STL/GLB)
}

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

function validateInput(body: any): CreateOrderInput {
  if (!body || typeof body !== 'object') throw new Error('invalid_payload');
  const { craftcloudQuoteId, craftcloudShippingId, craftcloudPriceId, quantity, shippingAddress, successUrl, cancelUrl } = body;
  if (!craftcloudQuoteId) throw new Error('missing_craftcloudQuoteId');
  if (!craftcloudPriceId) throw new Error('missing_craftcloudPriceId');
  if (!quantity || quantity <= 0 || quantity > 100) throw new Error('invalid_quantity');
  if (!successUrl || !cancelUrl) throw new Error('missing_redirect_urls');
  const sa = shippingAddress;
  const required = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zipCode', 'country', 'phone'];
  for (const f of required) if (!sa?.[f]) throw new Error(`missing_${f}`);
  return body as CreateOrderInput;
}

// Map US state codes to full names (Craftcloud may need this)
function getCountryCode(country: string): string {
  if (country === 'US' || country === 'USA' || country === 'United States') return 'US';
  return country;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'unauthorized', message: 'Missing Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'server_misconfigured' }),
      { status: 500, headers: corsHeaders }
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: CreateOrderInput;
  try {
    body = validateInput(await req.json());
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'validation_failed', message: (e as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Extract user ID from JWT (optional — allow anonymous users)
  let userId: string | null = null;
  try {
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1] || 'e30='));
    if (payload.sub) userId = payload.sub;
  } catch { /* ignore */ }

  const {
    craftcloudQuoteId,
    craftcloudShippingId,
    craftcloudPriceId,
    shippingAddress,
    successUrl,
    cancelUrl,
    priorQuote,
  } = body;

  try {
    // Step 1: Create cart
    // Note: don't include `types` — the base quote is the default.
    // `types` like ["economy"] or ["expedited"] are optional upgrades and
    // not all vendors support them. Omitting types uses the standard quote.
    const cartPayload: any = {
      quotes: [{ id: craftcloudQuoteId }],
      currency: 'USD',
    };
    // Only include shippingIds if we have one
    if (craftcloudShippingId) {
      cartPayload.shippingIds = [craftcloudShippingId];
    }

    console.log(JSON.stringify({ evt: 'cc_creating_cart', payload: cartPayload }));

    const cartResp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cartPayload),
      timeoutMs: 15000,
    });

    if (!cartResp.ok) {
      const errBody = await cartResp.text().catch(() => '');
      console.error(JSON.stringify({ evt: 'cc_cart_failed', status: cartResp.status, body: errBody, payload: cartPayload }));
      throw new Error(`Craftcloud cart creation failed (${cartResp.status}): ${errBody}`);
    }

    const cartData = await cartResp.json();
    const cartId = cartData?.cartId;
    if (!cartId) {
      console.error(JSON.stringify({ evt: 'cc_no_cartId', cartData }));
      throw new Error('Craftcloud cart did not return a cartId');
    }

    console.log(JSON.stringify({ evt: 'cc_cart_created', cartId }));

    // Extract pricing from cart response for verification
    const cartQuote = cartData?.quotes?.[0];
    const cartShipping = cartData?.shippings?.[0];
    const cartItemPrice = cartQuote?.price ?? 0;
    const cartShippingPrice = cartShipping?.price ?? 0;
    const cartTotal = Number((cartItemPrice + cartShippingPrice).toFixed(2));

    // Step 2: Create order
    const countryCode = getCountryCode(shippingAddress.country);

    const orderPayload = {
      cartId,
      user: {
        emailAddress: shippingAddress.email,
        shipping: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          address: shippingAddress.address1,
          city: shippingAddress.city,
          zipCode: shippingAddress.zipCode,
          countryCode,
          phoneNumber: shippingAddress.phone,
        },
        billing: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          address: shippingAddress.address1,
          city: shippingAddress.city,
          zipCode: shippingAddress.zipCode,
          isCompany: false,
          countryCode,
        },
      },
      appId: 'craftcloud',
    };

    console.log(JSON.stringify({ evt: 'cc_creating_order', cartId }));

    const orderResp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
      timeoutMs: 15000,
    });

    if (!orderResp.ok) {
      const errText = await orderResp.text().catch(() => '');
      console.error(JSON.stringify({ evt: 'cc_order_failed', status: orderResp.status, body: errText }));
      throw new Error(`Craftcloud order creation failed (${orderResp.status}): ${errText}`);
    }

    const orderData = await orderResp.json();
    const orderId = orderData?.orderId;
    const orderNumber = orderData?.orderNumber;

    if (!orderId) {
      console.error(JSON.stringify({ evt: 'cc_no_orderId', orderData }));
      throw new Error('Craftcloud order did not return an orderId');
    }

    console.log(JSON.stringify({ evt: 'cc_order_created', orderId, orderNumber }));

    // Step 3: Create ShapeMint Stripe checkout session (decoupled from CraftCloud)
    // Use the prior quote total (what the user saw) so the price matches exactly
    const priorTotal = body.priorQuote?.total;
    const customerTotal = priorTotal && priorTotal > 0 ? priorTotal : cartTotal;

    const stripeKey = Deno.env.get('STRIPE_TEST_SECRET_KEY') || Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const { default: Stripe } = await import('https://esm.sh/stripe@14.9.0?target=deno');
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const internalOrderId = crypto.randomUUID();

    console.log(JSON.stringify({ evt: 'sm_creating_stripe_session', orderId, craftcloudTotal: cartTotal, customerTotal }));

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '3D Printed Model',
              description: `ShapeMint 3D Print — Order #${orderNumber || orderId}`,
            },
            unit_amount: Math.round(customerTotal * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?order_id=${internalOrderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}?order_id=${internalOrderId}`,
      metadata: {
        order_id: internalOrderId,
        user_id: userId || '',
        payment_type: 'craftcloud_invoice',
        craftcloud_order_id: orderId,
        craftcloud_order_number: orderNumber || '',
        craftcloud_total: String(cartTotal),
      },
    });

    const stripeCheckoutUrl = stripeSession.url;
    if (!stripeCheckoutUrl) {
      throw new Error('Stripe session did not return a checkout URL');
    }

    console.log(JSON.stringify({ evt: 'sm_stripe_session_created', sessionId: stripeSession.id }));

    // Step 4: Insert order in our DB
    const { data: inserted, error: insErr } = await supabase
      .from('orders')
      .insert({
        id: internalOrderId,
        user_id: userId,
        vendor: 'craftcloud',
        file_url: body.modelUrl || 'unknown',
        quote_id: null,
        material_id: body.craftcloudQuoteId,
        selections: {
          craftcloudQuoteId,
          craftcloudShippingId,
          craftcloudPriceId,
          cartId,
        },
        quantity: body.quantity,
        shipping_address: shippingAddress,
        shipping_zip: shippingAddress.zipCode,
        item_subtotal: cartItemPrice,
        shipping_price: cartShippingPrice,
        total_price: customerTotal,
        currency: 'USD',
        status: 'pending_payment',
        vendor_order_id: orderId,
        stripe_session_id: stripeSession.id,
        customer_name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
        customer_email: shippingAddress.email,
        vendor_order_raw: {
          orderId,
          orderNumber,
          cartData,
          craftcloudTotal: cartTotal,
          customerTotal,
          paymentMethod: 'shapemint_stripe_to_craftcloud_invoice',
        },
      })
      .select()
      .maybeSingle();

    if (insErr) {
      console.error(JSON.stringify({ evt: 'cc_db_insert_error', error: insErr.message, code: insErr.code, details: insErr.details, hint: insErr.hint }));
      // DB insert failed — return error so user doesn't pay for an untracked order
      return new Response(
        JSON.stringify({
          error: 'db_insert_failed',
          message: `Order was created on Craftcloud but failed to save locally: ${insErr.message}. Please contact support with Craftcloud order ID: ${orderId}`,
          vendorOrderId: orderId,
          orderNumber,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      if (inserted) {
        await supabase.from('order_events').insert({
          order_id: inserted.id,
          user_id: userId,
          evt_type: 'order_created',
          evt_data: { vendor: 'craftcloud', orderId, orderNumber, cartTotal },
        });
      }
    } catch { /* ignore */ }

    // Step 5: Return response
    const response = {
      orderId: internalOrderId,
      orderNumber: inserted?.order_number || orderNumber || orderId,
      vendorOrderId: orderId,
      totalPrice: customerTotal,
      craftcloudTotal: cartTotal,
      currency: 'USD',
      status: 'pending_payment',
      stripeCheckoutUrl,
    };

    console.log(JSON.stringify({ evt: 'cc_order_success', orderId: response.orderId }));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const err = e as Error;
    console.error(JSON.stringify({ evt: 'cc_order_error', message: err.message, name: err.name }));

    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return new Response(
      JSON.stringify({
        error: isTimeout ? 'request_timeout' : 'order_failed',
        message: isTimeout
          ? 'The order request timed out. Please try again.'
          : err.message || 'Order creation failed',
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
