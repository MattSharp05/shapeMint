// supabase/functions/obj-to-stl/index.ts
// OBJ to STL converter with automatic 100mm scaling for Slant3D compatibility

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function convertOBJToSTLWithScaling(objText: string): { stlData: Uint8Array, scalingInfo: any } {
  console.log('=== CONVERTING OBJ TO STL (100mm max) ===');
  
  const lines = objText.split('\n');
  const vertices: number[][] = [];
  const faces: number[][] = [];
  
  // Parse OBJ file
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const parts = trimmed.split(/\s+/);
    
    if (parts[0] === 'v' && parts.length >= 4) {
      // Vertex: v x y z
      vertices.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]), 
        parseFloat(parts[3])
      ]);
    } else if (parts[0] === 'f' && parts.length >= 4) {
      // Face: f v1 v2 v3 (1-indexed)
      const face = parts.slice(1).map(v => {
        // Handle formats like "1/1/1" or "1//1" - just take first number
        return parseInt(v.split('/')[0]) - 1; // Convert to 0-indexed
      }).filter(index => !isNaN(index) && index >= 0);
      
      if (face.length >= 3) {
        // Add triangle
        faces.push([face[0], face[1], face[2]]);
        
        // If quad, split into two triangles
        if (face.length === 4) {
          faces.push([face[0], face[2], face[3]]);
        }
      }
    }
  }
  
  if (vertices.length === 0 || faces.length === 0) {
    throw new Error('Invalid OBJ file: no vertices or faces found');
  }
  
  console.log(`Parsed ${vertices.length} vertices, ${faces.length} faces`);
  
  // Calculate original bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  for (const vertex of vertices) {
    minX = Math.min(minX, vertex[0]); maxX = Math.max(maxX, vertex[0]);
    minY = Math.min(minY, vertex[1]); maxY = Math.max(maxY, vertex[1]);
    minZ = Math.min(minZ, vertex[2]); maxZ = Math.max(maxZ, vertex[2]);
  }
  
  const originalSize = {
    x: maxX - minX,
    y: maxY - minY,
    z: maxZ - minZ
  };
  const originalMaxDimension = Math.max(originalSize.x, originalSize.y, originalSize.z);
  
  console.log('Original size:', {
    x: originalSize.x.toFixed(3),
    y: originalSize.y.toFixed(3),
    z: originalSize.z.toFixed(3),
    max: originalMaxDimension.toFixed(3)
  });
  
  // Scale to 100mm max dimension (perfect for Slant3D)
  const targetMaxDimension = 100; // mm
  const scaleFactor = targetMaxDimension / originalMaxDimension;
  
  console.log('Scale factor for 100mm max:', scaleFactor.toFixed(4));
  
  // Calculate center and apply scaling
  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2
  };
  
  const scaledVertices = vertices.map(vertex => [
    (vertex[0] - center.x) * scaleFactor,
    (vertex[1] - center.y) * scaleFactor,
    (vertex[2] - center.z) * scaleFactor
  ]);
  
  // Calculate final size
  const finalSize = {
    x: originalSize.x * scaleFactor,
    y: originalSize.y * scaleFactor,
    z: originalSize.z * scaleFactor
  };
  const finalMaxDimension = Math.max(finalSize.x, finalSize.y, finalSize.z);
  
  console.log('Final size (mm):', {
    x: finalSize.x.toFixed(2),
    y: finalSize.y.toFixed(2),
    z: finalSize.z.toFixed(2),
    max: finalMaxDimension.toFixed(2)
  });
  
  // Validate faces
  const validFaces = faces.filter(face => {
    return face.every(index => index >= 0 && index < scaledVertices.length);
  });
  
  if (validFaces.length === 0) {
    throw new Error('No valid faces found after validation');
  }
  
  console.log(`✅ ${validFaces.length} valid faces after validation`);
  
  // Generate STL binary format
  const triangleCount = validFaces.length;
  const bufferSize = 80 + 4 + (triangleCount * 50); // Header + count + triangles
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  
  // Write 80-byte header
  const header = 'Scaled to 100mm max for Slant3D printing';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  
  // Write triangle count (little-endian)
  view.setUint32(80, triangleCount, true);
  
  // Write triangles
  let offset = 84;
  for (const face of validFaces) {
    const [v1, v2, v3] = face;
    
    const vertex1 = scaledVertices[v1];
    const vertex2 = scaledVertices[v2];
    const vertex3 = scaledVertices[v3];
    
    // Calculate normal vector using cross product
    const a = [
      vertex2[0] - vertex1[0],
      vertex2[1] - vertex1[1], 
      vertex2[2] - vertex1[2]
    ];
    const b = [
      vertex3[0] - vertex1[0],
      vertex3[1] - vertex1[1],
      vertex3[2] - vertex1[2]
    ];
    
    // Cross product: a × b
    const normal = [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
    
    // Normalize the normal vector
    const length = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    if (length > 0) {
      normal[0] /= length;
      normal[1] /= length;
      normal[2] /= length;
    }
    
    // Write normal vector (12 bytes)
    view.setFloat32(offset, normal[0], true); offset += 4;
    view.setFloat32(offset, normal[1], true); offset += 4;
    view.setFloat32(offset, normal[2], true); offset += 4;
    
    // Write vertices (36 bytes total - 12 bytes per vertex)
    // Vertex 1
    view.setFloat32(offset, vertex1[0], true); offset += 4;
    view.setFloat32(offset, vertex1[1], true); offset += 4;
    view.setFloat32(offset, vertex1[2], true); offset += 4;
    
    // Vertex 2
    view.setFloat32(offset, vertex2[0], true); offset += 4;
    view.setFloat32(offset, vertex2[1], true); offset += 4;
    view.setFloat32(offset, vertex2[2], true); offset += 4;
    
    // Vertex 3
    view.setFloat32(offset, vertex3[0], true); offset += 4;
    view.setFloat32(offset, vertex3[1], true); offset += 4;
    view.setFloat32(offset, vertex3[2], true); offset += 4;
    
    // Attribute byte count (2 bytes) - typically 0
    view.setUint16(offset, 0, true); offset += 2;
  }
  
  const scalingInfo = {
    originalSize,
    finalSize: {
      x: parseFloat(finalSize.x.toFixed(2)),
      y: parseFloat(finalSize.y.toFixed(2)),
      z: parseFloat(finalSize.z.toFixed(2))
    },
    scaleFactor: parseFloat(scaleFactor.toFixed(4)),
    targetMaxDimension,
    finalMaxDimension: parseFloat(finalMaxDimension.toFixed(2)),
    triangleCount: validFaces.length,
    slant3dCompatible: finalMaxDimension >= 10 && finalMaxDimension <= 220
  };
  
  console.log('✅ STL conversion complete with 100mm scaling');
  console.log('Final max dimension:', finalMaxDimension.toFixed(2), 'mm');
  console.log('Slant3D compatible:', scalingInfo.slant3dCompatible);
  
  return {
    stlData: new Uint8Array(buffer),
    scalingInfo
  };
}

