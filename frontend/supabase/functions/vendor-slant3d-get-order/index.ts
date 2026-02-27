// deno-lint-ignore-file no-explicit-any
declare const Deno: any;
// Inline cors headers for dashboard deployment compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const SLANT3D_API = 'https://slant3dapi.com/v2/api';

async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('SLANT3D_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'SLANT3D_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // orderId could be our internal ID or Slant3D public ID
    // Try to get from database first to get vendor_order_id
    let vendorOrderId = orderId;
    if (!orderId.startsWith('SLANT_')) {
      // Might be our internal ID, but for now assume it's the vendor order ID
      // In production, you'd look up the order in the database
      vendorOrderId = orderId;
    }

    const response = await fetchWithTimeout(`${SLANT3D_API}/orders/${vendorOrderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeoutMs: 10000
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Slant3D API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch order', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderData = await response.json();

    // Map Slant3D status to our status
    const statusMap: Record<string, string> = {
      'DRAFTED': 'pending',
      'PROCESSING': 'submitted',
      'IN_PROGRESS': 'in_production',
      'SHIPPED': 'shipped',
      'DELIVERED': 'delivered',
      'CANCELLED': 'cancelled',
      'FAILED': 'failed'
    };

    return new Response(
      JSON.stringify({
        orderId: orderId,
        status: statusMap[orderData.status] || orderData.status?.toLowerCase() || 'unknown',
        vendorStatus: orderData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching Slant3D order:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
