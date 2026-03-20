import { corsHeaders } from '../_shared/cors.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface QuoteInfo {
  totalPrice: number;
  vendorId: string;
}

interface EmailRequest {
  email: string;
  firstName: string;
  modelId: string;
  prompt: string;
  thumbnailUrl?: string;
  colorQuote?: QuoteInfo;
  monoQuote?: QuoteInfo;
  slsQuote?: QuoteInfo;
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function buildPriceRow(label: string, quote: QuoteInfo): string {
  return `
    <tr>
      <td style="padding:12px 16px; color:rgba(255,255,255,0.85); font-size:15px; border-bottom:1px solid rgba(255,255,255,0.06);">
        ${label}
      </td>
      <td style="padding:12px 16px; color:#EDAE49; font-size:15px; font-weight:600; text-align:right; border-bottom:1px solid rgba(255,255,255,0.06);">
        from ${formatPrice(quote.totalPrice)}
      </td>
    </tr>`;
}

function buildEmailHtml(data: EmailRequest): string {
  const { firstName, prompt, thumbnailUrl, modelId, colorQuote, monoQuote, slsQuote } = data;
  const modelUrl = `https://shapemint.com/model/${modelId}`;
  const name = firstName || 'there';

  const hasQuotes = colorQuote || monoQuote || slsQuote;

  let priceRows = '';
  if (colorQuote) priceRows += buildPriceRow('Full Color', colorQuote);
  if (monoQuote) priceRows += buildPriceRow('SLA Resin', monoQuote);
  if (slsQuote) priceRows += buildPriceRow('SLS Nylon', slsQuote);

  const priceSection = hasQuotes ? `
      <div style="margin:24px 0;">
        <p style="color:rgba(255,255,255,0.5); font-size:12px; text-transform:uppercase; letter-spacing:1px; margin:0 0 12px 0; font-weight:600;">
          Estimated Pricing
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.03); border-radius:10px; overflow:hidden;">
          ${priceRows}
        </table>
        <p style="color:rgba(255,255,255,0.3); font-size:11px; margin:8px 0 0 0;">
          Final price may vary based on size and complexity.
        </p>
      </div>` : '';

  const thumbnailSection = thumbnailUrl ? `
      <div style="text-align:center; margin:24px 0;">
        <img src="${thumbnailUrl}" alt="Your 3D model" width="480" style="max-width:100%; border-radius:12px; border:1px solid rgba(255,255,255,0.08);" />
      </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#0a0a1a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px; margin:0 auto; padding:48px 20px;">

    <!-- Header -->
    <div style="text-align:center; margin-bottom:36px;">
      <h1 style="color:#EDAE49; font-size:26px; margin:0; letter-spacing:0.5px;">ShapeMint</h1>
    </div>

    <!-- Card -->
    <div style="background-color:#141428; border-radius:16px; padding:36px 32px; border:1px solid rgba(237,174,73,0.12);">

      <h2 style="color:#ffffff; font-size:22px; margin:0 0 8px 0;">Hey ${name}!</h2>
      <p style="color:rgba(255,255,255,0.65); font-size:15px; line-height:1.7; margin:0 0 4px 0;">
        Great news — your 3D model has finished generating and is ready to view.
      </p>

      ${prompt ? `
      <div style="margin:20px 0; padding:14px 18px; background-color:rgba(255,255,255,0.03); border-left:3px solid #EDAE49; border-radius:0 8px 8px 0;">
        <p style="color:rgba(255,255,255,0.4); font-size:11px; text-transform:uppercase; letter-spacing:1px; margin:0 0 4px 0;">Your Prompt</p>
        <p style="color:rgba(255,255,255,0.8); font-size:14px; margin:0; line-height:1.5;">${prompt}</p>
      </div>` : ''}

      ${thumbnailSection}

      ${priceSection}

      <!-- CTA Button -->
      <div style="text-align:center; margin:32px 0 8px 0;">
        <a href="${modelUrl}" style="display:inline-block; background:linear-gradient(135deg,#EDAE49,#d4993e); color:#0a0a1a; font-weight:700; font-size:16px; padding:16px 40px; border-radius:10px; text-decoration:none; letter-spacing:0.3px;">
          View Model &amp; Order Print
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p style="color:rgba(255,255,255,0.25); font-size:12px; text-align:center; margin-top:28px; line-height:1.6;">
      This link is unique to your model. Bookmark it to come back anytime.<br/>
      &copy; ShapeMint
    </p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: EmailRequest = await req.json();
    const { email, modelId } = body;

    if (!email || !modelId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: email, modelId' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = buildEmailHtml(body);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ShapeMint <noreply@shapemint.com>',
        to: [email],
        subject: 'Your 3D Model is Ready! — ShapeMint',
        html,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', JSON.stringify(resData));
      // Non-critical — return 200 even on failure
      return new Response(
        JSON.stringify({ success: false, error: 'Email send failed', details: resData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Model-ready email sent successfully:', resData.id);
    return new Response(
      JSON.stringify({ success: true, emailId: resData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Email send error:', error);
    // Non-critical — return 200 even on failure
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
