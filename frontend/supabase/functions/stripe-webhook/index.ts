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
      console.log('🔑 Verifying signature. Secret starts with:', webhookSecret.slice(0, 10) + '...');
      console.log('🔑 Signature header:', signature.slice(0, 40) + '...');
      console.log('🔑 Body length:', body.length);
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log('✅ Webhook signature verified:', event.type);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message || err);
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
            amount_paid: (session.amount_total || 0) / 100,
            payment_status: 'paid',
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

        // If this is a CraftCloud order, pay via invoice (two-step: create then execute)
        const craftcloudOrderId = session.metadata?.craftcloud_order_id;
        if (craftcloudOrderId && session.metadata?.payment_type === 'craftcloud_invoice') {
          console.log('📦 [CraftCloud Invoice] Starting invoice payment flow');
          console.log('📦 [CraftCloud Invoice] CraftCloud Order ID:', craftcloudOrderId);
          console.log('📦 [CraftCloud Invoice] Internal Order ID:', orderId);
          console.log('📦 [CraftCloud Invoice] Stripe Session ID:', session.id);

          try {
            const CRAFTCLOUD_API = 'https://api.craftcloud3d.com';

            // --- Step 1: Create the invoice ---
            console.log('📦 [CraftCloud Invoice] Step 1/2: Creating invoice via POST /v5/payment/invoice');
            const invoiceBody = { orderId: craftcloudOrderId };
            console.log('📦 [CraftCloud Invoice] Request body:', JSON.stringify(invoiceBody));

            const invoiceResp = await fetch(`${CRAFTCLOUD_API}/v5/payment/invoice`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(invoiceBody),
            });

            console.log('📦 [CraftCloud Invoice] Step 1 response status:', invoiceResp.status);

            if (!invoiceResp.ok) {
              const errText = await invoiceResp.text().catch(() => '');
              console.error('❌ [CraftCloud Invoice] Step 1 FAILED: Invoice creation failed');
              console.error('❌ [CraftCloud Invoice] Status:', invoiceResp.status, 'Body:', errText);

              await supabase
                .from('orders')
                .update({
                  status: 'paid_invoice_failed',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', orderId);

              await supabase.from('payment_events').insert({
                order_id: orderId,
                event_type: 'craftcloud_invoice_create_failed',
                event_data: {
                  step: 'create',
                  craftcloudOrderId,
                  httpStatus: invoiceResp.status,
                  error: errText,
                },
                created_at: new Date().toISOString(),
              });
            } else {
              const invoiceData = await invoiceResp.json().catch(() => ({}));
              const paymentId = invoiceData.paymentId;
              console.log('✅ [CraftCloud Invoice] Step 1 SUCCESS: Invoice created');
              console.log('✅ [CraftCloud Invoice] Response:', JSON.stringify(invoiceData));
              console.log('✅ [CraftCloud Invoice] Payment ID:', paymentId);

              await supabase.from('payment_events').insert({
                order_id: orderId,
                event_type: 'craftcloud_invoice_created',
                event_data: { step: 'create', craftcloudOrderId, invoiceData },
                created_at: new Date().toISOString(),
              });

              if (!paymentId) {
                console.error('❌ [CraftCloud Invoice] No paymentId returned from Step 1 — cannot execute invoice');
                await supabase
                  .from('orders')
                  .update({
                    status: 'paid_invoice_failed',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', orderId);

                await supabase.from('payment_events').insert({
                  order_id: orderId,
                  event_type: 'craftcloud_invoice_missing_payment_id',
                  event_data: { step: 'create', craftcloudOrderId, invoiceData },
                  created_at: new Date().toISOString(),
                });
              } else {
                // --- Step 2: Execute the invoice payment ---
                console.log('📦 [CraftCloud Invoice] Step 2/2: Executing invoice via PATCH /v5/payment/invoice/' + paymentId);
                const executeBody = { token: paymentId };
                console.log('📦 [CraftCloud Invoice] Request body:', JSON.stringify(executeBody));

                const executeResp = await fetch(`${CRAFTCLOUD_API}/v5/payment/invoice/${paymentId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                });

                console.log('📦 [CraftCloud Invoice] Step 2 response status:', executeResp.status);
                const executeText = await executeResp.text().catch(() => '');
                console.log('📦 [CraftCloud Invoice] Step 2 response body:', executeText);

                let executeData: any = {};
                try { executeData = JSON.parse(executeText); } catch { executeData = { raw: executeText }; }

                if (!executeResp.ok) {
                  console.error('❌ [CraftCloud Invoice] Step 2 FAILED: Invoice execution failed');
                  console.error('❌ [CraftCloud Invoice] Status:', executeResp.status, 'Body:', executeText);

                  await supabase
                    .from('orders')
                    .update({
                      status: 'paid_invoice_failed',
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', orderId);

                  await supabase.from('payment_events').insert({
                    order_id: orderId,
                    event_type: 'craftcloud_invoice_execute_failed',
                    event_data: {
                      step: 'execute',
                      craftcloudOrderId,
                      paymentId,
                      httpStatus: executeResp.status,
                      error: executeText,
                    },
                    created_at: new Date().toISOString(),
                  });
                } else {
                  console.log('✅ [CraftCloud Invoice] Step 2 SUCCESS: Invoice executed');
                  console.log('✅ [CraftCloud Invoice] Full flow complete — order confirmed');
                  console.log('✅ [CraftCloud Invoice] Summary: Order', orderId, '| CraftCloud', craftcloudOrderId, '| Payment', paymentId);

                  await supabase
                    .from('orders')
                    .update({
                      status: 'confirmed',
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', orderId);

                  await supabase.from('payment_events').insert({
                    order_id: orderId,
                    event_type: 'craftcloud_invoice_paid',
                    event_data: {
                      step: 'execute',
                      craftcloudOrderId,
                      paymentId,
                      invoiceData,
                      executeData,
                    },
                    created_at: new Date().toISOString(),
                  });
                }
              }
            }
          } catch (invoiceErr: any) {
            console.error('💥 [CraftCloud Invoice] Unexpected error:', invoiceErr.message);
            console.error('💥 [CraftCloud Invoice] Stack:', invoiceErr.stack);
            await supabase
              .from('orders')
              .update({
                status: 'paid_invoice_failed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', orderId);

            await supabase.from('payment_events').insert({
              order_id: orderId,
              event_type: 'craftcloud_invoice_error',
              event_data: {
                craftcloudOrderId,
                error: invoiceErr.message,
                stack: invoiceErr.stack,
              },
              created_at: new Date().toISOString(),
            });
          }
        }

        // Send order confirmation email (fire and forget)
        try {
          const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

          if (order) {
            // Retrieve payment details from Stripe for the receipt
            let paymentMethodBrand = '';
            let paymentMethodLast4 = '';
            let paymentMethodType = 'card';
            try {
              const paymentIntentId = session.payment_intent as string;
              if (paymentIntentId) {
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                const pmId = paymentIntent.payment_method as string;
                if (pmId) {
                  const pm = await stripe.paymentMethods.retrieve(pmId);
                  paymentMethodType = pm.type || 'card';
                  paymentMethodBrand = pm.card?.brand || '';
                  paymentMethodLast4 = pm.card?.last4 || '';
                }
              }
              console.log('💳 Payment details retrieved:', { paymentMethodType, paymentMethodBrand, paymentMethodLast4 });
            } catch (pmErr: any) {
              console.warn('⚠️ Could not retrieve payment method details:', pmErr.message);
            }

            const shippingAddr = order.shipping_address || {};
            await supabase.functions.invoke('send-order-confirmation-email', {
              body: {
                email: order.customer_email || shippingAddr.email,
                firstName: shippingAddr.firstName || order.customer_name?.split(' ')[0] || '',
                lastName: shippingAddr.lastName || order.customer_name?.split(' ').slice(1).join(' ') || '',
                orderId: order.id,
                orderNumber: order.order_number || order.vendor_order_id || order.id,
                totalPrice: order.total_price,
                itemSubtotal: order.item_subtotal,
                shippingPrice: order.shipping_price,
                currency: order.currency || 'USD',
                materialType: order.profile || 'Standard 3D Print',
                vendorId: order.vendor || 'craftcloud',
                shippingAddress: shippingAddr,
                paymentMethodBrand,
                paymentMethodLast4,
                paymentMethodType,
              },
            });
            console.log('✅ Order confirmation email sent for:', orderId);
          }
        } catch (emailErr: any) {
          console.error('⚠️ Order confirmation email failed (non-critical):', emailErr.message);
        }

        // If this was a multi-item cart order, clear those cart_items rows.
        const cartItemIdsStr = session.metadata?.cart_item_ids;
        if (cartItemIdsStr && session.metadata?.is_cart_order === 'true') {
          const ids = cartItemIdsStr.split('|').map((s: string) => s.trim()).filter(Boolean);
          if (ids.length > 0) {
            const { error: delErr } = await supabase.from('cart_items').delete().in('id', ids);
            if (delErr) {
              console.error('⚠️ Failed to clear cart items after checkout:', delErr.message);
            } else {
              console.log(`🧹 Cleared ${ids.length} cart item(s) after successful checkout`);
            }
          }
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
