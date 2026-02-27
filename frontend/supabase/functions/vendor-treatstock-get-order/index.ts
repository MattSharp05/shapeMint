// deno-lint-ignore-file no-explicit-any
// Gets order status from Treatstock
// Note: Treatstock API doesn't provide a direct order status endpoint,
// but we can return the order data stored in our database

declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface GetOrderInput {
  orderId?: string;
  vendorOrderId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), { status: 500, headers: corsHeaders });
  }

  const client = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });

  let userId: string | undefined;
  try {
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1] || 'e30='));
    userId = payload.sub;
  } catch {}
  if (!userId) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get('orderId');
    const vendorOrderId = url.searchParams.get('vendorOrderId');

    if (!orderId && !vendorOrderId) {
      return new Response(
        JSON.stringify({ error: 'missing_parameter', message: 'orderId or vendorOrderId is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Query order from database
    let query = client.from('orders').select('*').eq('vendor', 'treatstock');
    
    if (orderId) {
      query = query.eq('id', orderId);
    } else if (vendorOrderId) {
      query = query.eq('vendor_order_id', vendorOrderId);
    }

    // Only return orders for the authenticated user
    query = query.eq('user_id', userId);

    const { data: order, error: queryError } = await query.maybeSingle();

    if (queryError) {
      throw new Error(`db_query_failed:${queryError.message}`);
    }

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'order_not_found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Return order data
    // Note: Treatstock doesn't provide a direct API endpoint for order status,
    // so we return what we have stored in the database
    const responseData = {
      orderId: order.id,
      orderNumber: order.order_number,
      vendorOrderId: order.vendor_order_id,
      status: order.status,
      totalPrice: order.total_price,
      currency: order.currency,
      quantity: order.quantity,
      selections: order.selections,
      shippingAddress: order.shipping_address,
      createdAt: order.created_at,
      submittedAt: order.submitted_at,
      vendorOrderRaw: order.vendor_order_raw,
      lastVendorStatus: order.last_vendor_status,
      note: 'Treatstock does not provide a direct API endpoint for order status. This data is from our database. For current status, please check the Treatstock order URL if available.'
    };

    // If we have a vendor order URL in the raw data, include it
    if (order.vendor_order_raw?.url) {
      responseData['vendorOrderUrl'] = order.vendor_order_raw.url;
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const err = e as Error;
    try { console.error(JSON.stringify({ evt: 'get_order_error', message: err.message })); } catch {}
    
    return new Response(
      JSON.stringify({ 
        error: 'get_order_failed', 
        message: err.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
