// deno-lint-ignore-file no-explicit-any
// Sculpteo Create Order edge function (single item).
//
// Flow:
//   1. Validate input (caller-provided prior quote + address + design uuid/product).
//   2. Create a ShapeMint Stripe checkout session for the quoted total.
//   3. Insert a pending order row with vendor='sculpteo' and the Sculpteo
//      design uuid / product / shipping handles in selections + vendor_order_raw.
//
// The actual submission to Sculpteo's order endpoint happens AFTER payment in
// a separate `vendor-sculpteo-submit-order` function, triggered by the
// Stripe webhook. Until the webhook is wired (see stripe-webhook/index.ts),
// Sculpteo orders will stay in 'pending_payment' → 'paid' status without being
// placed at Sculpteo. This matches how other vendors work and makes the pre-
// payment path safe to enable independently.
declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.9.0?target=deno';

interface CreateOrderInput {
  modelId: string;
  sculpteoDesignUuid: string;
  sculpteoProductCode: string;
  sculpteoShippingCode?: string;
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
    phone?: string;
  };
  priorQuote: { itemTotal: number; shippingTotal: number; total: number };
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

function validate(body: any): CreateOrderInput {
  if (!body || typeof body !== 'object') throw new Error('invalid_payload');
  const required = ['modelId', 'sculpteoDesignUuid', 'sculpteoProductCode', 'quantity', 'shippingAddress', 'priorQuote', 'successUrl', 'cancelUrl'];
  for (const k of required) if (!body[k]) throw new Error(`missing_${k}`);
  if (body.quantity <= 0 || body.quantity > 100) throw new Error('invalid_quantity');
  if (!body.shippingAddress.firstName || !body.shippingAddress.address1) throw new Error('incomplete_shipping_address');
  if (!Number.isFinite(body.priorQuote.total) || body.priorQuote.total <= 0) throw new Error('invalid_priorQuote_total');
  return body as CreateOrderInput;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!supabaseUrl || !supabaseServiceKey || !stripeKey) {
      return new Response(
        JSON.stringify({ error: 'missing_env', message: 'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY required.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = validate(await req.json());
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve user from bearer token (may be anon — handled below).
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      userId = data?.user?.id || null;
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });

    const internalOrderId = crypto.randomUUID();
    const customerTotal = body.priorQuote.total;
    const currency = (body.currency || 'USD').toLowerCase();

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: '3D Print Order (Sculpteo)',
            description: `ShapeMint 3D Print — Sculpteo ${body.sculpteoProductCode}`,
          },
          unit_amount: Math.round(customerTotal * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${body.successUrl}${body.successUrl.includes('?') ? '&' : '?'}order_id=${internalOrderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${body.cancelUrl}${body.cancelUrl.includes('?') ? '&' : '?'}order_id=${internalOrderId}`,
      metadata: {
        order_id: internalOrderId,
        user_id: userId || '',
        payment_type: 'sculpteo_direct',
        sculpteo_design_uuid: body.sculpteoDesignUuid,
        sculpteo_product_code: body.sculpteoProductCode,
        sculpteo_shipping_code: body.sculpteoShippingCode || '',
        sculpteo_total: String(customerTotal),
      },
    });

    if (!stripeSession.url) throw new Error('Stripe session did not return a checkout URL');

    const { error: insErr } = await supabase.from('orders').insert({
      id: internalOrderId,
      user_id: userId,
      vendor: 'sculpteo',
      file_url: 'sculpteo_design_uuid:' + body.sculpteoDesignUuid,
      quote_id: null,
      material_id: body.sculpteoProductCode,
      selections: {
        sculpteoDesignUuid: body.sculpteoDesignUuid,
        sculpteoProductCode: body.sculpteoProductCode,
        sculpteoShippingCode: body.sculpteoShippingCode,
        modelId: body.modelId,
      },
      quantity: body.quantity,
      shipping_address: body.shippingAddress,
      shipping_zip: body.shippingAddress.zipCode,
      item_subtotal: body.priorQuote.itemTotal,
      shipping_price: body.priorQuote.shippingTotal,
      total_price: customerTotal,
      currency: (body.currency || 'USD').toUpperCase(),
      status: 'pending_payment',
      stripe_session_id: stripeSession.id,
      customer_name: `${body.shippingAddress.firstName} ${body.shippingAddress.lastName}`.trim(),
      customer_email: body.shippingAddress.email,
      vendor_order_raw: {
        provider: 'sculpteo',
        designUuid: body.sculpteoDesignUuid,
        productCode: body.sculpteoProductCode,
        shippingCode: body.sculpteoShippingCode,
        priorQuote: body.priorQuote,
        paymentMethod: 'shapemint_stripe_to_sculpteo_direct',
        // TODO: stripe-webhook must detect payment_type='sculpteo_direct' and
        // invoke vendor-sculpteo-submit-order to actually place the order.
      },
    });

    if (insErr) {
      console.error('❌ Failed to insert sculpteo order row:', insErr);
      // Stripe session still exists — user can still pay; we just won't have
      // a pre-created orders row. Webhook-path recovery would be needed.
    }

    return new Response(
      JSON.stringify({
        orderId: internalOrderId,
        orderNumber: internalOrderId.slice(0, 8).toUpperCase(),
        totalPrice: customerTotal,
        currency: (body.currency || 'USD').toUpperCase(),
        status: 'pending_payment',
        stripeCheckoutUrl: stripeSession.url,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('❌ vendor-sculpteo-create-order error:', err);
    return new Response(
      JSON.stringify({ error: 'sculpteo_create_order_failed', message: err?.message || String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
