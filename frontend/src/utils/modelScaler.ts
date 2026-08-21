import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export type DimensionUnit = 'cm' | 'mm' | 'inches';
export type DimensionTarget = 'height' | 'width' | 'depth' | 'longest';

export interface ScaleOptions {
  targetValue: number;
  unit: DimensionUnit;
  target: DimensionTarget;
}

export interface ScaleResult {
  scaledBlob: Blob;
  originalDimensions: { width: number; height: number; depth: number };
  finalDimensions: { width: number; height: number; depth: number };
  scaleFactor: number;
}

/**
 * Convert a value to meters (Three.js/GLB standard unit)
 */
function toMeters(value: number, unit: DimensionUnit): number {
  switch (unit) {
    case 'cm':
      return value / 100;
    case 'mm':
      return value / 1000;
    case 'inches':
      return value * 0.0254;
    default:
      return value / 100; // Default to cm
  }
}

/**
 * Convert meters to a specific unit
 */
function fromMeters(meters: number, unit: DimensionUnit): number {
  switch (unit) {
    case 'cm':
      return meters * 100;
    case 'mm':
      return meters * 1000;
    case 'inches':
      return meters / 0.0254;
    default:
      return meters * 100;
  }
}

/**
 * Fetch a GLB file and create a blob URL (handles CORS for Meshy URLs)
 */
async function fetchGLBAsBlob(url: string): Promise<string> {
  // Check if this is a Meshy URL that needs special handling
  const isMeshyUrl = url.includes('assets.meshy.ai') ||
                     url.includes('meshy.ai') ||
                     url.includes('cloudfront.net') ||
                     url.includes('taichi-graphics.com');
  
  if (isMeshyUrl) {
    // Try proxy endpoint first (works in production and if proxy server is running)
    const isProduction = import.meta.env.PROD;
    const proxyBaseUrl = import.meta.env.VITE_PROXY_URL || '';
    const proxyUrl = `${proxyBaseUrl}/api/meshy/glb?url=${encodeURIComponent(url)}`;
    
    try {
      console.log('🔗 Attempting to fetch via proxy:', proxyUrl);
      const response = await fetch(proxyUrl);
      
      if (response.ok && response.headers.get('content-type')?.includes('gltf')) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log('✅ Successfully fetched via proxy');
        return blobUrl;
      } else {
        // Proxy returned HTML/error, try direct fetch
        console.log('⚠️ Proxy returned non-GLB response, trying direct fetch');
        throw new Error('Proxy returned non-GLB response');
      }
    } catch (proxyError) {
      console.log('⚠️ Proxy fetch failed, trying direct fetch with CORS workaround:', proxyError);
      
      // Fallback: Try direct fetch (may work if server allows CORS)
      // For CloudFront signed URLs, we need to preserve query params
      try {
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log('✅ Successfully fetched directly');
        return blobUrl;
      } catch (directError) {
        console.error('❌ Direct fetch also failed:', directError);
        // If both fail, throw the original error
        throw new Error(`Failed to fetch GLB file: ${directError instanceof Error ? directError.message : 'Unknown error'}`);
      }
    }
  }
  
  // Non-Meshy URLs can be loaded directly
  return url;
}

/**
 * Load a GLB model from a URL (handles CORS by fetching and creating blob URLs for Meshy assets)
 */
async function loadModel(url: string): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  
  // Fetch as blob if needed (for Meshy URLs to avoid CORS)
  const loadUrl = await fetchGLBAsBlob(url);

  return new Promise((resolve, reject) => {
    loader.load(
      loadUrl,
      (gltf) => {
        // Clean up blob URL if we created one
        if (loadUrl.startsWith('blob:')) {
          URL.revokeObjectURL(loadUrl);
        }
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        // Clean up blob URL on error too
        if (loadUrl.startsWith('blob:')) {
          URL.revokeObjectURL(loadUrl);
        }
        reject(new Error(`Failed to load model: ${error}`));
      }
    );
  });
}

/**
 * Convert ImageBitmap textures to canvas-based images so GLTFExporter can serialize them.
 * GLTFLoader decodes embedded textures as ImageBitmap, but GLTFExporter needs
 * HTMLCanvasElement or HTMLImageElement sources to re-embed texture data in the GLB.
 */
function convertImageBitmapTextures(scene: THREE.Object3D): void {
  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of materials) {
      if (!mat) continue;
      // Process all texture-bearing properties on the material
      const textureProps = [
        'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap',
        'aoMap', 'bumpMap', 'displacementMap', 'alphaMap', 'envMap',
      ] as const;
      for (const prop of textureProps) {
        const tex = (mat as any)[prop] as THREE.Texture | undefined;
        if (!tex?.image) continue;
        if (typeof ImageBitmap !== 'undefined' && tex.image instanceof ImageBitmap) {
          const canvas = document.createElement('canvas');
          canvas.width = tex.image.width;
          canvas.height = tex.image.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tex.image, 0, 0);
            tex.image = canvas;
            tex.needsUpdate = true;
          }
        }
      }
    }
  });
}

/**
 * Export a Three.js scene to GLB blob
 */
