// STRIPE INTEGRATION DISABLED - Using Slant3D for orders instead
/*
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.9.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

interface CheckoutRequest {
  amount: number;
  currency?: string;
  success_url?: string;
  cancel_url?: string;
  metadata?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔑 Checking environment variables...');
    
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log('🔑 Checking Stripe key:', stripeKey ? 'Present' : 'MISSING');
    
    if (!stripeKey) {
      console.error('❌ STRIPE_SECRET_KEY environment variable is missing');
      return new Response(
        JSON.stringify({
          error: 'Server configuration error: STRIPE_SECRET_KEY is missing',
          details: 'Please configure the STRIPE_SECRET_KEY environment variable in Supabase'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });

    const body: CheckoutRequest = await req.json();
    console.log('📥 Received checkout request:', body);

    // Validate required fields
    if (!body.amount || body.amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Must be greater than 0.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!body.success_url) {
      return new Response(
        JSON.stringify({ error: 'Success URL is required.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!body.cancel_url) {
      return new Response(
        JSON.stringify({ error: 'Cancel URL is required.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ All validation passed, creating Stripe session...');

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: body.currency || 'usd',
            product_data: {
              name: '3D Model Service',
              description: 'ShapeMint 3D Model Generation or Download',
            },
            unit_amount: Math.round(body.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: body.success_url,
      cancel_url: body.cancel_url,
      metadata: body.metadata || {},
      allow_promotion_codes: true,
    });

    console.log('✅ Stripe session created successfully:', session.id);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error);
    
    // Handle Stripe-specific errors
    if (error.type && error.message) {
      return new Response(
        JSON.stringify({ 
          error: `Stripe error: ${error.message}`,
          type: error.type 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
*/
