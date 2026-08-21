// deno-lint-ignore-file no-explicit-any
// Sculpteo Submit Order edge function.
//
// Called AFTER Stripe payment clears to actually place the order with Sculpteo.
// Intended caller is `stripe-webhook` on `checkout.session.completed` events
// with metadata.payment_type in ('sculpteo_direct', 'sculpteo_cart'). Can also
// be invoked manually (e.g. from order-success page) as a fallback.
//
// Contract:
//   body.internalOrderId: string  — our orders.id for the pending row.
//
// For 'sculpteo_cart' orders the caller should invoke this function once per
// row (they all share a parent_cart_order_id in selections).
//
// Env:
//   SCULPTEO_ENABLED  — must be 'true' to actually submit to Sculpteo.
//                       When false, marks the DB row as 'submission_deferred'.
//   SCULPTEO_API_KEY  — credentials for Sculpteo's authenticated order endpoint.
//                       Without this, submission will fail and the row stays
//                       as 'paid' with status=submission_deferred for a later
//                       manual retry.
declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 20000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'missing_env' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const internalOrderId: string = body?.internalOrderId;
    if (!internalOrderId) throw new Error('missing_internalOrderId');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', internalOrderId)
      .single();
    if (fetchErr || !order) throw new Error('order_not_found');
    if (order.vendor !== 'sculpteo') throw new Error('not_a_sculpteo_order');

    const sel = order.selections || {};
    const designUuid = sel.sculpteoDesignUuid;
    const productCode = sel.sculpteoProductCode;
    const shippingCode = sel.sculpteoShippingCode;
    if (!designUuid || !productCode) throw new Error('order_missing_sculpteo_metadata');

    const enabled = (Deno.env.get('SCULPTEO_ENABLED') || '').toLowerCase() === 'true';
    const apiKey = Deno.env.get('SCULPTEO_API_KEY');
    const apiBase = Deno.env.get('SCULPTEO_API_BASE') || 'https://www.sculpteo.com';

    if (!enabled || !apiKey) {
      // Flag the row so ops can retry manually once creds are in place.
      await supabase
        .from('orders')
        .update({
          status: 'submission_deferred',
          vendor_order_raw: {
            ...(order.vendor_order_raw || {}),
            submission_deferred_reason: !enabled ? 'SCULPTEO_ENABLED=false' : 'missing SCULPTEO_API_KEY',
            submission_deferred_at: new Date().toISOString(),
          },
        })
        .eq('id', internalOrderId);
      return new Response(
        JSON.stringify({ ok: false, status: 'submission_deferred', message: 'Sculpteo submission not enabled / missing credentials.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Sculpteo's order endpoint. Exact path + payload may need tuning once we
    // have live API responses to observe. Best-effort call with graceful
    // failure so the DB row captures whatever Sculpteo returned.
    const payload = {
      design_uuid: designUuid,
      product: productCode,
      shipping: shippingCode || undefined,
      quantity: order.quantity,
      shipping_address: {
        first_name: order.shipping_address?.firstName,
        last_name: order.shipping_address?.lastName,
        email: order.shipping_address?.email,
        phone: order.shipping_address?.phone,
        line1: order.shipping_address?.address1,
        city: order.shipping_address?.city,
        region: order.shipping_address?.state,
        postal_code: order.shipping_address?.zipCode,
        country: order.shipping_address?.country,
      },
    };

    const orderUrl = `${apiBase}/api/order/`;
    const resp = await fetchWithTimeout(orderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Token ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    const respText = await resp.text();
    let respJson: any = null;
    try { respJson = JSON.parse(respText); } catch { /* keep raw text */ }

    if (!resp.ok) {
      await supabase
        .from('orders')
        .update({
          status: 'submission_failed',
          vendor_order_raw: {
            ...(order.vendor_order_raw || {}),
            sculpteo_submission_error: { status: resp.status, body: respText.slice(0, 2000) },
            sculpteo_submission_attempted_at: new Date().toISOString(),
          },
        })
        .eq('id', internalOrderId);
      return new Response(
        JSON.stringify({ ok: false, error: 'sculpteo_submission_failed', status: resp.status, detail: respText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const sculpteoOrderId = respJson?.order_id || respJson?.id || respJson?.uuid || null;

    await supabase
      .from('orders')
      .update({
        status: 'submitted',
        sculpteo_order_id: sculpteoOrderId,
        sculpteo_response: respJson || { raw: respText.slice(0, 4000) },
        vendor_order_id: sculpteoOrderId,
        vendor_order_raw: {
          ...(order.vendor_order_raw || {}),
          sculpteo_submission_succeeded_at: new Date().toISOString(),
        },
      })
      .eq('id', internalOrderId);

    return new Response(
      JSON.stringify({ ok: true, sculpteoOrderId, response: respJson }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('❌ vendor-sculpteo-submit-order error:', err);
    return new Response(
      JSON.stringify({ error: 'sculpteo_submit_failed', message: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
