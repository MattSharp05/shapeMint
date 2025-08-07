// supabase/functions/test-comfyui/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const COMFYUI_BASE_URL = 'http://comfy.tunell.live';
// ComfyUI Service Class
class ComfyUIService {
  baseUrl;
  clientId;
  constructor(baseUrl){
    this.baseUrl = baseUrl;
    this.clientId = Math.random().toString(36).substring(7);
  }
  async uploadImage(imageFile) {
    console.log('📤 Uploading image to ComfyUI...');
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('type', 'input');
    const response = await fetch(`${this.baseUrl}/upload/image`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    console.log('✅ Image uploaded:', result.name);
    return result.name;
  }
  createWorkflow(imageName, options = {}) {
    // Complete Hy3D workflow with all required nodes
    const workflow = {
      // Model loaders
      "10": {
        "inputs": {
          "model": "hunyuan3d-dit-v2-0-fp16.safetensors",
          "attention_mode": "sdpa",
          "cublas_ops": false
        },
        "class_type": "Hy3DModelLoader",
        "_meta": {
          "title": "Hy3DModelLoader"
        }
      },
      "28": {
        "inputs": {
          "model": "hunyuan3d-delight-v2-0"
        },
        "class_type": "DownloadAndLoadHy3DDelightModel",
        "_meta": {
          "title": "(Down)Load Hy3D DelightModel"
        }
      },
      "85": {
        "inputs": {
          "model": "hunyuan3d-paint-v2-0"
        },
        "class_type": "DownloadAndLoadHy3DPaintModel",
        "_meta": {
          "title": "(Down)Load Hy3D PaintModel"
        }
      },
      // Image input and preprocessing
      "13": {
        "inputs": {
          "image": imageName
        },
        "class_type": "LoadImage",
        "_meta": {
          "title": "Load Image"
        }
      },
      "52": {
        "inputs": {
          "width": 518,
          "height": 518,
          "interpolation": "lanczos",
          "method": "pad",
          "condition": "always",
          "multiple_of": 2,
          "image": [
            "13",
            0
          ]
        },
        "class_type": "ImageResize+",
        "_meta": {
          "title": "🔧 Image Resize"
        }
      },
      "55": {
        "inputs": {
          "mode": "base",
          "use_jit": true
        },
        "class_type": "TransparentBGSession+",
        "_meta": {
          "title": "🔧 InSPyReNet TransparentBG"
        }
      },
      "56": {
        "inputs": {
          "rembg_session": [
            "55",
            0
          ],
          "image": [
            "52",
            0
          ]
        },
        "class_type": "ImageRemoveBackground+",
        "_meta": {
          "title": "🔧 Image Remove Background"
        }
      },
      // Auxiliary nodes for image processing
      "132": {
        "inputs": {
          "value": 0.8,
          "width": 512,
          "height": 512
        },
        "class_type": "SolidMask",
        "_meta": {
          "title": "SolidMask"
        }
      },
      "133": {
        "inputs": {
          "mask": [
            "132",
            0
          ]
        },
        "class_type": "MaskToImage",
        "_meta": {
          "title": "Convert Mask to Image"
        }
      },
      "64": {
        "inputs": {
          "x": 0,
          "y": 0,
          "resize_source": true,
          "destination": [
            "133",
            0
          ],
          "source": [
            "52",
            0
          ],
          "mask": [
            "56",
            1
          ]
        },
        "class_type": "ImageCompositeMasked",
        "_meta": {
          "title": "ImageCompositeMasked"
        }
      },
      // 3D Mesh Generation
      "141": {
        "inputs": {
          "guidance_scale": options.guidance_scale || 6.0,
          "steps": options.steps || 50,
          "seed": options.seed || Math.floor(Math.random() * 1000000),
          "scheduler": "ConsistencyFlowMatchEulerDiscreteScheduler",
          "force_offload": true,
          "pipeline": [
            "10",
            0
          ],
          "image": [
            "52",
            0
          ],
          "mask": [
            "56",
            1
          ]
        },
        "class_type": "Hy3DGenerateMesh",
        "_meta": {
          "title": "Hy3DGenerateMesh"
        }
      },
      "140": {
        "inputs": {
          "box_v": 1.01,
          "octree_resolution": 384,
          "num_chunks": 32000,
          "mc_level": 0,
          "mc_algo": "mc",
          "enable_flash_vdm": true,
          "force_offload": true,
          "vae": [
            "10",
            1
          ],
          "latents": [
            "141",
            0
          ]
        },
        "class_type": "Hy3DVAEDecode",
        "_meta": {
          "title": "Hy3D VAE Decode"
        }
      },
      "59": {
        "inputs": {
          "remove_floaters": true,
          "remove_degenerate_faces": true,
          "reduce_faces": true,
          "max_facenum": 50000,
          "smooth_normals": false,
          "trimesh": [
            "140",
            0
          ]
        },
        "class_type": "Hy3DPostprocessMesh",
        "_meta": {
          "title": "Hy3D Postprocess Mesh"
        }
      },
      // UV Mapping and Camera Config
      "83": {
        "inputs": {
          "trimesh": [
            "59",
            0
          ]
        },
        "class_type": "Hy3DMeshUVWrap",
        "_meta": {
          "title": "Hy3D Mesh UV Wrap"
        }
      },
      "61": {
        "inputs": {
          "camera_azimuths": "0, 90, 180, 270, 0, 180",
          "camera_elevations": "0, 0, 0, 0, 90, -90",
          "view_weights": "1, 0.1, 0.5, 0.1, 0.05, 0.05",
          "camera_distance": 1.45,
          "ortho_scale": 1.2
        },
        "class_type": "Hy3DCameraConfig",
        "_meta": {
          "title": "Hy3D Camera Config"
        }
      },
      // Multi-view rendering
      "79": {
        "inputs": {
          "render_size": 1024,
          "texture_size": 2048,
          "normal_space": "world",
          "trimesh": [
            "83",
            0
          ],
          "camera_config": [
            "61",
            0
          ]
        },
        "class_type": "Hy3DRenderMultiView",
        "_meta": {
          "title": "Hy3D Render MultiView"
        }
      },
      // Scheduler configurations
      "148": {
        "inputs": {
          "scheduler": "Euler A",
          "sigmas": "default",
          "pipeline": [
            "28",
            0
          ]
        },
        "class_type": "Hy3DDiffusersSchedulerConfig",
        "_meta": {
          "title": "Hy3D Diffusers Scheduler Config"
        }
      },
      "149": {
        "inputs": {
          "scheduler": "Euler A",
          "sigmas": "default",
          "pipeline": [
            "85",
            0
          ]
        },
        "class_type": "Hy3DDiffusersSchedulerConfig",
        "_meta": {
          "title": "Hy3D Diffusers Scheduler Config"
        }
      },
      // Texture generation and enhancement
      "35": {
        "inputs": {
          "steps": 20,
          "width": 512,
          "height": 512,
          "cfg_image": 0.7,
          "seed": options.delight_seed || Math.floor(Math.random() * 1000000),
          "delight_pipe": [
            "28",
            0
          ],
          "image": [
            "64",
            0
          ],
          "scheduler": [
            "148",
            0
          ]
        },
        "class_type": "Hy3DDelightImage",
        "_meta": {
          "title": "Hy3DDelightImage"
        }
      },
      "117": {
        "inputs": {
          "width": 2048,
          "height": 2049,
          "interpolation": "lanczos",
          "method": "stretch",
          "condition": "always",
          "multiple_of": 0,
          "image": [
            "88",
            0
          ]
        },
        "class_type": "ImageResize+",
        "_meta": {
          "title": "🔧 Image Resize"
        }
      },
      "88": {
        "inputs": {
          "view_size": 512,
          "steps": 25,
          "seed": options.paint_seed || Math.floor(Math.random() * 1000000),
          "denoise_strength": 1,
          "pipeline": [
            "85",
            0
          ],
          "ref_image": [
            "35",
            0
          ],
          "normal_maps": [
            "79",
            0
          ],
          "position_maps": [
            "79",
            1
          ],
          "camera_config": [
            "61",
            0
          ],
          "scheduler": [
            "149",
            0
          ]
        },
        "class_type": "Hy3DSampleMultiView",
        "_meta": {
          "title": "Hy3D Sample MultiView"
        }
      },
      // Texture baking and refinement
      "92": {
        "inputs": {
          "images": [
            "117",
            0
          ],
          "renderer": [
            "79",
            2
          ],
          "camera_config": [
            "61",
            0
          ]
        },
        "class_type": "Hy3DBakeFromMultiview",
        "_meta": {
          "title": "Hy3D Bake From Multiview"
        }
      },
      "129": {
        "inputs": {
          "texture": [
            "92",
            0
          ],
          "mask": [
            "92",
            1
          ],
          "renderer": [
            "92",
            2
          ]
        },
        "class_type": "Hy3DMeshVerticeInpaintTexture",
        "_meta": {
          "title": "Hy3D Mesh Vertice Inpaint Texture"
        }
      },
      "104": {
        "inputs": {
          "inpaint_radius": 3,
          "inpaint_method": "ns",
          "texture": [
            "129",
            0
          ],
          "mask": [
            "129",
            1
          ]
        },
        "class_type": "CV2InpaintTexture",
        "_meta": {
          "title": "CV2 Inpaint Texture"
        }
      },
      "98": {
        "inputs": {
          "texture": [
            "104",
            0
          ],
          "renderer": [
            "129",
            2
          ]
        },
        "class_type": "Hy3DApplyTexture",
        "_meta": {
          "title": "Hy3D Apply Texture"
        }
      },
      // Preview nodes
      "45": {
        "inputs": {
          "images": [
            "35",
            0
          ]
        },
        "class_type": "PreviewImage",
        "_meta": {
          "title": "Preview Image"
        }
      },
      "90": {
        "inputs": {
          "images": [
            "79",
            0
          ]
        },
        "class_type": "PreviewImage",
        "_meta": {
          "title": "Preview Image"
        }
      },
      "111": {
        "inputs": {
          "images": [
            "88",
            0
          ]
        },
        "class_type": "PreviewImage",
        "_meta": {
          "title": "Preview Image: Multiview results"
        }
      },
      "125": {
        "inputs": {
          "images": [
            "92",
            0
          ]
        },
        "class_type": "PreviewImage",
        "_meta": {
          "title": "Preview Image: Initial baked texture"
        }
      },
      "126": {
        "inputs": {
          "images": [
            "129",
            0
          ]
        },
        "class_type": "PreviewImage",
        "_meta": {
          "title": "Preview Image: vertex inpainted texture"
        }
      },
      "127": {
        "inputs": {
          "images": [
            "104",
            0
          ]
        },
        "class_type": "PreviewImage",
        "_meta": {
          "title": "Preview Image: fully inpainted texture"
        }
      },
      // Export nodes
      "17": {
        "inputs": {
          "filename_prefix": "3D/Hy3D",
          "file_format": "glb",
          "save_file": true,
          "trimesh": [
            "59",
            0
          ]
        },
        "class_type": "Hy3DExportMesh",
        "_meta": {
          "title": "Hy3DExportMesh"
        }
      },
      "99": {
        "inputs": {
          "filename_prefix": "3D/Hy3D_textured",
          "file_format": "glb",
          "save_file": true,
          "trimesh": [
            "98",
            0
          ]
        },
        "class_type": "Hy3DExportMesh",
        "_meta": {
          "title": "Hy3DExportMesh"
        }
      },
      // 3D Preview nodes
      "153": {
        "inputs": {
          "model_file": [
            "17",
            0
          ],
          "image": ""
        },
        "class_type": "Preview3D",
        "_meta": {
          "title": "Preview 3D"
        }
      },
      "154": {
        "inputs": {
          "model_file": [
            "99",
            0
          ],
          "image": ""
        },
        "class_type": "Preview3D",
        "_meta": {
          "title": "Preview 3D"
        }
      },
      // Additional utility nodes
      "116": {
        "inputs": {
          "images": [
            "79",
            1
          ]
        },
        "class_type": "PreviewImage",
        "_meta": {
          "title": "Preview Image"
        }
      },
      "138": {
        "inputs": {
          "mask": [
            "56",
            1
          ]
        },
        "class_type": "MaskPreview+",
        "_meta": {
          "title": "🔧 Mask Preview"
        }
      }
    };
    return workflow;
  }
  async executeWorkflow(workflow) {
    console.log('🚀 Executing ComfyUI workflow...');
    const prompt = {
      prompt: workflow,
      client_id: this.clientId,
      extra_data: {
        extra_pnginfo: {
          workflow: workflow
        }
      }
    };
    const response = await fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prompt)
    });
    if (!response.ok) {
      throw new Error(`Failed to execute workflow: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    console.log('✅ Workflow queued with ID:', result.prompt_id);
    return result.prompt_id;
  }
  async pollForCompletion(promptId, maxAttempts = 180) {
    console.log('⏳ Polling for completion...');
    for(let attempt = 0; attempt < maxAttempts; attempt++){
      try {
        // ✅ CORRECTED: Use /history endpoint instead of /history/{promptId}
        const response = await fetch(`${this.baseUrl}/history`);
        if (response.ok) {
          const history = await response.json();
          if (history[promptId]) {
            const execution = history[promptId];
            // Check if workflow completed successfully
            if (execution.outputs) {
              console.log('✅ Workflow completed!');
              return execution;
            }
            // Check for errors
            if (execution.status?.status_str === 'error') {
              throw new Error(`Workflow failed: ${execution.status.messages?.join(', ')}`);
            }
          }
        }
        // Wait 10 seconds before next poll (increased for longer workflows)
        await new Promise((resolve)=>setTimeout(resolve, 10000));
        console.log(`📊 Poll attempt ${attempt + 1}/${maxAttempts} - Waiting for completion...`);
      } catch (error) {
        console.error(`❌ Poll attempt ${attempt + 1} failed:`, error);
        if (attempt === maxAttempts - 1) throw error;
        // Wait before retrying
        await new Promise((resolve)=>setTimeout(resolve, 5000));
      }
    }
    throw new Error('Workflow timeout - took too long to complete (30 minutes)');
  }
  async getOutputFiles(promptId) {
    console.log('📁 Getting output files...');
    const response = await fetch(`${this.baseUrl}/history`);
    if (!response.ok) {
      throw new Error('Failed to get history');
    }
    const history = await response.json();
    const execution = history[promptId];
    if (!execution?.outputs) {
      throw new Error('No outputs found in execution');
    }
    const outputFiles: string[] = [];
    // ✅ CORRECTED: Check multiple possible output structures
    Object.keys(execution.outputs).forEach((nodeId)=>{
      const nodeOutput = execution.outputs[nodeId];
      // Check for images
      if (nodeOutput.images) {
        nodeOutput.images.forEach((img)=>{
          if (img.filename) {
            outputFiles.push(img.filename);
          }
        });
      }
      // Check for GLB files (may be in different property)
      if (nodeOutput.gltf) {
        nodeOutput.gltf.forEach((file)=>{
          if (file.filename) {
            outputFiles.push(file.filename);
          }
        });
      }
      // Check for generic files
      if (nodeOutput.files) {
        nodeOutput.files.forEach((file)=>{
          if (file.filename) {
            outputFiles.push(file.filename);
          }
        });
      }
    });
    console.log('📄 Found output files:', outputFiles);
    return outputFiles;
  }
  async downloadFile(filename) {
    console.log('⬇️ Downloading file:', filename);
    // Handle subfolder for 3D files
    const subfolder = filename.includes('3D/') ? '3D' : '';
    const actualFilename = filename.replace('3D/', '');
    const params = new URLSearchParams({
      filename: actualFilename,
      type: 'output'
    });
    if (subfolder) {
      params.append('subfolder', subfolder);
    }
    const response = await fetch(`${this.baseUrl}/view?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    return response.blob();
  }
  async listOutputFiles() {
    console.log('📂 Listing output files...');
    const response = await fetch(`${this.baseUrl}/view?type=output`);
    if (!response.ok) {
      throw new Error('Failed to list output files');
    }
    return response.json();
  }
}
// Main Deno serve function
Deno.serve(async (req)=>{
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    console.log('=== COMFYUI COMPLETE HY3D WORKFLOW START ===');
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing Supabase environment variables'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Check if this is a connection test
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      // Handle connection test
      const body = await req.json();
      const action = body.action;
      if (action === 'test_connection') {
        console.log('🔍 Testing ComfyUI connection...');
        try {
          const response = await fetch('http://comfy.tunell.live/', {
            method: 'GET'
          });
          if (!response.ok) {
            return new Response(JSON.stringify({
              success: false,
              error: `ComfyUI server not accessible: ${response.status} ${response.statusText}`
            }), {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
          return new Response(JSON.stringify({
            success: true,
            data: {
              server: 'http://comfy.tunell.live',
              message: 'Server is accessible',
              timestamp: new Date().toISOString()
            }
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: `Connection test failed: ${error.message}`
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }
    }
    // Handle regular generation request
    const formData = await req.formData();
    const imageFile = formData.get('image');
    const userId = formData.get('user_id')?.toString();
    const optionsStr = formData.get('options')?.toString() || '{}';
    let options = {};
    try {
      options = JSON.parse(optionsStr);
    } catch (e) {
      console.warn('Invalid options JSON, using defaults');
    }
    // ✅ CORRECTED: Only require image input (removed text prompt validation)
    if (!imageFile) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Image file is required for Hy3D workflow'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User ID is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('📋 Request details:');
    console.log('  - Image:', `${imageFile.name} (${imageFile.size} bytes)`);
    console.log('  - User ID:', userId);
    console.log('  - Options:', options);
    // Initialize ComfyUI service
    const comfyUI = new ComfyUIService(COMFYUI_BASE_URL);
    console.log('🎯 Starting complete Hy3D workflow execution...');
    // 1. Upload image
    const uploadedImageName = await comfyUI.uploadImage(imageFile);
    // 2. Create complete workflow
    const workflow = comfyUI.createWorkflow(uploadedImageName, options);
    console.log(`📊 Created workflow with ${Object.keys(workflow).length} nodes`);
    // 3. Execute workflow
    const promptId = await comfyUI.executeWorkflow(workflow);
    // 4. Wait for completion (30 minutes timeout)
    console.log('⏳ Waiting for Hy3D workflow completion (up to 30 minutes)...');
    const execution = await comfyUI.pollForCompletion(promptId, 180); // 30 minutes
    // 5. Get output files
    const outputFiles = await comfyUI.getOutputFiles(promptId);
    if (outputFiles.length === 0) {
      throw new Error('No output files generated');
    }
    console.log(`📁 Found ${outputFiles.length} output files`);
    // 6. Download and upload to Supabase
    const uploadPromises = outputFiles.map(async (filename, index)=>{
      try {
        const fileBlob = await comfyUI.downloadFile(filename);
        const fileExtension = filename.split('.').pop() || 'bin';
        const storageFilename = `hy3d-models/${promptId}_${index}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const uploadResult = await supabase.storage.from('hy-3d-models').upload(storageFilename, fileBlob, {
          contentType: fileExtension === 'glb' ? 'model/gltf-binary' : fileExtension === 'png' ? 'image/png' : fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' : 'application/octet-stream',
          cacheControl: '3600',
          upsert: true
        });
        if (uploadResult.error) {
          throw new Error(`Upload failed for ${filename}: ${uploadResult.error.message}`);
        }
        const publicUrl = supabase.storage.from('hy-3d-models').getPublicUrl(storageFilename).data.publicUrl;
        return {
          originalFilename: filename,
          storageFilename,
          publicUrl,
          fileExtension,
          size: fileBlob.size,
          isModel: fileExtension === 'glb',
          isPreview: [
            'png',
            'jpg',
            'jpeg'
          ].includes(fileExtension)
        };
      } catch (error) {
        console.error(`Failed to process file ${filename}:`, error);
        return null;
      }
    });
    const uploadResults = await Promise.all(uploadPromises);
    const uploadedFiles = uploadResults.filter((result)=>result !== null);
    console.log(`✅ Successfully uploaded ${uploadedFiles.length} files`);
    // Separate models and previews
    const modelFiles = uploadedFiles.filter((f)=>f.isModel);
    const previewFiles = uploadedFiles.filter((f)=>f.isPreview);
    // Return results
    return new Response(JSON.stringify({
      success: true,
      data: {
        promptId,
        executionTime: execution.status?.exec_time || 'unknown',
        totalFiles: uploadedFiles.length,
        models: modelFiles,
        previews: previewFiles,
        primaryModelUrl: modelFiles[0]?.publicUrl,
        primaryPreviewUrl: previewFiles[0]?.publicUrl,
        allFiles: uploadedFiles,
        comfyuiServer: COMFYUI_BASE_URL,
        workflowNodes: Object.keys(workflow).length,
        status: 'completed',
        workflow: 'hy3d-complete'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ ComfyUI Hy3D workflow error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      workflow: 'hy3d-complete'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
