import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Check if we have cached filaments (less than 1 hour old)
    const { data: cachedFilaments, error: cacheError } = await supabaseClient
      .from('slant3d_filaments')
      .select('*')
      .gte('updated_at', new Date(Date.now() - 3600000).toISOString())

    if (cachedFilaments && cachedFilaments.length > 0) {
      return new Response(JSON.stringify({ filaments: cachedFilaments }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch from Slant3D API
    const response = await fetch('https://www.slant3dapi.com/api/filament', {
      method: 'GET',
      headers: {
        'api-key': Deno.env.get('SLANT3D_API_KEY') ?? '',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Slant3D API error: ${response.status}`)
    }

    const data = await response.json()

    // Cache the filaments
    if (data.filaments) {
      // Clear old cache
      await supabaseClient.from('slant3d_filaments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      
      // Insert new data
      const filamentsToInsert = data.filaments.map((filament: any) => ({
        filament_name: filament.filament,
        hex_color: filament.hexColor,
        color_tag: filament.colorTag,
        profile: filament.profile
      }))

      await supabaseClient.from('slant3d_filaments').insert(filamentsToInsert)
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}) 