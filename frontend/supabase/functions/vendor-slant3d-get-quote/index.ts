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

interface QuoteInput {
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

    console.log('Environment check:', {
      hasApiKey: !!apiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasPlatformId: !!platformId
    });

    if (!apiKey || !supabaseUrl || !supabaseServiceKey || !platformId) {
      const missing = [];
      if (!apiKey) missing.push('SLANT3D_API_KEY');
      if (!supabaseUrl) missing.push('SUPABASE_URL');
      if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      if (!platformId) missing.push('SLANT3D_PLATFORM_ID');
      console.error('Missing environment variables:', missing);
      return new Response(
        JSON.stringify({ 
          error: 'Missing required environment variables', 
          message: `Please set the following environment variables in Supabase Edge Functions settings: ${missing.join(', ')}`,
          details: { missing },
          help: 'SLANT3D_PLATFORM_ID is the UUID of your Slant3D Platform. Create a platform in your Slant3D account dashboard and copy the Platform ID.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: QuoteInput = await req.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    const { model, filamentId, quantity, shippingAddress } = body;

    // Validate input with detailed error messages
    if (!model || (typeof model !== 'object' || (!('url' in model) && !('storagePath' in model)))) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: model.url or model.storagePath required', details: { received: model } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!filamentId || typeof filamentId !== 'string' || filamentId.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: filamentId is required and must be a non-empty string', details: { received: filamentId } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!quantity || typeof quantity !== 'number' || quantity <= 0 || quantity > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: quantity must be a number between 1 and 100', details: { received: quantity } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shippingAddress) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: shippingAddress is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requiredFields = ['firstName', 'lastName', 'email', 'address1', 'city', 'state', 'zipCode', 'country', 'phone'];
    const missingFields = requiredFields.filter(field => !shippingAddress[field as keyof typeof shippingAddress]);
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: missing required shipping address fields', details: { missingFields } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If filamentId doesn't look like a UUID, try to fetch filaments and find matching one
    // Slant3D publicIds are UUIDs, so if it's not a UUID, it might be our internal ID
    let actualFilamentId = filamentId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(filamentId)) {
      console.log('FilamentId does not look like a UUID, fetching available filaments to find match...');
      try {
        console.log(`Fetching filaments from: ${SLANT3D_API}/filaments`);
        const filamentsResponse = await fetchWithTimeout(`${SLANT3D_API}/filaments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeoutMs: 10000
        });

        console.log(`Filaments API response status: ${filamentsResponse.status} ${filamentsResponse.statusText}`);
        
        const responseText = await filamentsResponse.text();
        console.log(`Filaments API response body:`, responseText.substring(0, 500));

        if (filamentsResponse.ok) {
          let filaments;
          try {
            filaments = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse filaments response as JSON:', parseError);
            return new Response(
              JSON.stringify({ 
                error: 'Invalid response format from Slant3D filaments API',
                details: { responseText: responseText.substring(0, 200) }
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Handle case where response might be wrapped in an object
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

          console.log(`Fetched ${filaments?.length || 0} filaments from Slant3D`);
          
          if (Array.isArray(filaments) && filaments.length > 0) {
            // Log available filaments for debugging
            const availableFilaments = filaments.filter((f: any) => f.available && f.public);
            console.log(`Found ${availableFilaments.length} available public filaments:`, 
              availableFilaments.map((f: any) => `${f.name} (${f.profile}/${f.color}) - ${f.publicId}`).join(', '));

            // Try to match by internal ID pattern (e.g., "petg-white" -> PETG WHITE)
            // Map common patterns: pla-black, pla-white, petg-black, petg-white
            const idLower = filamentId.toLowerCase();
            let matchedFilament: any = null;

            // Try exact name match first (e.g., "petg-white" -> "PETG WHITE")
            const namePattern = idLower.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            console.log(`Trying exact name match: "${namePattern}"`);
            matchedFilament = filaments.find((f: any) => 
              f.available && 
              f.public &&
              f.name.toUpperCase() === namePattern.toUpperCase()
            );

            // Try profile + color match (e.g., "petg-white" -> profile: PETG, color contains "white")
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

            // Fallback to first available filament
            if (!matchedFilament) {
              matchedFilament = filaments.find((f: any) => f.available && f.public) || filaments[0];
              if (matchedFilament) {
                console.log(`⚠️ Could not find exact match for "${filamentId}", using first available: ${matchedFilament.name} (${matchedFilament.publicId})`);
              }
            } else {
              console.log(`✅ Mapped internal ID "${filamentId}" to Slant3D filament "${matchedFilament.name}" (${matchedFilament.publicId})`);
            }

            if (!matchedFilament) {
              return new Response(
                JSON.stringify({ 
                  error: 'No matching filament found and no fallback available',
                  details: { requestedId: filamentId, availableFilaments: filaments.length }
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            actualFilamentId = matchedFilament.publicId;
          } else {
            console.error(`No filaments found. Response was: ${JSON.stringify(filaments)}`);
            return new Response(
              JSON.stringify({ 
                error: 'No filaments available from Slant3D API',
                message: 'Your Slant3D account may not have any filaments configured, or your API key may not have access. Please contact Slant3D support or check your account settings.',
                details: { 
                  receivedFilaments: filaments,
                  responseLength: Array.isArray(filaments) ? filaments.length : 'not an array',
                  responseType: typeof filaments
                }
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          console.error(`Filaments API returned error: ${filamentsResponse.status} ${filamentsResponse.statusText}`);
          console.error('Response body:', responseText);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to fetch available filaments from Slant3D',
              message: `Slant3D API returned ${filamentsResponse.status}: ${filamentsResponse.statusText}`,
              details: responseText.substring(0, 500)
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

    // Get model URL - prefer STL if available since Slant3D only accepts STL
    let modelUrl: string;
    let fileExtension = '';
    
    if ('url' in model) {
      modelUrl = model.url;
      fileExtension = modelUrl.split('.').pop()?.split('?')[0].toLowerCase() || '';
      console.log('Using provided model URL:', modelUrl.substring(0, 100) + '...', `(extension: ${fileExtension})`);
      
      // Check if it's a GLB file - Slant3D only accepts STL
      if (fileExtension === 'glb' || fileExtension === 'obj') {
        console.warn(`⚠️ Warning: Model URL is ${fileExtension.toUpperCase()}, but Slant3D only accepts STL files. The upload may fail.`);
        // Try to find STL URL from the model data if available
        // For now, we'll proceed but the upload will likely fail
      }
    } else if ('storagePath' in model) {
      console.log('Creating signed URL for storage path:', model.storagePath);
      const { data } = await supabase.storage.from('models').createSignedUrl(model.storagePath, 3600);
      if (!data?.signedUrl) throw new Error('Failed to create signed URL');
      modelUrl = data.signedUrl;
      fileExtension = model.storagePath.split('.').pop()?.toLowerCase() || '';
      console.log('Created signed URL:', modelUrl.substring(0, 100) + '...', `(extension: ${fileExtension})`);
    } else {
      throw new Error('Invalid model input');
    }
    
    // Warn if not STL
    if (fileExtension !== 'stl') {
      console.warn(`⚠️ File format is ${fileExtension.toUpperCase()}, but Slant3D requires STL. Upload may fail.`);
    }

    // Check if file is already uploaded to Slant3D (cache lookup)
    const fileName = modelUrl.split('/').pop()?.split('?')[0] || 'model.stl';
    console.log('Checking cache for file:', fileName);
    const { data: cachedFile } = await supabase
      .from('slant3d_files_cache')
      .select('public_file_service_id')
      .eq('model_url', modelUrl)
      .maybeSingle();

    let publicFileServiceId: string;

    if (cachedFile?.public_file_service_id) {
      console.log('Using cached Slant3D file:', cachedFile.public_file_service_id);
      publicFileServiceId = cachedFile.public_file_service_id;
    } else {
      // Upload file to Slant3D
      console.log('Uploading file to Slant3D...');
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
        console.error('Slant3D upload error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to upload file to Slant3D', details: errorText }),
          { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fileData = await uploadResponse.json();
      console.log('File upload response:', JSON.stringify(fileData, null, 2));
      
      // Slant3D API returns nested structure: { success, message, data: { publicFileServiceId, ... } }
      if (fileData.data && fileData.data.publicFileServiceId) {
        publicFileServiceId = fileData.data.publicFileServiceId;
      } else if (fileData.publicFileServiceId) {
        // Fallback for direct structure
        publicFileServiceId = fileData.publicFileServiceId;
      } else {
        console.error('Upload succeeded but no publicFileServiceId returned:', fileData);
        return new Response(
          JSON.stringify({ 
            error: 'File upload succeeded but no file ID returned',
            message: 'Slant3D API response structure unexpected',
            details: fileData
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ File uploaded successfully, publicFileServiceId:', publicFileServiceId);

      // Wait a bit for file processing (Slant3D processes files asynchronously)
      // Check file status before proceeding to estimate
      console.log('Waiting for file to be processed by Slant3D...');
      let fileReady = false;
      let attempts = 0;
      const maxAttempts = 10;
      const waitMs = 2000; // 2 seconds between checks
      
      while (!fileReady && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
        attempts++;
        
        try {
          const fileStatusResponse = await fetchWithTimeout(`${SLANT3D_API}/files/${publicFileServiceId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeoutMs: 5000
          });
          
          if (fileStatusResponse.ok) {
            const fileStatus = await fileStatusResponse.json();
            console.log(`File status check ${attempts}/${maxAttempts}:`, fileStatus);
            
            // Check if file has STLMetrics (indicates processing is complete)
            if (fileStatus.STLMetrics) {
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
        console.warn('⚠️ File may not be fully processed yet, proceeding with estimate anyway...');
      }

      // Cache the file
      try {
        await supabase.from('slant3d_files_cache').insert({
          model_url: modelUrl,
          public_file_service_id: publicFileServiceId,
          created_at: new Date().toISOString()
        });
      } catch (cacheError) {
        console.warn('Failed to cache file (non-critical):', cacheError);
      }
    }

    console.log(`Getting price estimate for file ${publicFileServiceId} with filament ${actualFilamentId}, quantity ${quantity}`);
    
    // Get price estimate
    const estimateBody = {
      options: {
        filamentId: actualFilamentId,
        quantity: quantity
      }
    };
    console.log('Estimate request body:', JSON.stringify(estimateBody, null, 2));
    
    const estimateResponse = await fetchWithTimeout(`${SLANT3D_API}/files/${publicFileServiceId}/estimate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(estimateBody),
      timeoutMs: 30000
    });

    console.log(`Estimate API response status: ${estimateResponse.status} ${estimateResponse.statusText}`);

    if (!estimateResponse.ok) {
      const errorText = await estimateResponse.text();
      console.error('Slant3D estimate error:', errorText);
      console.error('Estimate request details:', {
        url: `${SLANT3D_API}/files/${publicFileServiceId}/estimate`,
        method: 'POST',
        body: estimateBody,
        status: estimateResponse.status,
        statusText: estimateResponse.statusText
      });
      
      // Check if it's a file format issue
      if (errorText.includes('STL') || errorText.includes('format') || errorText.includes('file')) {
        return new Response(
          JSON.stringify({ 
            error: 'File format error',
            message: 'Slant3D only accepts STL files. The uploaded file may be in GLB or another format. Please ensure your model is in STL format.',
            details: errorText
          }),
          { status: estimateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get price estimate',
          message: `Slant3D API returned ${estimateResponse.status}: ${estimateResponse.statusText}`,
          details: errorText
        }),
        { status: estimateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let estimateData = await estimateResponse.json();
    console.log('Estimate data received:', JSON.stringify(estimateData, null, 2));
    
    // Handle nested response structure if present
    if (estimateData.data) {
      estimateData = estimateData.data;
    }
    
    // Log the parsed estimate values
    console.log('Parsed estimate values:', {
      total: estimateData.total,
      price: estimateData.price,
      cost: estimateData.cost,
      printingCost: estimateData.printingCost,
      raw: estimateData
    });

    // Draft order to get shipping costs
    // Note: This requires billing to be set up on the account OR a valid platform customer
    // If billing isn't set up, we'll skip this and return estimate only
    console.log('Drafting order to get shipping costs...');
    const draftOrderBody = {
      customer: {
        platformId: platformId, // Required: platform ID in customer object
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
          publicFileServiceId: publicFileServiceId,
          filamentId: actualFilamentId,
          quantity: quantity
        }
      ]
    };
    
    const draftOrderResponse = await fetchWithTimeout(`${SLANT3D_API}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftOrderBody),
      timeoutMs: 30000
    });

    if (!draftOrderResponse.ok) {
      const errorText = await draftOrderResponse.text();
      console.error('Slant3D draft order error:', errorText);
      // If draft fails, return estimate without shipping
      // Try multiple possible field names for the estimate price
      const itemPrice = estimateData.total || 
                       estimateData.price || 
                       estimateData.cost || 
                       estimateData.printingCost || 
                       (estimateData.estimate && estimateData.estimate.total) ||
                       0;
      
      console.log('Draft order failed, returning estimate only. Item price:', itemPrice);
      
      return new Response(
        JSON.stringify({
          quoteId: `estimate_${Date.now()}`,
          priceTotal: itemPrice,
          currency: 'USD',
          itemTotal: itemPrice,
          shippingTotal: 0,
          publicFileServiceId: publicFileServiceId,
          note: 'Shipping cost unavailable - billing not configured on Slant3D account'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let draftOrderData = await draftOrderResponse.json();
    console.log('Draft order data received:', JSON.stringify(draftOrderData, null, 2));
    
    // Handle nested response structure if present
    if (draftOrderData.data) {
      draftOrderData = draftOrderData.data;
    }
    
    // Try multiple possible field names for prices
    const itemPrice = draftOrderData.subtotal || 
                     estimateData.total || 
                     estimateData.price || 
                     estimateData.cost || 
                     0;
    const shippingPrice = draftOrderData.shipping || 
                         draftOrderData.shippingCost || 
                         0;
    const totalPrice = draftOrderData.total || 
                      (itemPrice + shippingPrice);

    return new Response(
      JSON.stringify({
        quoteId: draftOrderData.publicId || draftOrderData.id || `estimate_${Date.now()}`,
        priceTotal: totalPrice,
        currency: 'USD',
        itemTotal: itemPrice,
        shippingTotal: shippingPrice,
        publicFileServiceId: publicFileServiceId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error getting Slant3D quote:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
