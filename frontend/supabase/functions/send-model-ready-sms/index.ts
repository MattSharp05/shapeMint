import { corsHeaders } from '../_shared/cors.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

interface SmsRequest {
  to: string;
  modelId: string;
  recipientName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured');
    }

    const { to, modelId, recipientName }: SmsRequest = await req.json();

    if (!to || !modelId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, modelId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number to E.164 format for US numbers
    let phone = to.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '1' + phone;
    }
    if (!phone.startsWith('+')) {
      phone = '+' + phone;
    }

    const name = recipientName || 'there';
    const modelUrl = `https://shapemint.dev/model/${modelId}`;
    const message = `Hey ${name}! Your ShapeMint 3D model is ready. View it and order a print here: ${modelUrl}`;

    // Twilio REST API - send SMS
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const body = new URLSearchParams({
      To: phone,
      From: TWILIO_PHONE_NUMBER,
      Body: message,
    });

    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error('Twilio API error:', JSON.stringify(resData));
      // Don't fail the whole flow — SMS is non-critical
      return new Response(
        JSON.stringify({ success: false, error: 'SMS send failed', details: resData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SMS sent successfully, SID:', resData.sid);

    return new Response(
      JSON.stringify({ success: true, messageSid: resData.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('SMS send error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