async function exportToGLB(scene: THREE.Object3D): Promise<Blob> {
  // Convert ImageBitmap textures to canvas so the exporter can embed them
  convertImageBitmapTextures(scene);

  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }));
        } else {
          // JSON format - convert to blob
          const jsonString = JSON.stringify(result);
          resolve(new Blob([jsonString], { type: 'model/gltf+json' }));
        }
      },
      (error) => {
        reject(new Error(`Failed to export model: ${error}`));
      },
      { binary: true }
    );
  });
}

/**
 * Calculate the bounding box dimensions of a 3D object
 */
function getBoundingBoxDimensions(object: THREE.Object3D): { width: number; height: number; depth: number } {
  const box = new THREE.Box3().setFromObject(object);
  return {
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z
  };
}

/**
 * Get the current dimension value based on target type
 */
function getCurrentDimension(dimensions: { width: number; height: number; depth: number }, target: DimensionTarget): number {
  switch (target) {
    case 'height':
      return dimensions.height;
    case 'width':
      return dimensions.width;
    case 'depth':
      return dimensions.depth;
    case 'longest':
      return Math.max(dimensions.width, dimensions.height, dimensions.depth);
    default:
      return dimensions.height;
  }
}

/**
 * Scale a GLB model to a specific size
 *
 * @param glbUrl - URL of the GLB model to scale
 * @param options - Scaling options (target value, unit, and dimension to target)
 * @returns Promise with the scaled model blob and dimension info
 */
export async function scaleModel(glbUrl: string, options: ScaleOptions): Promise<ScaleResult> {
  console.log('🔧 Starting model scaling...', options);

  // Load the model
  const scene = await loadModel(glbUrl);

  // Ensure scene matrices are up to date before getting dimensions
  scene.updateMatrixWorld(true);

  // Get original dimensions (in meters, as GLB uses)
  const originalDimensions = getBoundingBoxDimensions(scene);
  console.log('📐 Original dimensions (meters):', originalDimensions);

  // Validate dimensions (check for zero or invalid values)
  if (originalDimensions.width <= 0 || originalDimensions.height <= 0 || originalDimensions.depth <= 0) {
    throw new Error('Invalid model dimensions: model appears to have zero or negative size');
  }

  // Convert target value to meters
  const targetMeters = toMeters(options.targetValue, options.unit);
  console.log(`🎯 Target: ${options.targetValue}${options.unit} = ${targetMeters}m`);

  // Get current dimension for the target axis
  const currentDimension = getCurrentDimension(originalDimensions, options.target);
  console.log(`📏 Current ${options.target}: ${currentDimension}m`);

  // Validate current dimension
  if (currentDimension <= 0) {
    throw new Error(`Invalid current dimension for ${options.target}: ${currentDimension}m`);
  }

  // Calculate scale factor
  const scaleFactor = targetMeters / currentDimension;
  console.log(`⚖️ Scale factor: ${scaleFactor}`);

  // Validate scale factor (prevent extreme scaling)
  if (!isFinite(scaleFactor) || scaleFactor <= 0) {
    throw new Error(`Invalid scale factor: ${scaleFactor}`);
  }
  if (scaleFactor > 1000 || scaleFactor < 0.001) {
    console.warn(`⚠️ Extreme scale factor detected: ${scaleFactor}. This may indicate incorrect units or dimensions.`);
  }

  // Reset scale to identity first, then apply uniform scaling to preserve proportions
  // This ensures we're scaling from the original size, not multiplying existing scale
  scene.scale.set(1, 1, 1);
  scene.scale.multiplyScalar(scaleFactor);

  // Update matrices
  scene.updateMatrixWorld(true);

  // Get final dimensions
  const finalDimensions = getBoundingBoxDimensions(scene);
  console.log('📐 Final dimensions (meters):', finalDimensions);

  // Export the scaled model
  const scaledBlob = await exportToGLB(scene);
  console.log('✅ Model scaled successfully, blob size:', scaledBlob.size);

  // Convert dimensions to the requested unit for return
  const unitOriginal = {
    width: fromMeters(originalDimensions.width, options.unit),
    height: fromMeters(originalDimensions.height, options.unit),
    depth: fromMeters(originalDimensions.depth, options.unit)
  };

  const unitFinal = {
    width: fromMeters(finalDimensions.width, options.unit),
    height: fromMeters(finalDimensions.height, options.unit),
    depth: fromMeters(finalDimensions.depth, options.unit)
  };

  return {
    scaledBlob,
    originalDimensions: unitOriginal,
    finalDimensions: unitFinal,
    scaleFactor
  };
}

/**
 * Scale a model and upload it to Supabase storage
 */
export async function scaleAndUploadModel(
  glbUrl: string,
  options: ScaleOptions,
  supabase: any,
  userId: string,
  modelId: string
): Promise<{ publicUrl: string; scaleResult: ScaleResult }> {
  // Scale the model
  const scaleResult = await scaleModel(glbUrl, options);

  // Generate a unique filename
  const filename = `scaled_${modelId}_${Date.now()}.glb`;
  const storagePath = `models/${userId}/${filename}`;

  // Upload to Supabase storage
  const { error: uploadError } = await supabase.storage
    .from('3d-models')
    .upload(storagePath, scaleResult.scaledBlob, {
      contentType: 'model/gltf-binary',
      upsert: true
    });

  if (uploadError) {
    throw new Error(`Failed to upload scaled model: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('3d-models')
    .getPublicUrl(storagePath);

  console.log('✅ Scaled model uploaded:', publicUrl);

  return { publicUrl, scaleResult };
}
