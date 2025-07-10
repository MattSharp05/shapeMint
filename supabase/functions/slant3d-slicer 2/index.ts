import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileURL } = await req.json()

    if (!fileURL) {
      throw new Error('fileURL is required')
    }

    // Call Slant3D slicer API
    const response = await fetch('https://www.slant3dapi.com/api/slicer', {
      method: 'POST',
      headers: {
        'api-key': Deno.env.get('SLANT3D_API_KEY') ?? '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileURL })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Slant3D Slicer API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

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