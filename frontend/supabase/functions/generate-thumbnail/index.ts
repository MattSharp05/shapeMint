import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Generate thumbnail - try to get preview image or create better placeholder
async function generateThumbnailForAngle(modelId, angle, glbUrl) {
  const angleLabel = typeof angle === 'number' ? `${angle}deg` : angle;
  // TODO: Future enhancement - implement real 3D rendering
  // 1. Load GLB model using Three.js in Deno
  // 2. Set up camera at specified angle
  // 3. Render to canvas and return as image data URL
  // For now, try to get any available preview image from the GLB URL pattern
  if (glbUrl) {
    try {
      // Some 3D services provide preview images alongside models
      // Check if there's a preview image with a predictable URL pattern
      const previewUrl = glbUrl.replace('.glb', '_preview.jpg').replace('.glb', '_thumb.jpg').replace('/models/', '/previews/');
      // Test if the preview image exists
      const response = await fetch(previewUrl, {
        method: 'HEAD'
      });
      if (response.ok) {
        console.log(`Found preview image for ${modelId} at ${previewUrl}`);
        return previewUrl;
      }
    } catch (error) {
      console.log(`No preview image found for ${modelId}, generating placeholder`);
    }
  }
  // Generate an attractive placeholder SVG
  const colors = {
    '0': '#3b82f6',
    '45': '#8b5cf6',
    '90': '#ef4444',
    '135': '#f59e0b',
    'isometric': '#10b981' // Green - Isometric
  };
  const color = colors[angle.toString()] || '#6b7280';
  const svg = [
    '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">',
    '  <defs>',
    '    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">',
    '      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />',
    '      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />',
    '    </linearGradient>',
    '    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">',
    '      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>',
    '    </filter>',
    '  </defs>',
    '  <rect width="100%" height="100%" fill="url(#grad1)" rx="12"/>',
    // 3D-like geometric shape
    '  <g transform="translate(200,150)">',
    `    <polygon points="-60,-40 60,-40 80,-20 80,40 -60,40" fill="${color}" opacity="0.8" filter="url(#shadow)"/>`,
    `    <polygon points="60,-40 80,-20 80,0 60,-20" fill="${color}" opacity="0.9"/>`,
    `    <polygon points="-60,40 80,40 80,60 -60,60" fill="${color}" opacity="0.6"/>`,
    '  </g>',
    // Angle indicator
    '  <circle cx="350" cy="50" r="25" fill="white" stroke="#e2e8f0" stroke-width="2"/>',
    '  <text x="350" y="57" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#374151" font-weight="bold">',
    `    ${angleLabel.replace('deg', '°')}`,
    '  </text>',
    // Model info
    '  <text x="200" y="250" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#374151" font-weight="600">',
    `    3D Model Preview`,
    '  </text>',
    '  <text x="200" y="270" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#6b7280">',
    `    ${modelId.slice(0, 8)}... • ${angleLabel}`,
    '  </text>',
    '</svg>'
  ].join('');
  try {
    // 🔧 FIXED: Use proper UTF-8 to base64 encoding instead of btoa() to handle Unicode characters
    const encoder = new TextEncoder();
    const data = encoder.encode(svg);
    const base64 = btoa(String.fromCharCode(...data));
    return `data:image/svg+xml;base64,${base64}`;
  } catch (error) {
    console.error('Error encoding SVG to base64:', error);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
}
async function generateThumbnails(request) {
  const results = {};
  try {
    // Generate thumbnails for each angle
    for (const angle of request.angles){
      const thumbnailUrl = await generateThumbnailForAngle(request.modelId, angle, request.glbUrl);
      results[angle.toString()] = thumbnailUrl;
    }
    // Default to first angle if available, otherwise 45 degrees
    const defaultAngle = request.angles[0] || 45;
    return {
      modelId: request.modelId,
      angles: results,
      selectedAngle: defaultAngle
    };
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    return {
      modelId: request.modelId,
      angles: {},
      selectedAngle: 0,
      error: error.message
    };
  }
}
serve(async (req)=>{
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { modelId, glbUrl, angles = [
      0,
      45,
      90,
      135,
      'isometric'
    ], quality = 'fast' } = await req.json();
    if (!modelId || !glbUrl) {
      return new Response(JSON.stringify({
        error: 'modelId and glbUrl are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const result = await generateThumbnails({
      modelId,
      glbUrl,
      angles,
      quality
    });
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in generate-thumbnail function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});