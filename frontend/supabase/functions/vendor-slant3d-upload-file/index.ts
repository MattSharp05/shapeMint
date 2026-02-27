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

interface UploadFileInput {
  model: { url: string } | { storagePath: string };
  platformId: string;
  ownerId?: string;
  name?: string;
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

    const body: UploadFileInput = await req.json();
    const { model } = body;

    // Get model URL
    let modelUrl: string;
    if ('url' in model) {
      modelUrl = model.url;
    } else if ('storagePath' in model) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data } = await supabase.storage.from('models').createSignedUrl(model.storagePath, 3600);
      if (!data?.signedUrl) throw new Error('Failed to create signed URL');
      modelUrl = data.signedUrl;
    } else {
      throw new Error('Invalid model input');
    }

    const fileName = modelUrl.split('/').pop()?.split('?')[0] || 'model.stl';
    const ownerId = body.ownerId || 'anonymous';

    // Upload file using server upload method (pass URL)
    const uploadResponse = await fetchWithTimeout(`${SLANT3D_API}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        URL: modelUrl,
        name: body.name || fileName.replace(/\.(stl|glb|obj)$/i, ''),
        platformId: platformId,
        ownerId: ownerId,
        type: 'stl'
      }),
      timeoutMs: 60000 // 60 seconds for file upload
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Slant3D upload error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file', details: errorText }),
        { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileData = await uploadResponse.json();
    console.log('Upload response:', JSON.stringify(fileData, null, 2));
    
    // Slant3D API returns nested structure: { success, message, data: { publicFileServiceId, ... } }
    // Return the data object directly for consistency
    const responseData = fileData.data || fileData;
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error uploading file to Slant3D:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
