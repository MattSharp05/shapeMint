// supabase/functions/publish-model/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { model_id, price, title, description, category, tags } = await req.json();

    if (!model_id || price === undefined || !title || !category) {
      return new Response(JSON.stringify({ error: 'Missing required fields: model_id, price, title, category' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get the user from the access token
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Use service_role to update the model, but verify ownership first
    const { data: model, error: selectError } = await supabase
      .from('generated_models')
      .select('id, user_id')
      .eq('id', model_id)
      .single();

    if (selectError || !model) {
      return new Response(JSON.stringify({ error: 'Model not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (model.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'You do not have permission to publish this model' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Now, update the model with all marketplace data
    const { data: updatedModel, error: updateError } = await supabase
      .from('generated_models')
      .update({
        is_marketplace_listed: true, // Use the correct column name
        price: price,
        name: title, // Map to the 'name' column
        prompt: description, // Map to the 'prompt' column for description
        category: category,
        tags: tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', model_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, data: updatedModel }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
