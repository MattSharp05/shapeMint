// deno-lint-ignore-file no-explicit-any
declare const Deno: any;
// Inline cors headers for dashboard deployment compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const SLANT3D_API = 'https://slant3dapi.com/v2/api';

async function fetchWithTimeout(resource: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 10000, ...rest } = options;
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
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'SLANT3D_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching filaments from: ${SLANT3D_API}/filaments`);
    const response = await fetchWithTimeout(`${SLANT3D_API}/filaments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeoutMs: 10000
    });

    console.log(`Filaments API response status: ${response.status} ${response.statusText}`);
    const responseText = await response.text();
    console.log(`Filaments API response body (first 500 chars):`, responseText.substring(0, 500));

    if (!response.ok) {
      console.error('Slant3D API error:', responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch filaments', 
          message: `Slant3D API returned ${response.status}: ${response.statusText}`,
          details: responseText.substring(0, 500)
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let filaments;
    try {
      filaments = JSON.parse(responseText);
      // Handle wrapped responses
      if (!Array.isArray(filaments)) {
        if (filaments.filaments && Array.isArray(filaments.filaments)) {
          filaments = filaments.filaments;
        } else if (filaments.data && Array.isArray(filaments.data)) {
          filaments = filaments.data;
        }
      }
      console.log(`Successfully parsed ${Array.isArray(filaments) ? filaments.length : 'non-array'} filaments`);
    } catch (parseError) {
      console.error('Failed to parse filaments response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response format from Slant3D API',
          details: { responseText: responseText.substring(0, 200) }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(filaments),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error fetching Slant3D filaments:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
