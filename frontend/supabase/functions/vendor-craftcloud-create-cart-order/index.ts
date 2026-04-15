// deno-lint-ignore-file no-explicit-any
// Craftcloud Multi-Item Cart Order edge function
//
// Variant of vendor-craftcloud-create-order that accepts N line items from
// the user's ShapeMint cart and creates a single CraftCloud order with
// multiple quotes in one cart. One Stripe checkout covers all items.
//
// Contract:
//   body.items: [
//     { craftcloudQuoteId, craftcloudShippingId?, craftcloudPriceId, quantity, modelUrl? }
//   ]
//   body.shippingAddress: { firstName, lastName, email, address1, city, state, zipCode, country, phone }
//   body.successUrl / body.cancelUrl
//
// The webhook (stripe-webhook) is responsible for invoicing CraftCloud and
// clearing the user's cart on successful payment (using metadata.cart_item_ids).

declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.9.0?target=deno';

const CRAFTCLOUD_API = 'https://api.craftcloud3d.com';

interface CartItem {
  craftcloudQuoteId: string;
  craftcloudShippingId?: string;
  craftcloudPriceId: string;
  quantity: number;
  modelUrl?: string;
  cartItemId?: string; // our cart_items.id — used to clear on success
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

interface CreateCartOrderInput {
  items: CartItem[];
  shippingAddress: ShippingAddress;
  successUrl: string;
  cancelUrl: string;
}

async function fetchWithTimeout(
  resource: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 20000, ...rest } = options;
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

function validateInput(body: any): CreateCartOrderInput {
  if (!body || typeof body !== 'object') throw new Error('invalid_payload');
  const { items, shippingAddress, successUrl, cancelUrl } = body;
  if (!Array.isArray(items) || items.length === 0) throw new Error('items_required');
  for (const i of items) {
    if (!i?.craftcloudQuoteId) throw new Error('missing_craftcloudQuoteId');
    if (!i?.quantity || i.quantity <= 0 || i.quantity > 100) throw new Error('invalid_quantity');
  }
  if (!successUrl || !cancelUrl) throw new Error('missing_redirect_urls');
  const sa = shippingAddress;
  // Phone is optional — CraftCloud accepts orders without one, and we'd rather
  // ship than block a checkout on a field customers forget.
  const required = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zipCode', 'country'];
  for (const f of required) if (!sa?.[f]) throw new Error(`missing_${f}`);
  return body as CreateCartOrderInput;
}

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

