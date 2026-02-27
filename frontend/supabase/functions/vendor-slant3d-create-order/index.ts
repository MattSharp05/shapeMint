// deno-lint-ignore-file no-explicit-any
declare const Deno: any;
// Inline cors headers for dashboard deployment compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SLANT3D_API = 'https://slant3dapi.com/v2/api';

interface CreateOrderInput {
  model: { url: string } | { storagePath: string };
  filamentId: string;
  quantity: number;
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  };
  priorQuote?: {
    itemTotal: number;
    shippingTotal: number;
    total: number;
  };
  quoteId?: string;
  publicFileServiceId?: string;
}

async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 30000, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('SLANT3D_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const platformId = Deno.env.get('SLANT3D_PLATFORM_ID');

    if (!apiKey || !supabaseUrl || !supabaseServiceKey || !platformId) {
      const missing = [];
      if (!apiKey) missing.push('SLANT3D_API_KEY');
      if (!supabaseUrl) missing.push('SUPABASE_URL');
      if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      if (!platformId) missing.push('SLANT3D_PLATFORM_ID');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required environment variables',
          message: `Please set: ${missing.join(', ')}`,
          details: { missing }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreateOrderInput = await req.json();
    const { model, filamentId, quantity, shippingAddress, priorQuote, quoteId, publicFileServiceId } = body;

    console.log('Received create order request:', JSON.stringify({ filamentId, quantity, hasModel: !!model, hasShippingAddress: !!shippingAddress }, null, 2));

    // If filamentId doesn't look like a UUID, try to fetch filaments and find matching one
    let actualFilamentId = filamentId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUUID = uuidRegex.test(filamentId);
    console.log(`Filament ID check: "${filamentId}" is ${isUUID ? 'a valid UUID' : 'NOT a UUID'}`);
    
    if (!isUUID) {
      console.log('FilamentId does not look like a UUID, fetching available filaments to map...');
      try {
        const filamentsResponse = await fetchWithTimeout(`${SLANT3D_API}/filaments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeoutMs: 10000
        });

        if (filamentsResponse.ok) {
          const responseText = await filamentsResponse.text();
          console.log(`Filaments API response (first 500 chars):`, responseText.substring(0, 500));
          
          let filaments;
          try {
            filaments = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse filaments response:', parseError);
            return new Response(
              JSON.stringify({ 
                error: 'Invalid response format from Slant3D filaments API',
                details: { responseText: responseText.substring(0, 200) }
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Handle nested response structure if present
          if (!Array.isArray(filaments)) {
            if (filaments.filaments && Array.isArray(filaments.filaments)) {
              filaments = filaments.filaments;
            } else if (filaments.data && Array.isArray(filaments.data)) {
              filaments = filaments.data;
            } else {
              console.warn('Unexpected filaments response format:', Object.keys(filaments));
              filaments = [];
            }
          }
          
          console.log(`Fetched ${filaments?.length || 0} filaments for mapping`);
          
          if (Array.isArray(filaments) && filaments.length > 0) {
            // Log available filaments for debugging
            const availableFilaments = filaments.filter((f: any) => f.available && f.public);
            console.log(`Found ${availableFilaments.length} available public filaments:`, 
              availableFilaments.map((f: any) => `${f.name} (${f.profile}/${f.color}) - ${f.publicId}`).join(', '));

            // Try to match by internal ID pattern
            const idLower = filamentId.toLowerCase();
            let matchedFilament: any = null;

            // Try exact name match first
            const namePattern = idLower.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            console.log(`Trying exact name match: "${namePattern}"`);
            matchedFilament = filaments.find((f: any) => 
              f.available && 
              f.public &&
              f.name.toUpperCase() === namePattern.toUpperCase()
            );

            // Try profile + color match
            if (!matchedFilament) {
              const parts = idLower.split('-');
              if (parts.length >= 2) {
                const profile = parts[0].toUpperCase();
                const color = parts.slice(1).join(' ');
                console.log(`Trying profile+color match: profile="${profile}", color="${color}"`);
                matchedFilament = filaments.find((f: any) => 
                  f.available && 
                  f.public &&
                  f.profile?.toUpperCase() === profile &&
                  f.color?.toLowerCase().includes(color)
                );
              }
            }

            // Fallback to first available
            if (!matchedFilament) {
              matchedFilament = filaments.find((f: any) => f.available && f.public) || filaments[0];
              if (matchedFilament) {
                console.log(`⚠️ Could not find exact match for "${filamentId}", using first available: ${matchedFilament.name}`);
              }
            } else {
              console.log(`✅ Mapped internal ID "${filamentId}" to Slant3D filament "${matchedFilament.name}" (${matchedFilament.publicId})`);
            }

            if (!matchedFilament) {
              return new Response(
                JSON.stringify({ 
                  error: 'No matching filament found',
                  message: `Could not map filament ID "${filamentId}" to a valid Slant3D filament`,
                  details: { requestedId: filamentId, availableFilaments: filaments.length }
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            actualFilamentId = matchedFilament.publicId;
          } else {
            return new Response(
              JSON.stringify({ 
                error: 'No filaments available',
                message: 'No filaments returned from Slant3D API'
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          const errorText = await filamentsResponse.text();
          console.error(`Filaments API returned error: ${filamentsResponse.status} ${filamentsResponse.statusText}`);
          console.error('Response body:', errorText);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to fetch filaments for mapping',
              message: `Slant3D API returned ${filamentsResponse.status}: ${filamentsResponse.statusText}`,
              details: errorText.substring(0, 500)
            }),
            { status: filamentsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (err: any) {
        console.error('Error fetching filaments for mapping:', err);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch filaments for mapping',
            details: err.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    console.log(`Using filament ID: ${actualFilamentId} (original: ${filamentId})`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Get publicFileServiceId if not provided
    let fileServiceId = publicFileServiceId;
    if (!fileServiceId) {
      // Get model URL
      let modelUrl: string;
      if ('url' in model) {
        modelUrl = model.url;
      } else if ('storagePath' in model) {
        const { data } = await supabase.storage.from('models').createSignedUrl(model.storagePath, 3600);
        if (!data?.signedUrl) throw new Error('Failed to create signed URL');
        modelUrl = data.signedUrl;
      } else {
        throw new Error('Invalid model input');
      }

      // Check cache
      const { data: cachedFile } = await supabase
        .from('slant3d_files_cache')
        .select('public_file_service_id')
        .eq('model_url', modelUrl)
        .maybeSingle();

      if (cachedFile?.public_file_service_id) {
        fileServiceId = cachedFile.public_file_service_id;
      } else {
        // Upload file
        const fileName = modelUrl.split('/').pop()?.split('?')[0] || 'model.stl';
        const uploadResponse = await fetchWithTimeout(`${SLANT3D_API}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            URL: modelUrl,
            name: fileName.replace(/\.(stl|glb|obj)$/i, ''),
            platformId: platformId,
            type: 'stl'
          }),
          timeoutMs: 60000
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Failed to upload file: ${errorText}`);
        }

        const fileData = await uploadResponse.json();
        console.log('File upload response:', JSON.stringify(fileData, null, 2));
        
        // Handle nested response structure (same as get-quote)
        if (fileData.data && fileData.data.publicFileServiceId) {
          fileServiceId = fileData.data.publicFileServiceId;
        } else if (fileData.publicFileServiceId) {
          fileServiceId = fileData.publicFileServiceId;
        } else {
          throw new Error(`File upload succeeded but no publicFileServiceId returned: ${JSON.stringify(fileData)}`);
        }
        
        console.log('✅ File uploaded, publicFileServiceId:', fileServiceId);

        // Wait for file processing (Slant3D processes files asynchronously)
        console.log('Waiting for file to be processed by Slant3D...');
        let fileReady = false;
        let attempts = 0;
        const maxAttempts = 10;
        const waitMs = 2000; // 2 seconds between checks
        
        while (!fileReady && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, waitMs));
          attempts++;
          
          try {
            const fileStatusResponse = await fetchWithTimeout(`${SLANT3D_API}/files/${fileServiceId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              timeoutMs: 5000
            });
            
            if (fileStatusResponse.ok) {
              const fileStatus = await fileStatusResponse.json();
              const fileData = fileStatus.data || fileStatus;
              
              // Check if file has STLMetrics (indicates processing is complete)
              if (fileData.STLMetrics) {
                fileReady = true;
                console.log('✅ File processing complete, STLMetrics available');
              } else {
                console.log(`⏳ File still processing (attempt ${attempts}/${maxAttempts})...`);
              }
            } else {
              console.warn(`File status check failed: ${fileStatusResponse.status}`);
            }
          } catch (statusError) {
            console.warn(`Error checking file status:`, statusError);
          }
        }
        
        if (!fileReady) {
          console.warn('⚠️ File may not be fully processed yet, proceeding with order anyway...');
        }

        // Cache
        try {
          await supabase.from('slant3d_files_cache').insert({
            model_url: modelUrl,
            public_file_service_id: fileServiceId,
            created_at: new Date().toISOString()
          });
        } catch (cacheError) {
          console.warn('Failed to cache file (non-critical):', cacheError);
        }
      }
    }

    // Draft order first
    console.log(`🔧 Creating draft order with: fileServiceId=${fileServiceId}, filamentId=${actualFilamentId}, quantity=${quantity}`);
    
    const draftOrderBody = {
      customer: {
        platformId: platformId,
        details: {
          email: shippingAddress.email,
          address: {
            name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
            line1: shippingAddress.address1,
            line2: shippingAddress.address2 || '',
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.zipCode,
            country: shippingAddress.country
          }
        }
      },
      items: [
        {
          type: 'PRINT',
          publicFileServiceId: fileServiceId,
          filamentId: actualFilamentId, // Use the mapped UUID
          quantity: quantity
        }
      ]
    };
    
    console.log('📦 Drafting order with body:', JSON.stringify(draftOrderBody, null, 2));
    console.log(`✅ Using mapped filament ID: ${actualFilamentId} (was: ${filamentId})`);
    
    const draftResponse = await fetchWithTimeout(`${SLANT3D_API}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftOrderBody),
      timeoutMs: 30000
    });

    console.log(`Draft order response status: ${draftResponse.status} ${draftResponse.statusText}`);

    if (!draftResponse.ok) {
      const errorText = await draftResponse.text();
      console.error('Slant3D draft order error:', errorText);
      console.error('Draft order request details:', {
        url: `${SLANT3D_API}/orders`,
        method: 'POST',
        body: draftOrderBody,
        status: draftResponse.status,
        statusText: draftResponse.statusText
      });
      
      // Check for specific error types
      if (errorText.includes('price determination') || errorText.includes('price')) {
        return new Response(
          JSON.stringify({ 
            error: 'price_determination_error',
            message: 'Slant3D could not determine the order price. This may be due to file processing not being complete, invalid filament ID, or missing billing information.',
            details: errorText
          }),
          { status: draftResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to draft order', details: errorText }),
        { status: draftResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let draftData = await draftResponse.json();
    console.log('Draft order data received:', JSON.stringify(draftData, null, 2));
    
    // Handle nested response structure: { success, message, data: { order: { publicId, ... }, totals: {...}, ... } }
    let orderData = draftData;
    if (draftData.data) {
      orderData = draftData.data;
    }
    
    // Extract publicId from nested structure: data.order.publicId
    // The structure is: { order: { publicId: "SLANT_...", ... }, totals: {...}, items: [...], customer: {...} }
    let publicOrderId: string | undefined;
    
    // Try multiple extraction paths
    if (orderData.order && orderData.order.publicId) {
      publicOrderId = orderData.order.publicId;
    } else if (orderData.publicId) {
      publicOrderId = orderData.publicId;
    } else if (orderData.order && orderData.order.id) {
      publicOrderId = orderData.order.id;
    } else if (draftData.publicId) {
      publicOrderId = draftData.publicId;
    } else if (draftData.id) {
      publicOrderId = draftData.id;
    }
    
    console.log('PublicId extraction attempt:', {
      'orderData.order?.publicId': orderData.order?.publicId,
      'orderData.publicId': orderData.publicId,
      'draftData.publicId': draftData.publicId,
      'final publicOrderId': publicOrderId
    });
    
    // Extract totals from nested structure
    const totals = orderData.totals || {};
    const printingCost = parseFloat(totals.printingCost || totals.printing || orderData.order?.printingCost || 0);
    const deliveryCost = parseFloat(totals.deliveryCost || totals.delivery || totals.shipping || orderData.order?.deliveryCost || 0);
    const totalCost = parseFloat(totals.totalCost || totals.total || (printingCost + deliveryCost) || 0);
    
    console.log('Extracted order data:', {
      publicOrderId,
      printingCost,
      deliveryCost,
      totalCost,
      orderDataKeys: Object.keys(orderData),
      hasOrder: !!orderData.order,
      orderKeys: orderData.order ? Object.keys(orderData.order) : []
    });
    
    if (!publicOrderId) {
      console.error('Draft order succeeded but no publicId returned. Structure:', {
        hasData: !!draftData.data,
        hasOrder: !!orderData.order,
        orderPublicId: orderData.order?.publicId,
        topLevelPublicId: draftData.publicId,
        allKeys: Object.keys(orderData)
      });
      return new Response(
        JSON.stringify({ 
          error: 'Draft order succeeded but no order ID returned',
          message: 'Could not extract publicId from Slant3D response',
          details: { structure: orderData }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Order drafted successfully, publicOrderId:', publicOrderId);

    // Check price if priorQuote provided and has a valid total
    // Use the extracted totalCost from the nested response
    if (priorQuote && priorQuote.total && priorQuote.total > 0) {
      const expectedTotal = priorQuote.total;
      
      console.log('Price check:', {
        draftTotalCost: totalCost,
        expectedTotal,
        difference: Math.abs(totalCost - expectedTotal)
      });
      
      // Allow small difference due to rounding (0.10 tolerance)
      if (Math.abs(totalCost - expectedTotal) > 0.10) {
        return new Response(
          JSON.stringify({ 
            error: 'price_changed', 
            message: `Price changed since quote. Expected: $${expectedTotal}, Got: $${totalCost}`,
            details: { expected: expectedTotal, actual: totalCost }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('No prior quote provided or quote total is 0, skipping price check');
    }

    // Process order (this charges payment)
    console.log(`🔄 Processing order ${publicOrderId} (this will charge payment)...`);
    console.log(`Process order URL: ${SLANT3D_API}/orders/${publicOrderId}`);
    
    const processResponse = await fetchWithTimeout(`${SLANT3D_API}/orders/${publicOrderId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      // Process order doesn't require a body - just POST to the endpoint
      timeoutMs: 30000
    });

    console.log(`Process order response status: ${processResponse.status} ${processResponse.statusText}`);
    
    // Clone the response so we can read it multiple times
    const responseClone = processResponse.clone();
    const responseText = await responseClone.text();
    console.log(`Process order response body (first 500 chars):`, responseText.substring(0, 500));

    if (!processResponse.ok) {
      console.error('Slant3D process order error:', responseText);
      console.error('Process order request details:', {
        url: `${SLANT3D_API}/orders/${publicOrderId}`,
        method: 'POST',
        status: processResponse.status,
        statusText: processResponse.statusText,
        responseBody: responseText.substring(0, 500)
      });
      
      // If processing fails, we still have a drafted order
      // Return a more helpful error message
      let errorMessage = `Failed to process order: ${processResponse.statusText}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Not JSON, use the text as-is
        if (responseText) {
          errorMessage = responseText.substring(0, 200);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'failed_to_process_order',
          message: errorMessage,
          details: {
            status: processResponse.status,
            statusText: processResponse.statusText,
            response: responseText.substring(0, 500),
            orderId: publicOrderId,
            note: 'Order was drafted but could not be processed. The order may need to be processed manually or there may be a payment issue.'
          }
        }),
        { status: processResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the response (we already read it, so parse from text)
    let processedOrderData;
    try {
      processedOrderData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse process order response as JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response format from Slant3D',
          details: { responseText: responseText.substring(0, 200) }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Process order response:', JSON.stringify(processedOrderData, null, 2));
    
    // Handle nested response structure if present
    if (processedOrderData.data) {
      processedOrderData = processedOrderData.data;
    }
    
    // Extract final order data (may be nested in order object)
    const finalOrderData = processedOrderData.order || processedOrderData;
    const finalTotal = parseFloat(finalOrderData.totalCost || finalOrderData.total || totalCost || 0);
    const finalSubtotal = parseFloat(finalOrderData.printingCost || finalOrderData.subtotal || printingCost || 0);
    const finalShipping = parseFloat(finalOrderData.deliveryCost || finalOrderData.shipping || finalOrderData.delivery || deliveryCost || 0);
    const finalStatus = finalOrderData.status || processedOrderData.status || 'submitted';

    // Save order to database
    const orderNumber = `SLANT-${Date.now()}`;
    const { data: inserted, error: insertError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        vendor: 'slant3d',
        status: 'submitted',
        total_price: finalTotal,
        currency: 'USD',
        quantity: quantity,
        material_id: filamentId,
        selections: { filamentId: actualFilamentId },
        shipping_address: shippingAddress,
        item_subtotal: finalSubtotal,
        shipping_price: finalShipping,
        surcharge_amount: 0,
        user_id: userId,
        vendor_order_id: publicOrderId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving order:', insertError);
      // Continue anyway - order was created with vendor
    }

    return new Response(
      JSON.stringify({
        orderId: inserted?.id || crypto.randomUUID(),
        orderNumber: orderNumber,
        vendorOrderId: publicOrderId,
        totalPrice: finalTotal,
        currency: 'USD',
        status: finalStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating Slant3D order:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
