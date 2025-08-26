// supabase/functions/slant3d-order/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SLANT3D_ORDER_URL = 'https://www.slant3dapi.com/api/order';
// ✅ Fixed CORS headers - include all required headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  try {
    console.log('=== SLANT3D ORDER FUNCTION ===');
    console.log('Method:', req.method);
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders
      });
    }
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!slantApiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required environment variables'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // ✅ Extract user ID from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      try {
        // Create client with auth header to get user
        const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        });
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
        if (user && !authError) {
          userId = user.id;
          console.log('✅ User authenticated:', userId);
        } else {
          console.log('⚠️ Auth failed:', authError?.message);
        }
      } catch (authErr) {
        console.log('⚠️ Auth error:', authErr);
      }
    } else {
      console.log('⚠️ No auth header provided');
    }
    // Parse request body
    const { orderData, paymentInfo } = await req.json();
    if (!orderData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order data is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('=== ORDER DATA RECEIVED ===');
    console.log('Order Number:', orderData.orderNumber);
    console.log('File URL:', orderData.fileURL);
    console.log('Customer:', orderData.name);
    console.log('Email:', orderData.email);
    // Validate required fields
    const requiredFields = [
      'email',
      'phone',
      'name',
      'orderNumber',
      'filename',
      'fileURL',
      'bill_to_street_1',
      'bill_to_city',
      'bill_to_state',
      'bill_to_zip',
      'ship_to_name',
      'ship_to_street_1',
      'ship_to_city',
      'ship_to_state',
      'ship_to_zip',
      'order_item_name',
      'order_quantity',
      'order_item_color'
    ];
    const missingFields = requiredFields.filter((field)=>!orderData[field]);
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Prepare order array (Slant3D expects an array)
    const order = [
      orderData
    ];
    console.log('=== CALLING SLANT3D ORDER API ===');
    console.log('API URL:', SLANT3D_ORDER_URL);
    console.log('Order items:', order.length);
    // Make the API call to Slant3D
    const slantResponse = await fetch(SLANT3D_ORDER_URL, {
      method: 'POST',
      headers: {
        'api-key': slantApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    });
    console.log('=== SLANT3D API RESPONSE ===');
    console.log('Status:', slantResponse.status);
    console.log('Status Text:', slantResponse.statusText);
    if (!slantResponse.ok) {
      const errorText = await slantResponse.text();
      console.error('❌ Slant3D API Error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create order with Slant3D',
        details: errorText,
        status: slantResponse.status
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const slantData = await slantResponse.json();
    console.log('✅ Slant3D Order Created:', slantData);
    // Extract tracking information if available
    let trackingInfo = null;
    if (slantData.trackingNumbers && slantData.trackingNumbers.length > 0) {
      trackingInfo = {
        status: slantData.status || 'processing',
        trackingNumbers: slantData.trackingNumbers
      };
    } else if (slantData.tracking_number) {
      trackingInfo = {
        status: slantData.status || 'processing',
        trackingNumbers: [
          slantData.tracking_number
        ]
      };
    }
    // Store order in database
    try {
      const { data: dbOrder, error: dbError } = await supabase.from('orders').insert({
        slant_order_id: slantData.orderId || `slant_${Date.now()}`,
        order_number: orderData.orderNumber,
        customer_name: orderData.name,
        customer_email: orderData.email,
        file_url: orderData.fileURL,
        filename: orderData.filename,
        quantity: parseInt(orderData.order_quantity),
        color: orderData.order_item_color,
        profile: orderData.profile || 'PLA',
        status: 'created',
        order_data: orderData
      }).select().single();
      if (dbError) {
        console.error('⚠️ Database storage failed:', dbError);
      // Continue anyway - order was created successfully
      } else {
        console.log('✅ Order stored in database:', dbOrder?.id);
      }
    } catch (dbErr) {
      console.error('⚠️ Database error:', dbErr);
    // Continue anyway - order was created successfully
    }
    return new Response(JSON.stringify({
      success: true,
      data: {
        orderId: slantData.orderId || `demo_${Date.now()}`,
        customerName: orderData.name,
        customerEmail: orderData.email,
        filename: orderData.filename,
        quantity: orderData.order_quantity,
        color: orderData.order_item_color,
        material: orderData.profile || 'PLA',
        shippingAddress: {
          name: orderData.ship_to_name,
          street: orderData.ship_to_street_1,
          city: orderData.ship_to_city,
          state: orderData.ship_to_state,
          zip: orderData.ship_to_zip
        },
        trackingInfo: trackingInfo,
        message: 'Order created successfully'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Order function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});