// STRIPE INTEGRATION DISABLED - Using Slant3D for orders instead
/*
import { supabase } from '../supabaseClient';

export const stripeService = {
  async redirectToCheckout(params: {
    amount: number;
    currency?: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
  }) {
    const { amount, currency = 'usd', successUrl, cancelUrl, metadata = {} } = params;

    console.log('🚀 Creating Stripe checkout session with:');
    console.log('  Amount:', amount);
    console.log('  Currency:', currency);
    console.log('  Success URL:', successUrl);
    console.log('  Cancel URL:', cancelUrl);
    console.log('  Metadata:', metadata);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          amount,
          currency,
          success_url: successUrl || `${window.location.origin}/success`,
          cancel_url: cancelUrl || `${window.location.origin}/cancel`,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        }
      });

      if (error) {
        console.error('❌ Failed to create checkout session:', error);
        throw new Error(`Failed to create checkout session: ${error.message}`);
      }

      if (!data?.url) {
        console.error('❌ No checkout URL returned:', data);
        throw new Error('No checkout URL returned from server');
      }

      console.log('✅ Stripe checkout URL created:', data.url);
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
      
    } catch (error) {
      console.error('❌ Error in redirectToCheckout:', error);
      throw error;
    }
  },

  async getSession(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('stripe_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        console.error('❌ Failed to get session:', error);
        throw new Error(`Failed to get session: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error in getSession:', error);
      throw error;
    }
  }
};
*/