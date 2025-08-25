import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.9.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🎣 Stripe webhook received');
    
    // Get environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!stripeKey || !webhookSecret) {
      console.error('❌ Missing Stripe configuration');
      return new Response('Server configuration error', { status: 500 });
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase configuration');
      return new Response('Server configuration error', { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ No Stripe signature found');
      return new Response('No signature', { status: 400 });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ Webhook signature verified:', event.type);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return new Response('Invalid signature', { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Payment successful for session:', session.id);
        
        const orderId = session.metadata?.order_id;
        if (!orderId) {
          console.error('❌ No order_id in session metadata');
          break;
        }

        // Update order status to 'paid'
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
            payment_method: session.payment_method_types?.[0] || 'card',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('❌ Failed to update order:', updateError);
        } else {
          console.log('✅ Order updated successfully:', orderId);
        }

        // Log payment event
        const { error: eventError } = await supabase
          .from('payment_events')
          .insert({
            order_id: orderId,
            event_type: 'payment_succeeded',
            stripe_event_id: event.id,
            event_data: event.data.object,
            created_at: new Date().toISOString()
          });

        if (eventError) {
          console.error('⚠️ Failed to log payment event:', eventError);
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed for intent:', paymentIntent.id);
        
        // Find order by payment intent ID
        const { data: orders, error: findError } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .limit(1);

        if (findError || !orders?.length) {
          console.error('❌ Could not find order for failed payment');
          break;
        }

        const orderId = orders[0].id;

        // Update order status to 'failed'
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('❌ Failed to update order status:', updateError);
        } else {
          console.log('✅ Order marked as failed:', orderId);
        }

        // Log payment event
        const { error: eventError } = await supabase
          .from('payment_events')
          .insert({
            order_id: orderId,
            event_type: 'payment_failed',
            stripe_event_id: event.id,
            event_data: event.data.object,
            created_at: new Date().toISOString()
          });

        if (eventError) {
          console.error('⚠️ Failed to log payment event:', eventError);
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('⏰ Checkout session expired:', session.id);
        
        const orderId = session.metadata?.order_id;
        if (!orderId) {
          console.error('❌ No order_id in session metadata');
          break;
        }

        // Update order status to 'expired'
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          console.error('❌ Failed to update order status:', updateError);
        } else {
          console.log('✅ Order marked as expired:', orderId);
        }

        break;
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('💥 Webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
