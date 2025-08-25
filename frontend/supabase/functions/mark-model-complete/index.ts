// supabase/functions/mark-model-complete/index.ts
// Minimal endpoint to safely mark a generated model as completed.
// Use this when frontend detects a model is stuck in 'processing' but has valid URLs after X minutes.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Inline CORS headers (same pattern used elsewhere)
const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
  "Content-Type": "application/json"
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Supabase env vars" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });

    const body = await req.json().catch(() => ({}));
    const { taskId, glb_url, obj_url, note } = body as {
      taskId?: string;
      glb_url?: string | null;
      obj_url?: string | null;
      note?: string | null;
    };

    if (!taskId) {
      return new Response(
        JSON.stringify({ success: false, error: "taskId is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch current record
    const { data: model, error: fetchErr } = await supabase
      .from("generated_models")
      .select("id, status, glb_url, obj_url")
      .eq("id", taskId)
      .single();

    if (fetchErr) {
      return new Response(
        JSON.stringify({ success: false, error: fetchErr.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!model) {
      return new Response(
        JSON.stringify({ success: false, error: "Model not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // The primary purpose of this function is now to return the final model data.
    // The update logic in `check-model-status` should have already marked it complete.
    // This function acts as the final confirmation and data fetcher.

    // If the model isn't marked as 'completed' yet, we can do it here as a fallback.
    if (model.status !== 'completed') {
      const { error: updateErr } = await supabase
        .from('generated_models')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (updateErr) {
        // Log the error but don't fail the request, still try to return the data
        console.error(`Fallback update failed for ${taskId}:`, updateErr.message);
      }
    }

    // Re-fetch the model to ensure we have the absolute latest data
    const { data: finalModel, error: finalFetchErr } = await supabase
      .from('generated_models')
      .select('*') // Select all columns for the frontend
      .eq('id', taskId)
      .single();

    if (finalFetchErr) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch final model: ${finalFetchErr.message}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Return the full, final model object to the client
    return new Response(
      JSON.stringify({ success: true, data: finalModel }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "Unknown error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
