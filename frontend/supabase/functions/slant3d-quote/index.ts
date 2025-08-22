// supabase/functions/slant3d-quote/index.ts
// Gets a quote from Slant3D API
const SLANT3D_QUOTE_URL = 'https://www.slant3dapi.com/api/order/estimate';
Deno.serve(async (req)=>{
  try {
    console.log('=== SLANT3D QUOTE FUNCTION ===');
    console.log('Method:', req.method);
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey'
    };
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: true,
        message: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get environment variables
    const slantApiKey = Deno.env.get('SLANT3D_API_KEY');
    if (!slantApiKey) {
      return new Response(JSON.stringify({
        error: true,
        message: 'SLANT3D_API_KEY environment variable is not set'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Parse request body
    const { orderData } = await req.json();
    if (!orderData) {
      return new Response(JSON.stringify({
        error: true,
        message: 'orderData is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('🔍 Starting quote request...');
    console.log('📦 Order data received:', {
      fileURL: orderData?.fileURL,
      email: orderData?.email,
      hasRequiredFields: !!(orderData?.fileURL && orderData?.email)
    });
    console.log('🔑 API Key available:', !!slantApiKey);
    console.log('🔑 API Key preview:', slantApiKey ? `${slantApiKey.substring(0, 10)}...` : 'MISSING');
    // Validate critical fields before sending
    const criticalFields = [
      'fileURL',
      'email',
      'name',
      'phone'
    ];
    const missingCritical = criticalFields.filter((field)=>!orderData[field]);
    if (missingCritical.length > 0) {
      console.error('❌ Missing critical fields:', missingCritical);
      return new Response(JSON.stringify({
        error: true,
        message: `Missing critical fields: ${missingCritical.join(', ')}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('🌐 Making request to Slant3D API...');
    console.log('📝 Validated order data keys:', Object.keys(orderData));
    console.log('📝 File URL:', orderData.fileURL);
    console.log('📝 Email:', orderData.email);
    console.log('📝 Full request body:', JSON.stringify([
      orderData
    ], null, 2));
    // Call Slant3D order estimate API
    const response = await fetch(SLANT3D_QUOTE_URL, {
      method: 'POST',
      headers: {
        'api-key': slantApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        orderData
      ]) // Slant3D expects an array
    });
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
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
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
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    return new Response(JSON.stringify({
      error: false,
      data: quoteData
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
});