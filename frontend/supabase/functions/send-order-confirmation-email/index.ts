import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface ShippingAddress {
  address1: string;
  city: string;
  state: string;
  zipCode: string;
}

interface OrderConfirmationRequest {
  email: string;
  firstName: string;
  lastName: string;
  orderId: string;
  orderNumber: string;
  totalPrice: number;
  itemSubtotal?: number;
  shippingPrice?: number;
  currency: string;
  materialType: string;
  vendorId: string;
  shippingAddress: ShippingAddress;
  paymentMethodBrand?: string;
  paymentMethodLast4?: string;
  paymentMethodType?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      email,
      firstName,
      lastName,
      orderId,
      orderNumber,
      totalPrice,
      itemSubtotal,
      shippingPrice,
      currency,
      materialType,
      vendorId,
      shippingAddress,
      paymentMethodBrand,
      paymentMethodLast4,
      paymentMethodType,
    }: OrderConfirmationRequest = await req.json();

    if (!email || !orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, orderNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fmt = (amount: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);

    const formattedTotal = fmt(totalPrice);
    const formattedSubtotal = itemSubtotal != null ? fmt(itemSubtotal) : null;
    const formattedShipping = shippingPrice != null ? fmt(shippingPrice) : null;

    const trackOrderUrl = `https://shapemint.dev/dashboard`;

    // Format payment method display
    let paymentDisplay = 'Card';
    if (paymentMethodBrand && paymentMethodLast4) {
      const brand = paymentMethodBrand.charAt(0).toUpperCase() + paymentMethodBrand.slice(1);
      paymentDisplay = `${brand} ending in ${paymentMethodLast4}`;
    } else if (paymentMethodLast4) {
      paymentDisplay = `Card ending in ${paymentMethodLast4}`;
    } else if (paymentMethodType && paymentMethodType !== 'card') {
      paymentDisplay = paymentMethodType.charAt(0).toUpperCase() + paymentMethodType.slice(1);
    }

    const now = new Date();
    const dateDisplay = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build subtotal + shipping rows if available
    const breakdownRows = (formattedSubtotal && formattedShipping) ? `
          <tr>
            <td style="color:rgba(255,255,255,0.6); font-size:14px; padding:6px 0; white-space:nowrap; padding-right:16px;">Item Subtotal</td>
            <td style="color:#ffffff; font-size:14px; padding:6px 0; text-align:right;">${formattedSubtotal}</td>
          </tr>
          <tr>
            <td style="color:rgba(255,255,255,0.6); font-size:14px; padding:6px 0; white-space:nowrap; padding-right:16px;">Shipping</td>
            <td style="color:#ffffff; font-size:14px; padding:6px 0; text-align:right;">${formattedShipping}</td>
          </tr>` : '';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0a0a1a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
    <div style="text-align:center; margin-bottom:32px;">
      <h1 style="color:#ffffff; font-size:28px; margin:0; letter-spacing:0.5px;">ShapeMint</h1>
      <p style="color:#EDAE49; font-size:13px; margin:8px 0 0 0; text-transform:uppercase; letter-spacing:2px;">Payment Received</p>
    </div>

    <div style="background-color:#141428; border-radius:16px; padding:32px; border:1px solid rgba(237,174,73,0.15);">
      <!-- Payment confirmed banner -->
      <div style="text-align:center; margin-bottom:24px;">
        <div style="display:inline-block; background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.25); border-radius:50%; width:56px; height:56px; line-height:56px; font-size:28px; margin-bottom:12px;">&#10003;</div>
        <h2 style="color:#ffffff; font-size:20px; margin:0 0 4px 0;">Payment Confirmed</h2>
        <p style="color:rgba(255,255,255,0.5); font-size:13px; margin:0;">${dateDisplay}</p>
      </div>

      <p style="color:rgba(255,255,255,0.7); font-size:15px; line-height:1.6; margin:0 0 28px 0; text-align:center;">
        Hey ${firstName || 'there'}! Thank you for your order. Your payment has been received and your custom 3D print is being prepared.
      </p>

      <!-- Order summary -->
      <div style="background-color:rgba(237,174,73,0.08); border-radius:12px; padding:20px; margin-bottom:20px; border:1px solid rgba(237,174,73,0.12);">
        <p style="color:rgba(255,255,255,0.45); font-size:11px; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 12px 0;">Order Summary</p>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="color:rgba(255,255,255,0.6); font-size:14px; padding:6px 0; white-space:nowrap; padding-right:16px;">Order Number</td>
            <td style="color:#ffffff; font-size:14px; padding:6px 0; text-align:right; font-weight:600;">#${orderNumber}</td>
          </tr>
          <tr>
            <td style="color:rgba(255,255,255,0.6); font-size:14px; padding:6px 0; white-space:nowrap; padding-right:16px;">Material</td>
            <td style="color:#ffffff; font-size:14px; padding:6px 0; text-align:right;">${materialType}</td>
          </tr>
          ${breakdownRows}
          <tr>
            <td style="color:rgba(255,255,255,0.6); font-size:14px; padding:6px 0; border-top:1px solid rgba(255,255,255,0.08); padding-top:12px; white-space:nowrap; padding-right:16px;">Total Paid</td>
            <td style="color:#EDAE49; font-size:18px; padding:6px 0; text-align:right; font-weight:700; border-top:1px solid rgba(255,255,255,0.08); padding-top:12px;">${formattedTotal}</td>
          </tr>
        </table>
      </div>

      <!-- Payment method -->
      <div style="background-color:rgba(255,255,255,0.03); border-radius:12px; padding:16px 20px; margin-bottom:20px; border:1px solid rgba(255,255,255,0.06); display:flex; align-items:center;">
        <div>
          <p style="color:rgba(255,255,255,0.45); font-size:11px; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 6px 0;">Payment Method</p>
          <p style="color:#ffffff; font-size:14px; margin:0;">${paymentDisplay}</p>
        </div>
      </div>

      <!-- Shipping address -->
      <div style="background-color:rgba(255,255,255,0.03); border-radius:12px; padding:16px 20px; margin-bottom:28px; border:1px solid rgba(255,255,255,0.06);">
        <p style="color:rgba(255,255,255,0.45); font-size:11px; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 8px 0;">Shipping To</p>
        <p style="color:#ffffff; font-size:14px; line-height:1.7; margin:0;">
          ${firstName} ${lastName}<br>
          ${shippingAddress?.address1 || ''}<br>
          ${shippingAddress?.city || ''}${shippingAddress?.state ? `, ${shippingAddress.state}` : ''} ${shippingAddress?.zipCode || ''}
        </p>
      </div>

      <!-- What's next -->
      <div style="background-color:rgba(237,174,73,0.05); border-radius:12px; padding:20px; margin-bottom:28px; border:1px solid rgba(237,174,73,0.1);">
        <p style="color:#EDAE49; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin:0 0 10px 0;">What's Next</p>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="color:rgba(255,255,255,0.4); font-size:20px; padding:4px 12px 4px 0; vertical-align:top; width:32px;">1.</td>
            <td style="color:rgba(255,255,255,0.7); font-size:14px; padding:4px 0; line-height:1.5;">Your order is sent to our printing partner for production.</td>
          </tr>
          <tr>
            <td style="color:rgba(255,255,255,0.4); font-size:20px; padding:4px 12px 4px 0; vertical-align:top; width:32px;">2.</td>
            <td style="color:rgba(255,255,255,0.7); font-size:14px; padding:4px 0; line-height:1.5;">You'll receive updates as your print progresses.</td>
          </tr>
          <tr>
            <td style="color:rgba(255,255,255,0.4); font-size:20px; padding:4px 12px 4px 0; vertical-align:top; width:32px;">3.</td>
            <td style="color:rgba(255,255,255,0.7); font-size:14px; padding:4px 0; line-height:1.5;">Tracking info will be emailed once your order ships.</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;">
        <a href="${trackOrderUrl}" style="display:inline-block; background:linear-gradient(135deg,#EDAE49,#d4993e); color:#0a0a1a; font-weight:600; font-size:15px; padding:14px 36px; border-radius:8px; text-decoration:none;">
          Track Your Order
        </a>
      </div>
    </div>

    <p style="color:rgba(255,255,255,0.25); font-size:12px; text-align:center; margin-top:24px; line-height:1.6;">
      Questions about your order? Reply to this email or visit <a href="https://shapemint.dev" style="color:rgba(237,174,73,0.6); text-decoration:none;">shapemint.dev</a>
    </p>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ShapeMint <noreply@shapemint.dev>',
        to: [email],
        subject: `Payment Confirmed — ShapeMint Order #${orderNumber}`,
        html: htmlBody,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', JSON.stringify(resData));
      return new Response(
        JSON.stringify({ success: false, error: 'Email send failed', details: resData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailId: resData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Order confirmation email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
