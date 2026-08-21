// deno-lint-ignore-file no-explicit-any
// Sculpteo Create Cart Order edge function (batch, N items from the cart).
//
// Each line item carries its own Sculpteo design uuid + product code because
// Sculpteo treats each design as a separate order. We bundle them into one
// Stripe checkout for the user's convenience, then on webhook success the
// submit-order path places each design with Sculpteo individually.
//
// Contract:
//   body.items: [{ cartItemId, modelId, sculpteoDesignUuid, sculpteoProductCode,
//                  sculpteoShippingCode?, quantity, itemPrice, shippingPrice, totalPrice }]
//   body.shippingAddress
//   body.successUrl / body.cancelUrl
declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.9.0?target=deno';

interface CartItem {
  cartItemId: string;
  modelId: string;
  sculpteoDesignUuid: string;
  sculpteoProductCode: string;
  sculpteoShippingCode?: string;
  quantity: number;
  itemPrice: number;
  shippingPrice: number;
  totalPrice: number;
}

function validate(body: any): {
  items: CartItem[];
  shippingAddress: any;
  successUrl: string;
  cancelUrl: string;
} {
  if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) throw new Error('items_required');
  for (const i of body.items) {
    if (!i.cartItemId || !i.sculpteoDesignUuid || !i.sculpteoProductCode) throw new Error('invalid_item');
    if (!i.quantity || i.quantity <= 0) throw new Error('invalid_quantity');
    if (!Number.isFinite(i.totalPrice) || i.totalPrice <= 0) throw new Error('invalid_item_total');
  }
  if (!body.successUrl || !body.cancelUrl) throw new Error('missing_redirect_urls');
  if (!body.shippingAddress?.firstName || !body.shippingAddress?.address1) throw new Error('incomplete_shipping_address');
  return { items: body.items, shippingAddress: body.shippingAddress, successUrl: body.successUrl, cancelUrl: body.cancelUrl };
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

    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const { data } = await supabase.auth.getUser(authHeader.slice(7));
      userId = data?.user?.id || null;
    }

    const subtotal = body.items.reduce((acc, i) => acc + (i.totalPrice * i.quantity), 0);

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
    const internalOrderId = crypto.randomUUID();

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: body.items.map(i => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `3D Print (Sculpteo · ${i.sculpteoProductCode})`,
            description: `Design ${i.sculpteoDesignUuid.slice(0, 8)}…`,
          },
          unit_amount: Math.round(i.totalPrice * 100),
        },
        quantity: i.quantity,
      })),
      mode: 'payment',
      success_url: `${body.successUrl}${body.successUrl.includes('?') ? '&' : '?'}order_id=${internalOrderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${body.cancelUrl}${body.cancelUrl.includes('?') ? '&' : '?'}order_id=${internalOrderId}`,
      metadata: {
        order_id: internalOrderId,
        user_id: userId || '',
        payment_type: 'sculpteo_cart',
        cart_item_ids: body.items.map(i => i.cartItemId).join(','),
        sculpteo_total: String(subtotal),
      },
    });

    if (!stripeSession.url) throw new Error('Stripe session did not return a checkout URL');

    // One DB row per cart entry (parity with how other batch flows write out
    // line-item orders). Makes tracking per-design Sculpteo submissions easier.
    const rows = body.items.map(i => ({
      user_id: userId,
      vendor: 'sculpteo',
      file_url: 'sculpteo_design_uuid:' + i.sculpteoDesignUuid,
      material_id: i.sculpteoProductCode,
      selections: {
        sculpteoDesignUuid: i.sculpteoDesignUuid,
        sculpteoProductCode: i.sculpteoProductCode,
        sculpteoShippingCode: i.sculpteoShippingCode,
        modelId: i.modelId,
        cartItemId: i.cartItemId,
        parent_cart_order_id: internalOrderId,
      },
      quantity: i.quantity,
      shipping_address: body.shippingAddress,
      shipping_zip: body.shippingAddress.zipCode,
      item_subtotal: i.itemPrice,
      shipping_price: i.shippingPrice,
      total_price: i.totalPrice * i.quantity,
      currency: 'USD',
      status: 'pending_payment',
      stripe_session_id: stripeSession.id,
      customer_name: `${body.shippingAddress.firstName} ${body.shippingAddress.lastName}`.trim(),
      customer_email: body.shippingAddress.email,
      vendor_order_raw: {
        provider: 'sculpteo',
        designUuid: i.sculpteoDesignUuid,
        productCode: i.sculpteoProductCode,
        shippingCode: i.sculpteoShippingCode,
        cartItemId: i.cartItemId,
        paymentMethod: 'shapemint_stripe_to_sculpteo_direct',
      },
    }));

    const { error: insErr } = await supabase.from('orders').insert(rows);
    if (insErr) console.error('❌ Failed to insert sculpteo cart orders:', insErr);

    return new Response(
      JSON.stringify({
        orderId: internalOrderId,
        orderNumber: internalOrderId.slice(0, 8).toUpperCase(),
        totalPrice: subtotal,
        currency: 'USD',
        status: 'pending_payment',
        stripeCheckoutUrl: stripeSession.url,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('❌ vendor-sculpteo-create-cart-order error:', err);
    return new Response(
      JSON.stringify({ error: 'sculpteo_cart_order_failed', message: err?.message || String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
