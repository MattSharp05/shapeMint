// STRIPE INTEGRATION - RLS WORKAROUND VERSION
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.9.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('🚀 PRODUCTION Stripe Checkout - RLS Workaround v2');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables:', {
        stripeKey: !!stripeKey,
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      });
      throw new Error('Missing environment configuration');
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Phase 6: reject anonymous users. Checkout requires a real account —
    // email + address are needed for Stripe receipts and manufacturer ship-to.
    const authHeader = req.headers.get('Authorization') || '';
    try {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const payloadPart = token.split('.')[1] || '';
      if (payloadPart) {
        const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const claims = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
        if (claims?.is_anonymous === true) {
          return new Response(
            JSON.stringify({ error: 'account_required', message: 'Sign in or create an account to check out.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch { /* malformed JWT falls through to normal validation */ }

    const body = await req.json();
    console.log('📝 Request body received:', JSON.stringify(body, null, 2));
    // Validation
    if (!body.amount || body.amount <= 0) throw new Error('Invalid amount');
    if (!body.user_id) throw new Error('User ID required');
    if (!body.order_details?.model_name) throw new Error('Model name required');
    const successUrl = body.successUrl || 'http://localhost:5175/order-success';
    const cancelUrl = body.cancelUrl || 'http://localhost:5175/order-cancelled';
    const orderId = crypto.randomUUID();
    console.log('🆔 Generated order ID:', orderId);
    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: [
        'card'
      ],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '3D Model Service',
              description: 'ShapeMint 3D Model Generation or Download'
            },
            unit_amount: Math.round(body.amount * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${successUrl}?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancelUrl}?order_id=${orderId}`,
      metadata: {
        order_id: orderId,
        user_id: body.user_id,
        payment_type: body.paymentType,
        model_id: body.order_details.model_id || ''
      }
    });
    console.log('✅ Stripe session created:', session.id);
    // 💾 Store ALL order data in stripe_sessions (bypasses RLS)
    const sessionData = {
      session_id: session.id,
      payment_status: 'pending',
      amount_total: Math.round(body.amount * 100),
      customer_email: body.metadata?.email || 'test@shapemint.com',
      metadata: {
        order_id: orderId,
        user_id: body.user_id,
        payment_type: body.paymentType,
        model_id: body.order_details.model_id || '',
        model_name: body.order_details.model_name || '',
        model_url: body.order_details.model_url || '',
        description: body.order_details.description || '',
        amount: body.amount,
        created_at: new Date().toISOString(),
        order_number: `SM-${Date.now()}`,
        filename: body.order_details.model_name || 'Generated Model',
        ...body.metadata
      }
    };
    console.log('💾 Storing order in stripe_sessions (RLS bypass)');
    console.log('📊 Session data to insert:', JSON.stringify(sessionData, null, 2));
    const { data: insertResult, error: sessionError } = await supabase.from('stripe_sessions').insert(sessionData).select();
    if (sessionError) {
      console.error('❌ Failed to record session:', sessionError);
      console.error('❌ Session data that failed:', sessionData);
      throw new Error(`Failed to record order: ${sessionError.message}`);
    }
    console.log('✅ Order stored successfully in stripe_sessions');
    console.log('✅ Insert result:', insertResult);
    return new Response(JSON.stringify({
      success: true,
      url: session.url,
      sessionId: session.id,
      orderId: orderId
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});