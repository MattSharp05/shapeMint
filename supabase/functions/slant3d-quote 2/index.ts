import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Starting quote request...');
    
    const { orderData } = await req.json()
    console.log('📦 Order data received:', {
      fileURL: orderData?.fileURL,
      email: orderData?.email,
      hasRequiredFields: !!(orderData?.fileURL && orderData?.email)
    });

    if (!orderData) {
      throw new Error('orderData is required')
    }

    // Check API key availability
    const apiKey = Deno.env.get('SLANT3D_API_KEY');
    console.log('🔑 API Key available:', !!apiKey);
    console.log('🔑 API Key preview:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');

    if (!apiKey) {
      throw new Error('SLANT3D_API_KEY environment variable is not set');
    }

    console.log('🌐 Making request to Slant3D API...');
    console.log('📝 Request body:', JSON.stringify([orderData], null, 2));

    // Call Slant3D order estimate API
    const response = await fetch('https://www.slant3dapi.com/api/order/estimate', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([orderData])
    })

    console.log('📡 Slant3D API response status:', response.status);
    console.log('📡 Slant3D API response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 Raw response text:', responseText);

    if (!response.ok) {
      console.error('❌ Slant3D API error:', responseText);
      let errorDetails = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorDetails = errorJson.message || JSON.stringify(errorJson);
      } catch (parseError) {
        // leave errorDetails as responseText
      }
      return new Response(JSON.stringify({
        error: true,
        message: errorDetails
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let quoteData;
    try {
      quoteData = JSON.parse(responseText);
      console.log('✅ Slant3D API success:', quoteData);
    } catch (parseError) {
      console.error('❌ Could not parse success response as JSON:', parseError);
      return new Response(JSON.stringify({
        error: true,
        message: `Invalid JSON response from Slant3D API: ${responseText}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: false,
      data: quoteData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Edge Function Error:', error);
    return new Response(JSON.stringify({ 
      error: true, 
      message: error.message,
      details: error.toString(),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})