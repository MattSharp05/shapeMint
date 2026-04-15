// Phase 4: Merge an anonymous user's work into an existing real account.
//
// Called when the user types an email during anon-to-real conversion that
// already belongs to a real account. The client:
//   1. Remembers the current anon user_id.
//   2. Signs out the anon session and signs in as the real user.
//   3. Calls this function with { oldAnonUserId }.
//
// This function (running as service role):
//   - Verifies the caller is a real (non-anonymous) authenticated user.
//   - Verifies oldAnonUserId actually belongs to an anonymous user.
//   - Reassigns every generated_models row (and any other FK tables) from
//     the anon user to the caller.
//   - Deletes the anonymous auth user.
//
// Returns the number of rows reassigned.

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response>): void;
};

interface JwtClaims {
  sub?: string;
  is_anonymous?: boolean;
  email?: string;
}

function parseJwt(authHeader: string | null): JwtClaims | null {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'server_misconfigured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const claims = parseJwt(req.headers.get('Authorization'));
  if (!claims?.sub) {
    return new Response(
      JSON.stringify({ error: 'unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  if (claims.is_anonymous) {
    return new Response(
      JSON.stringify({ error: 'caller_must_be_real_user' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const realUserId = claims.sub;

  let body: { oldAnonUserId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const oldAnonUserId = body?.oldAnonUserId?.trim();
  if (!oldAnonUserId) {
    return new Response(
      JSON.stringify({ error: 'missing_oldAnonUserId' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  if (oldAnonUserId === realUserId) {
    return new Response(
      JSON.stringify({ error: 'cannot_merge_self' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Verify the old user actually exists AND is anonymous. This blocks an
  // attacker who somehow learned another real user's id from trying to
  // vacuum up their rows.
  const { data: oldUserResp, error: getErr } = await admin.auth.admin.getUserById(oldAnonUserId);
  if (getErr || !oldUserResp?.user) {
    return new Response(
      JSON.stringify({ error: 'old_user_not_found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  if (oldUserResp.user.is_anonymous !== true) {
    return new Response(
      JSON.stringify({ error: 'old_user_not_anonymous' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Reassign rows. Keep this list in sync with any future FK tables that
  // carry user_id for anon-authored work.
  //
  // IMPORTANT: all reassignments must happen BEFORE deleting the public.users
  // row, because these tables CASCADE on users.id delete.
  const { count: modelsMoved, error: modelsErr } = await admin
    .from('generated_models')
    .update({ user_id: realUserId }, { count: 'exact' })
    .eq('user_id', oldAnonUserId);

  if (modelsErr) {
    console.error('generated_models reassign failed:', modelsErr);
    return new Response(
      JSON.stringify({ error: 'reassign_failed', message: modelsErr.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Cart items: anon users can add to cart before converting to a real
  // account. If the real account already has an entry for the same
  // (model_id, print_type) pair, we can't simply UPDATE (unique constraint
  // would collide) — so we merge by summing quantities on conflict.
  const { data: anonCart } = await admin
    .from('cart_items')
    .select('*')
    .eq('user_id', oldAnonUserId);

  let cartMoved = 0;
  for (const row of anonCart || []) {
    const { data: existing } = await admin
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', realUserId)
      .eq('model_id', row.model_id)
      .eq('print_type', row.print_type)
      .maybeSingle();

    if (existing) {
      await admin
        .from('cart_items')
        .update({ quantity: existing.quantity + row.quantity })
        .eq('id', existing.id);
      await admin.from('cart_items').delete().eq('id', row.id);
    } else {
      await admin.from('cart_items').update({ user_id: realUserId }).eq('id', row.id);
    }
    cartMoved++;
  }

  // Addresses: anon users generally won't have any (AccountModal is gated
  // to real users), but reassign defensively so the flow stays correct if
  // that changes.
  await admin
    .from('user_addresses')
    .update({ user_id: realUserId })
    .eq('user_id', oldAnonUserId);

  // Remove the now-empty public.users row (if any) that CASCADEs from
  // the FK. Not strictly required — deleteUser below cascades via
  // on_auth_user_deleted, but being explicit here keeps the admin view
  // clean if that trigger isn't configured.
  await admin.from('users').delete().eq('id', oldAnonUserId);

  // Delete the anonymous auth user. CASCADEs any remaining FK rows.
  const { error: delErr } = await admin.auth.admin.deleteUser(oldAnonUserId);
  if (delErr) {
    console.error('auth.admin.deleteUser failed:', delErr);
    // Rows are already moved at this point — don't 500. Log and succeed.
  }

  return new Response(
    JSON.stringify({
      success: true,
      modelsMoved: modelsMoved ?? 0,
      cartMoved,
      oldAnonUserId,
      newUserId: realUserId,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
