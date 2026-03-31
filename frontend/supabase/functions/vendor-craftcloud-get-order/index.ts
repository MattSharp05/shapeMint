// deno-lint-ignore-file no-explicit-any
declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const CRAFTCLOUD_API = 'https://api.craftcloud3d.com';

async function fetchWithTimeout(
  resource: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 10000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const STATUS_MAP: Record<string, string> = {
  ordered: 'submitted',
  in_production: 'in_production',
  shipped: 'shipped',
  received: 'delivered',
  blocked: 'failed',
  cancelled: 'cancelled',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: 'server_misconfigured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Look up the order in our DB to get the vendor_order_id
    const { data: order, error: dbErr } = await supabase
      .from('orders')
      .select('id, vendor_order_id, status')
      .eq('id', orderId)
      .eq('vendor', 'craftcloud')
      .single();

    if (dbErr || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found', details: dbErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const vendorOrderId = order.vendor_order_id;
    if (!vendorOrderId) {
      return new Response(
        JSON.stringify({ error: 'No vendor order ID stored for this order' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Call CraftCloud status endpoint
    const statusResp = await fetchWithTimeout(
      `${CRAFTCLOUD_API}/v5/order/${vendorOrderId}/status`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeoutMs: 10000,
      },
    );

    if (!statusResp.ok) {
      const errBody = await statusResp.text().catch(() => '');
      console.error(JSON.stringify({ evt: 'cc_status_failed', status: statusResp.status, body: errBody }));
      return new Response(
        JSON.stringify({ error: 'Failed to fetch status from CraftCloud', httpStatus: statusResp.status }),
        { status: statusResp.status === 404 ? 404 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const vendorStatus = await statusResp.json();
    console.log(JSON.stringify({ evt: 'cc_status_received', orderId, vendorStatus }));

    // Determine the latest status from the vendor response
    // CraftCloud returns status events — pick the most advanced one
    let latestStatus = 'submitted';
    let trackingNumber: string | null = null;
    let trackingUrl: string | null = null;

    if (Array.isArray(vendorStatus)) {
      // Array of vendor part statuses
      for (const part of vendorStatus) {
        const mapped = STATUS_MAP[part.status] || part.status;
        if (mapped) latestStatus = mapped;
        if (part.trackingNumber) trackingNumber = part.trackingNumber;
        if (part.trackingUrl) trackingUrl = part.trackingUrl;
      }
    } else if (vendorStatus?.status) {
      latestStatus = STATUS_MAP[vendorStatus.status] || vendorStatus.status;
      trackingNumber = vendorStatus.trackingNumber || null;
      trackingUrl = vendorStatus.trackingUrl || null;
    }

    // Update our DB with the latest status
    const updates: any = {
      last_vendor_status: vendorStatus,
      updated_at: new Date().toISOString(),
    };

    // Only advance status forward, don't regress
    const statusOrder = ['pending', 'pending_payment', 'submitted', 'in_production', 'shipped', 'delivered'];
    const currentIdx = statusOrder.indexOf(order.status);
    const newIdx = statusOrder.indexOf(latestStatus);
    if (newIdx > currentIdx) {
      updates.status = latestStatus;
      if (latestStatus === 'shipped') updates.shipped_at = new Date().toISOString();
      if (latestStatus === 'delivered') updates.delivered_at = new Date().toISOString();
    }
    // Handle terminal states (failed/cancelled) regardless
    if (latestStatus === 'failed' || latestStatus === 'cancelled') {
      updates.status = latestStatus;
      if (latestStatus === 'cancelled') updates.cancelled_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (updateErr) {
      console.error(JSON.stringify({ evt: 'cc_status_update_failed', orderId, error: updateErr.message }));
    }

    return new Response(
      JSON.stringify({
        orderId,
        status: updates.status || order.status,
        trackingNumber,
        trackingUrl,
        vendorStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('Error fetching CraftCloud order status:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
