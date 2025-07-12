// supabase/functions/slant3d-order/index.ts
// Creates an order with Slant3D API

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SLANT3D_ORDER_URL = 'https://www.slant3dapi.com/api/order';

Deno.serve(async (req) => {
  try {
    console.log('=== SLANT3D ORDER FUNCTION ===');
    console.log('Method:', req.method);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { orderData, paymentInfo } = await req.json();
    
    if (!orderData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order data is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('=== ORDER DATA RECEIVED ===');
    console.log('Order Number:', orderData.orderNumber);
    console.log('File URL:', orderData.fileURL);
    console.log('Customer:', orderData.name);
    console.log('Email:', orderData.email);
    
    // Validate required fields
    const requiredFields = [
      'email', 'phone', 'name', 'orderNumber', 'filename', 'fileURL',
      'bill_to_street_1', 'bill_to_city', 'bill_to_state', 'bill_to_zip',
      'ship_to_name', 'ship_to_street_1', 'ship_to_city', 'ship_to_state', 
      'ship_to_zip', 'order_item_name', 'order_quantity', 'order_item_color'
    ];
    
    const missingFields = requiredFields.filter(field => !orderData[field]);
    
    if (missingFields.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Prepare order array (Slant3D expects an array of order items)
    const order = [orderData];
    
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
        status: slantResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const slantData = await slantResponse.json();
    console.log('✅ Slant3D Order Created:', slantData);
    
    // TODO: Store order in your database
    // You can add database storage logic here
    try {
      // Example: Store order in a 'orders' table
      const { data: dbOrder, error: dbError } = await supabase
        .from('orders')
        .insert({
          slant_order_id: slantData.orderId,
          order_number: orderData.orderNumber,
          customer_name: orderData.name,
          customer_email: orderData.email,
          file_url: orderData.fileURL,
          filename: orderData.filename,
          quantity: parseInt(orderData.order_quantity),
          color: orderData.order_item_color,
          profile: orderData.profile || 'PLA',
          total_amount: null, // You might want to calculate this
          status: 'created',
          created_at: new Date().toISOString(),
          order_data: orderData // Store full order data as JSON
        })
        .select()
        .single();
      
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
        orderId: slantData.orderId,
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
        message: 'Order created successfully'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
});