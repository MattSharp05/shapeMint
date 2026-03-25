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
  currency: string;
  materialType: string;
  vendorId: string;
  shippingAddress: ShippingAddress;
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
      currency,
      materialType,
      vendorId,
      shippingAddress,
    }: OrderConfirmationRequest = await req.json();

    if (!email || !orderNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, orderNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(totalPrice);

    const trackingUrl = `https://shape-mint.vercel.app/dashboard`;

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
      <p style="color:#EDAE49; font-size:13px; margin:8px 0 0 0; text-transform:uppercase; letter-spacing:2px;">Order Confirmed</p>
    </div>

    <div style="background-color:#141428; border-radius:16px; padding:32px; border:1px solid rgba(237,174,73,0.15);">
      <h2 style="color:#ffffff; font-size:20px; margin:0 0 8px 0;">Hey ${firstName || 'there'}!</h2>
      <p style="color:rgba(255,255,255,0.7); font-size:15px; line-height:1.6; margin:0 0 28px 0;">
        Thank you for your order. Your custom 3D print is being prepared.
      </p>

      <div style="background-color:rgba(237,174,73,0.08); border-radius:12px; padding:20px; margin-bottom:24px; border:1px solid rgba(237,174,73,0.12);">
        <p style="color:rgba(255,255,255,0.45); font-size:11px; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 12px 0;">Order Summary</p>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="color:rgba(255,255,255,0.6); font-size:14px; padding:6px 0;">Order Number</td>
            <td style="color:#ffffff; font-size:14px; padding:6px 0; text-align:right; font-weight:600;">#${orderNumber}</td>
          </tr>
          <tr>
            <td style="color:rgba(255,255,255,0.6); font-size:14px; padding:6px 0;">Material</td>
            <td style="color:#ffffff; font-size:14px; padding:6px 0; text-align:right;">${materialType}</td>
          </tr>
          <tr>
            <td style="color:rgba(255,255,255,0.6); font-size:14px; padding:6px 0; border-top:1px solid rgba(255,255,255,0.08); padding-top:12px;">Total Paid</td>
            <td style="color:#EDAE49; font-size:18px; padding:6px 0; text-align:right; font-weight:700; border-top:1px solid rgba(255,255,255,0.08); padding-top:12px;">${formattedPrice}</td>
          </tr>
        </table>
      </div>

      <div style="background-color:rgba(255,255,255,0.03); border-radius:12px; padding:20px; margin-bottom:28px; border:1px solid rgba(255,255,255,0.06);">
        <p style="color:rgba(255,255,255,0.45); font-size:11px; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 12px 0;">Shipping To</p>
        <p style="color:#ffffff; font-size:14px; line-height:1.7; margin:0;">
          ${firstName} ${lastName}<br>
          ${shippingAddress?.address1 || ''}<br>
          ${shippingAddress?.city || ''}${shippingAddress?.state ? `, ${shippingAddress.state}` : ''} ${shippingAddress?.zipCode || ''}
        </p>
      </div>

      <p style="color:rgba(255,255,255,0.5); font-size:13px; line-height:1.6; margin:0 0 28px 0; text-align:center;">
        You'll receive shipping and tracking updates from our printing partner once your order ships.
      </p>

      <div style="text-align:center;">
        <a href="${trackingUrl}" style="display:inline-block; background:linear-gradient(135deg,#EDAE49,#d4993e); color:#0a0a1a; font-weight:600; font-size:15px; padding:14px 36px; border-radius:8px; text-decoration:none;">
          View Your Orders
        </a>
      </div>
    </div>

    <p style="color:rgba(255,255,255,0.25); font-size:12px; text-align:center; margin-top:24px; line-height:1.6;">
      Questions about your order? Reply to this email or visit <a href="https://shape-mint.vercel.app" style="color:rgba(237,174,73,0.6); text-decoration:none;">shapemint.dev</a>
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
        subject: `Order Confirmed — ShapeMint #${orderNumber}`,
        html: htmlBody,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', JSON.stringify(resData));
      // Non-critical — don't fail the order flow
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
    // Non-critical — always return 200
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
