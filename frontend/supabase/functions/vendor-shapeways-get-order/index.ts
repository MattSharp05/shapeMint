// deno-lint-ignore-file no-explicit-any
// Retrieves latest Shapeways order status and updates local order row
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SHAPEWAYS_API = 'https://api.shapeways.com';

async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(resource, { ...rest, signal: controller.signal }); } finally { clearTimeout(timer); }
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

  let orderId: string | undefined;
  if (req.method === 'POST') {
    try { const body = await req.json(); orderId = body.orderId; } catch {}
  } else {
    const url = new URL(req.url); orderId = url.searchParams.get('orderId') || undefined;
  }
  if (!orderId) return new Response(JSON.stringify({ error: 'missing_orderId' }), { status: 400, headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ error: 'server_misconfigured' }), { status: 500, headers: corsHeaders });
  const client = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });

  let userId: string | undefined;
  try { const jwt = authHeader.replace('Bearer ',''); const payload = JSON.parse(atob(jwt.split('.')[1] || 'e30=')); userId = payload.sub; } catch {}
  if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

  try {
    const { data: ord, error: ordErr } = await client.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (ordErr || !ord) return new Response(JSON.stringify({ error: 'order_not_found' }), { status: 404, headers: corsHeaders });
    if (ord.user_id !== userId) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders });
    if (!ord.vendor_order_id) return new Response(JSON.stringify({ error: 'order_not_submitted' }), { status: 400, headers: corsHeaders });

    const token = await getAuthToken();
    const vendorResp = await fetchWithTimeout(`${SHAPEWAYS_API}/orders/${ord.vendor_order_id}/v1`, { headers: { 'Authorization': `Bearer ${token}` }, timeoutMs: 10000 });
    const vendorJson = await vendorResp.json();
    if (!vendorResp.ok || vendorJson.result !== 'success') {
      return new Response(JSON.stringify({ error: 'vendor_fetch_failed', vendorStatus: vendorJson }), { status: 502, headers: corsHeaders });
    }

    // Map vendor status to internal status (simple initial mapping)
    const vendorStatus: string = vendorJson.status || vendorJson.orderStatus || '';
    let internalStatus = ord.status;
    if (/shipped/i.test(vendorStatus)) internalStatus = 'shipped';
    else if (/delivered/i.test(vendorStatus)) internalStatus = 'delivered';
    else if (/production|in_production/i.test(vendorStatus)) internalStatus = 'in_production';

    const updates: any = { last_vendor_status: vendorJson, status: internalStatus };
    if (internalStatus === 'shipped' && !ord.shipped_at) updates.shipped_at = new Date().toISOString();
    if (internalStatus === 'delivered' && !ord.delivered_at) updates.delivered_at = new Date().toISOString();
  const { error: updErr } = await client.from('orders').update(updates).eq('id', ord.id);
    if (updErr) throw new Error(`db_update_failed:${updErr.message}`);
  // Event log (best-effort)
  try { await client.from('order_events').insert({ order_id: ord.id, user_id: userId, evt_type: 'status_refresh', evt_data: { vendorStatus: vendorJson, mappedStatus: updates.status } }); } catch {}

    return new Response(JSON.stringify({ orderId: ord.id, status: updates.status, vendorStatus: vendorJson }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const err = e as Error;
    try { console.error(JSON.stringify({ evt: 'get_order_error', message: err.message })); } catch {}
    return new Response(JSON.stringify({ error: 'order_status_failed', message: err.message }), { status: 500, headers: corsHeaders });
  }
});
