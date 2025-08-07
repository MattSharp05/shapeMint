// supabase/functions/create-marketplace-listing/index.ts
// Edge Function for creating marketplace listings

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("🚀 create-marketplace-listing function started")

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create authenticated Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication error:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized - please log in' 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Parse request body
    const body = await req.json()
    const {
      modelId,
      title,
      description,
      price,
      category,
      tags,
      notes,
      selectedThumbnailUrl,
      selectedThumbnailAngle,
      isCustomThumbnail
    } = body

    // Validate required fields
    if (!modelId || !title || !price || !category) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: modelId, title, price, category' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify user owns the model
    const { data: modelData, error: modelError } = await supabase
      .from('generated_models')
      .select('id, user_id, status')
      .eq('id', modelId)
      .eq('user_id', user.id)
      .single()

    if (modelError || !modelData) {
      console.error('❌ Model verification error:', modelError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Model not found or access denied' 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (modelData.status !== 'completed') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Model must be completed before listing' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ Model verified:', modelId)

    // Create marketplace listing
    const listingData = {
      model_id: modelId,
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      price: parseFloat(price),
      category,
      tags: tags || [],
      notes: notes?.trim() || null,
      selected_thumbnail_url: selectedThumbnailUrl || null,
      selected_thumbnail_angle: selectedThumbnailAngle || null,
      is_custom_thumbnail: isCustomThumbnail || false,
      is_published: false, // Always start as draft
    }

    const { data: listing, error: insertError } = await supabase
      .from('marketplace_listings')
      .insert(listingData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create listing: ${insertError.message}` 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ Marketplace listing created:', listing.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: listing 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
