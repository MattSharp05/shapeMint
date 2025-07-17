// frontend/supabase/functions/create-checkout-session/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.9.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check environment variables first
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log('🔑 Checking Stripe key:', stripeKey ? 'Present' : 'MISSING');
    
    if (!stripeKey) {
      console.error('❌ STRIPE_SECRET_KEY environment variable is missing');
      return new Response(JSON.stringify({
        error: 'Server configuration error: STRIPE_SECRET_KEY is missing',
        details: 'Please configure the STRIPE_SECRET_KEY environment variable in Supabase'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });

    const body = await req.json();
    console.log('📥 Received checkout request:', JSON.stringify(body, null, 2));

    const { amount, paymentType, metadata, successUrl, cancelUrl } = body;

    // Detailed validation with specific error messages
    if (amount === undefined || amount === null) {
      console.error('❌ Amount is missing from request');
      return new Response(JSON.stringify({
        error: 'Amount is required',
        details: 'Request must include an amount field'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (typeof amount !== 'number') {
      console.error('❌ Amount is not a number:', typeof amount, amount);
      return new Response(JSON.stringify({
        error: 'Amount must be a number',
        details: `Received ${typeof amount}: ${amount}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (amount <= 0) {
      console.error('❌ Amount must be positive:', amount);
      return new Response(JSON.stringify({
        error: 'Amount must be greater than 0',
        details: `Received: ${amount}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (!paymentType) {
      console.error('❌ Payment type is missing');
      return new Response(JSON.stringify({
        error: 'Payment type is required',
        details: 'Request must include a paymentType field'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (!['download', 'manufacturing'].includes(paymentType)) {
      console.error('❌ Invalid payment type:', paymentType);
      return new Response(JSON.stringify({
        error: 'Invalid payment type',
        details: `Payment type must be 'download' or 'manufacturing', received: ${paymentType}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (!successUrl) {
      console.error('❌ Success URL is missing');
      return new Response(JSON.stringify({
        error: 'Success URL is required',
        details: 'Request must include a successUrl field'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (!cancelUrl) {
      console.error('❌ Cancel URL is missing');
      return new Response(JSON.stringify({
        error: 'Cancel URL is required',
        details: 'Request must include a cancelUrl field'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log('✅ All validation passed, creating Stripe session...');
    console.log('📊 Session data:', {
      amount: amount,
      amountInCents: Math.round(amount * 100),
      paymentType,
      successUrl,
      cancelUrl,
      metadata
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: paymentType === 'download' ? '3D Model Download' : '3D Print Manufacturing',
            description: metadata?.modelName || 'Custom 3D Model'
          },
          unit_amount: Math.round(amount * 100) // Convert to cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {}
    });

    console.log('✅ Stripe session created successfully:', session.id);

    return new Response(JSON.stringify({
      sessionId: session.id,
      url: session.url
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Edge function error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error type:', error.type);
    console.error('❌ Error code:', error.code);

    // Handle Stripe-specific errors
    if (error.type) {
      return new Response(JSON.stringify({
        error: `Stripe error: ${error.message}`,
        details: error.type,
        code: error.code
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      details: error.stack || 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
