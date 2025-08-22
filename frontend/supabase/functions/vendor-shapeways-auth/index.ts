// deno-lint-ignore-file no-explicit-any
// Ambient declaration to satisfy TypeScript in non-Deno tooling context
// (Supabase edge runtime provides Deno global at runtime)
declare const Deno: any;
import { corsHeaders } from '../_shared/cors.ts';

interface TokenResponse { access_token: string; token_type: string; expires_in: number; }

let cachedToken: { token: string; expiresAt: number } | null = null;

async function fetchToken(): Promise<TokenResponse> {
  const clientId = Deno.env.get('SHAPEWAYS_CLIENT_ID');
  const clientSecret = Deno.env.get('SHAPEWAYS_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Missing Shapeways credentials');

  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
  const resp = await fetch('https://api.shapeways.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token fetch failed ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt - 30000) { // 30s early refresh buffer
    return cachedToken.token;
  }
  const data = await fetchToken();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const token = await getToken();
    return new Response(JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 3600 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error(JSON.stringify({ evt: 'auth_error', message: (e as Error).message }));
    return new Response(JSON.stringify({ error: 'token_fetch_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
