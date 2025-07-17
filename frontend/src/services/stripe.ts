import { supabase } from '../supabaseClient';

export const stripeService = {
  async createCheckoutSession({
    amount,
    paymentType,
    metadata,
    successUrl,
    cancelUrl
  }: {
    amount: number;
    paymentType: 'download' | 'manufacturing';
    metadata: any;
    successUrl: string;
    cancelUrl: string;
  }) {
    console.log('🔄 Invoking Supabase function with data:', {
      amount,
      paymentType,
      metadata,
      successUrl,
      cancelUrl
    });

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        amount,
        paymentType,
        metadata,
        successUrl,
        cancelUrl
      }
    });

    console.log('📥 Supabase function response:');
    console.log('  - data:', data);
    console.log('  - error:', error);

    if (error) {
      console.error('❌ Supabase function error details:', {
        message: error.message,
        name: error.name,
        cause: error.cause,
        stack: error.stack
      });
      throw error;
    }

    if (!data || !data.sessionId || !data.url) {
      console.error('❌ Invalid response from Supabase function:', data);
      throw new Error('Invalid response from checkout service');
    }

    return data;
  },

  async redirectToCheckout({
    amount,
    paymentType,
    metadata,
    successPath = '/success',
    cancelPath = '/cancel'
  }: {
    amount: number;
    paymentType: 'download' | 'manufacturing';
    metadata: any;
    successPath?: string;
    cancelPath?: string;
  }) {
    const baseUrl = window.location.origin;
    const successUrl = `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}${cancelPath}`;

    console.log('🚀 Creating Stripe checkout session with:');
    console.log('  - amount:', amount);
    console.log('  - paymentType:', paymentType);
    console.log('  - metadata:', metadata);
    console.log('  - successUrl:', successUrl);
    console.log('  - cancelUrl:', cancelUrl);

    try {
      console.log('📡 Calling Supabase edge function...');
      
      const { sessionId, url } = await this.createCheckoutSession({
        amount,
        paymentType,
        metadata,
        successUrl,
        cancelUrl
      });

      console.log('✅ Checkout session created successfully:');
      console.log('  - sessionId:', sessionId);
      console.log('  - url:', url);

      // Redirect to Stripe Checkout
      window.location.href = url;
      
      return { sessionId, url };
    } catch (error: any) {
      console.error('❌ Error creating checkout session:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        status: error.status
      });
      
      // Log the full error response if available
      if (error.response) {
        console.error('❌ Response data:', error.response.data);
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response headers:', error.response.headers);
      }
      
      throw error;
    }
  }
};