Deno.serve(async (req) => {
  console.log('=== OBJ TO STL CONVERTER WITH 100MM SCALING ===');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST method allowed');
    }
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { objUrl, taskId, fileName } = await req.json();
    
    if (!objUrl || !taskId) {
      throw new Error('objUrl and taskId are required');
    }
    
    console.log('Converting OBJ to STL with 100mm scaling:', objUrl);
    console.log('Task ID:', taskId);
    
    // Download OBJ file
    console.log('=== DOWNLOADING OBJ FILE ===');
    const objResponse = await fetch(objUrl);
    
    if (!objResponse.ok) {
      throw new Error(`Failed to download OBJ file: ${objResponse.status} ${objResponse.statusText}`);
    }
    
    const objText = await objResponse.text();
    console.log(`Downloaded OBJ: ${objText.length} characters`);
    
    // Convert OBJ to STL with scaling
    console.log('=== CONVERTING WITH SCALING ===');
    const { stlData, scalingInfo } = convertOBJToSTLWithScaling(objText);
    console.log(`Generated STL: ${stlData.byteLength} bytes`);
    
    // Upload STL to Supabase Storage
    console.log('=== UPLOADING STL TO STORAGE ===');
    const stlFileName = fileName || `models/${taskId}.stl`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('3d-models')
      .upload(stlFileName, stlData, {
        contentType: 'application/vnd.ms-pki.stl',
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload STL: ${uploadError.message}`);
    }
    
    console.log('✅ STL uploaded successfully:', uploadData);
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('3d-models')
      .getPublicUrl(stlFileName);
    
    const stlUrl = publicUrlData.publicUrl;
    console.log('✅ STL public URL:', stlUrl);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        taskId,
        stlUrl,
        fileName: stlFileName,
        fileSize: stlData.byteLength,
        originalObjUrl: objUrl,
        scalingInfo,
        slant3dCompatible: scalingInfo.slant3dCompatible,
        printingSpecs: {
          maxDimension: `${scalingInfo.finalMaxDimension}mm`,
          targetSize: '100mm max',
          format: 'STL binary',
          triangles: scalingInfo.triangleCount,
          slant3dReady: true
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Conversion error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});