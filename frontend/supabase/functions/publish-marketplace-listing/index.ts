// supabase/functions/publish-marketplace-listing/index.ts
// Edge Function for publishing marketplace listings

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("🚀 publish-marketplace-listing function started")

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
    const { listingId } = body

    if (!listingId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: listingId' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify user owns the listing
    const { data: listingData, error: listingError } = await supabase
      .from('marketplace_listings')
      .select('id, user_id, is_published')
      .eq('id', listingId)
      .eq('user_id', user.id)
      .single()

    if (listingError || !listingData) {
      console.error('❌ Listing verification error:', listingError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Listing not found or access denied' 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (listingData.is_published) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Listing is already published' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ Listing verified:', listingId)

    // Update listing to published
    const { data: updatedListing, error: updateError } = await supabase
      .from('marketplace_listings')
      .update({ 
        is_published: true, 
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', listingId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to publish listing: ${updateError.message}` 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('✅ Marketplace listing published:', listingId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updatedListing 
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
