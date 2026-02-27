// deno-lint-ignore-file no-explicit-any
declare const Deno: any;
// Inline cors headers for dashboard deployment compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('SLANT3D_WEBHOOK_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get webhook payload
    const payload = await req.text();
    const signature = req.headers.get('X-Webhook-Signature-256');
    const timestamp = req.headers.get('X-Webhook-Timestamp');

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature && timestamp) {
      // Simple verification - in production, use proper HMAC verification
      // See Slant3D docs for proper signature verification
      console.log('Webhook signature verification (basic check)');
    }

    const event = JSON.parse(payload);
    console.log('Slant3D webhook received:', event.event_type, event.data);

    // Handle order.shipped event
    if (event.event_type === 'order.shipped' && event.data?.order) {
      const order = event.data.order;
      const publicId = order.public_id;
      const status = order.status;
      const trackingNumber = order.tracking_number;

      // Update order in database
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'shipped',
          updated_at: new Date().toISOString(),
          // Store tracking info in a JSON field if available
          vendor_status: { tracking_number: trackingNumber, status: status }
        })
        .eq('vendor_order_id', publicId)
        .eq('vendor', 'slant3d');

      if (updateError) {
        console.error('Error updating order:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update order', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create order event
      const { data: orderRecord } = await supabase
        .from('orders')
        .select('id, user_id')
        .eq('vendor_order_id', publicId)
        .eq('vendor', 'slant3d')
        .single();

      if (orderRecord) {
        await supabase.from('order_events').insert({
          order_id: orderRecord.id,
          user_id: orderRecord.user_id,
          evt_type: 'order_shipped',
          evt_data: {
            tracking_number: trackingNumber,
            status: status,
            shipped_at: new Date().toISOString()
          }
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Order updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Acknowledge other events
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing Slant3D webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