  // Anonymous users can't place orders.
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const payloadPart = token.split('.')[1] || '';
    if (payloadPart) {
      const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
      if (claims?.is_anonymous === true) {
        return new Response(
          JSON.stringify({ error: 'account_required', message: 'Sign in or create an account to place an order.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch { /* fall through */ }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'server_misconfigured' }),
      { status: 500, headers: corsHeaders }
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: CreateCartOrderInput;
  try {
    body = validateInput(await req.json());
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'validation_failed', message: (e as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let userId: string | null = null;
  try {
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1] || 'e30='));
    if (payload.sub) userId = payload.sub;
  } catch { /* ignore */ }

  const { items, shippingAddress, successUrl, cancelUrl } = body;

  try {
    // Step 1: Create CraftCloud cart with N quotes.
    const cartPayload: any = {
      quotes: items.map(i => ({ id: i.craftcloudQuoteId })),
      currency: 'USD',
      note: 'Please do not include a printed receipt or invoice in the package. This is a gift fulfillment order.',
    };
    const shippingIds = items.map(i => i.craftcloudShippingId).filter(Boolean);
    if (shippingIds.length > 0) {
      cartPayload.shippingIds = shippingIds;
    }

    console.log(JSON.stringify({ evt: 'cc_creating_multi_cart', quoteCount: items.length }));

    const cartResp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cartPayload),
      timeoutMs: 20000,
    });

    if (!cartResp.ok) {
      const errBody = await cartResp.text().catch(() => '');
      console.error(JSON.stringify({ evt: 'cc_cart_failed', status: cartResp.status, body: errBody, payload: cartPayload }));
      throw new Error(`Craftcloud cart creation failed (${cartResp.status}): ${errBody}`);
    }

    const cartData = await cartResp.json();
    const cartId = cartData?.cartId;
    if (!cartId) throw new Error('Craftcloud cart did not return a cartId');

    const cartQuotes = cartData?.quotes || [];
    const cartShippings = cartData?.shippings || [];
    const itemSubtotal = cartQuotes.reduce((s: number, q: any) => s + (q?.price || 0), 0);
    const shippingSubtotal = cartShippings.reduce((s: number, sh: any) => s + (sh?.price || 0), 0);
    const cartTotal = Number((itemSubtotal + shippingSubtotal).toFixed(2));

    console.log(JSON.stringify({ evt: 'cc_multi_cart_created', cartId, cartTotal, itemSubtotal, shippingSubtotal }));

    // Step 2: Create order.
    const countryCode = getCountryCode(shippingAddress.country);
    const phone = (shippingAddress.phone || '').trim();
    const orderPayload = {
      cartId,
      user: {
        emailAddress: 'matthew@gogentic.ai',  // internal CraftCloud comms
        shipping: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          address: shippingAddress.address1,
          city: shippingAddress.city,
          zipCode: shippingAddress.zipCode,
          countryCode,
          ...(phone ? { phoneNumber: phone } : {}),
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

    const orderResp = await fetchWithTimeout(`${CRAFTCLOUD_API}/v5/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
      timeoutMs: 20000,
    });

    if (!orderResp.ok) {
      const errText = await orderResp.text().catch(() => '');
      console.error(JSON.stringify({ evt: 'cc_multi_order_failed', status: orderResp.status, body: errText }));
      throw new Error(`Craftcloud order creation failed (${orderResp.status}): ${errText}`);
    }

    const orderData = await orderResp.json();
    const orderId = orderData?.orderId;
    const orderNumber = orderData?.orderNumber;
    if (!orderId) throw new Error('Craftcloud order did not return an orderId');

    console.log(JSON.stringify({ evt: 'cc_multi_order_created', orderId, orderNumber }));

    // Step 3: Create Stripe session.
    const customerTotal = cartTotal;
    const internalOrderId = crypto.randomUUID();

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('Missing STRIPE_SECRET_KEY');

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `ShapeMint 3D Print Order (${items.length} ${items.length === 1 ? 'item' : 'items'})`,
              description: `Order ${orderNumber || orderId}`,
            },
            unit_amount: Math.round(customerTotal * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}order_id=${internalOrderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}order_id=${internalOrderId}`,
      metadata: {
        order_id: internalOrderId,
        user_id: userId || '',
        payment_type: 'craftcloud_invoice',
        craftcloud_order_id: orderId,
        craftcloud_order_number: orderNumber || '',
        craftcloud_cart_id: cartId,
        craftcloud_total: String(cartTotal),
        // Pipe-separated IDs so the stripe-webhook can delete them on success.
        cart_item_ids: (items.map(i => i.cartItemId).filter(Boolean) as string[]).join('|'),
        is_cart_order: 'true',
      },
    });

    const stripeCheckoutUrl = stripeSession.url;
    if (!stripeCheckoutUrl) throw new Error('Stripe session did not return a checkout URL');

    // Step 4: Insert order row.
    const { error: insErr } = await supabase
      .from('orders')
      .insert({
        id: internalOrderId,
        user_id: userId,
        vendor: 'craftcloud',
        file_url: items[0]?.modelUrl || 'cart_order',
        quote_id: null,
        material_id: null,
        selections: {
          cartId,
          items,
        },
        quantity: items.reduce((s, i) => s + i.quantity, 0),
        shipping_address: shippingAddress,
        shipping_zip: shippingAddress.zipCode,
        item_subtotal: itemSubtotal,
        shipping_price: shippingSubtotal,
        total_price: customerTotal,
        currency: 'USD',
        status: 'pending_payment',
        stripe_session_id: stripeSession.id,
        vendor_order_id: orderId,
        customer_name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim(),
        customer_email: shippingAddress.email,
        vendor_order_raw: {
          orderId,
          orderNumber,
          cartData,
          craftcloudTotal: cartTotal,
          paymentMethod: 'shapemint_stripe_to_craftcloud_invoice',
          isCartOrder: true,
        },
      });

    if (insErr) {
      console.error(JSON.stringify({ evt: 'cc_multi_db_insert_error', error: insErr.message }));
    }

    return new Response(JSON.stringify({
      orderId: internalOrderId,
      orderNumber: orderNumber || orderId,
      vendorOrderId: orderId,
      totalPrice: customerTotal,
      craftcloudTotal: cartTotal,
      currency: 'USD',
      status: 'pending_payment',
      stripeCheckoutUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const err = e as Error;
    console.error(JSON.stringify({ evt: 'cc_multi_order_error', message: err.message }));
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return new Response(
      JSON.stringify({
        error: isTimeout ? 'request_timeout' : 'order_failed',
        message: isTimeout ? 'The order request timed out. Please try again.' : err.message || 'Order creation failed',
      }),
      { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
