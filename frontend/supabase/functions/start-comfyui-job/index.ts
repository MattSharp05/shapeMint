// supabase/functions/start-comfyui-job/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const COMFYUI_BASE_URL = 'http://comfy.tunell.live';

// ComfyUI Service Class (simplified for job starting)
class ComfyUIService {
  baseUrl;
  clientId;

  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.clientId = Math.random().toString(36).substring(7);
  }

  async uploadImage(imageFile) {
    console.log('📤 Uploading image to ComfyUI...');
    
    // Generate UUID for unique filename (Deno-compatible)
    let uuid;
    try {
      uuid = crypto.randomUUID();
      console.log('🔑 Using crypto.randomUUID()');
    } catch (error) {
      // Fallback UUID generation for Deno
      uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      console.log('🔑 Using fallback UUID generation');
    }
    const fileExtension = imageFile.name.split('.').pop() || 'jpg';
    const uniqueFilename = `${uuid}.${fileExtension}`;
    
    console.log(`🔑 Generated UUID filename: ${uniqueFilename}`);
    console.log(`📋 Original filename: ${imageFile.name}`);
    
    // Create FormData with custom filename
    const formData = new FormData();
    // Use Blob constructor for better Deno compatibility
    const fileBlob = new Blob([await imageFile.arrayBuffer()], { type: imageFile.type });
    formData.append('image', fileBlob, uniqueFilename);
    formData.append('type', 'input');
    formData.append('overwrite', 'true'); // Allow overwriting if filename exists
    
    console.log(`📦 FormData created with filename: ${uniqueFilename}`);
    console.log(`📊 Blob size: ${fileBlob.size} bytes, type: ${fileBlob.type}`);

    const response = await fetch(`${this.baseUrl}/upload/image`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Image uploaded - ComfyUI response:', result);
    console.log(`🔍 Expected UUID filename: ${uniqueFilename}`);
    console.log(`🎯 Actual filename from ComfyUI: ${result.name}`);
    
    // Verify the filename matches our UUID
    if (result.name === uniqueFilename) {
      console.log('✅ UUID filename successfully used by ComfyUI');
    } else {
      console.warn('⚠️ ComfyUI used different filename than our UUID!');
      console.warn(`Expected: ${uniqueFilename}, Got: ${result.name}`);
    }
    
    return result.name;
  }

  createWorkflow(imageName, options = {}) {
    // Generate UUID for unique output filenames
    let outputUuid;
    try {
      outputUuid = crypto.randomUUID();
      console.log('🔑 Generated output UUID for export nodes:', outputUuid);
    } catch (error) {
      // Fallback UUID generation for Deno
      outputUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      console.log('🔑 Generated fallback output UUID:', outputUuid);
    }
    
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
          "image": imageName || "default_placeholder.jpg"
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
          "filename_prefix": `testing/Hy3D_${outputUuid}`,
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
          "filename_prefix": `testing/Final_textured_${outputUuid}`,
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
    
    console.log(`📋 Export nodes configured with UUID: ${outputUuid}`);
    console.log(`  - Node 17: testing/Hy3D_${outputUuid}_00001_.glb`);
    console.log(`  - Node 99: testing/Final_textured_${outputUuid}_00001_.glb`);
    
    return { workflow, outputUuid };
  }

  async executeWorkflow(workflow) {
    console.log('🚀 Executing ComfyUI workflow...');
    console.log(`📋 LoadImage node config: ${JSON.stringify(workflow['13'])}`);
    
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
      const errorText = await response.text();
      console.error(`❌ Workflow execution failed: ${response.status} ${response.statusText}`);
      console.error(`❌ Error details: ${errorText}`);
      throw new Error(`Failed to execute workflow: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Workflow queued with ID:', result.prompt_id);
    console.log('📊 Full ComfyUI response:', result);
    return result.prompt_id;
  }
}

// Main Deno serve function
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('=== COMFYUI START JOB ===');
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing Supabase environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data
    const formData = await req.formData();
    const imageFile = formData.get('image');
    const userId = formData.get('user_id')?.toString();
    const prompt = formData.get('prompt')?.toString();
    const optionsStr = formData.get('options')?.toString() || '{}';
    
    let options = {};
    try {
      options = JSON.parse(optionsStr);
    } catch (e) {
      console.warn('Invalid options JSON, using defaults');
    }

    // Validate inputs
    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!imageFile && !prompt?.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either image file or text prompt is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📋 Request details:');
    console.log('  - Image:', imageFile ? `${imageFile.name} (${imageFile.size} bytes)` : 'None');
    console.log('  - User ID:', userId);
    console.log('  - Prompt:', prompt || 'None');
    console.log('  - Options:', options);

    // Initialize ComfyUI service
    const comfyUI = new ComfyUIService(COMFYUI_BASE_URL);

    // 1. Upload image to ComfyUI (if provided)
    let imageName = null;
    if (imageFile) {
      console.log(`📤 Processing image: ${imageFile.name} (${imageFile.size} bytes)`);
      imageName = await comfyUI.uploadImage(imageFile);
      console.log(`✅ Image uploaded with UUID filename: ${imageName}`);
    } else {
      console.log('❌ No image file provided');
      throw new Error('Image file is required for 3D generation');
    }

    // 2. Create workflow
    const { workflow, outputUuid } = comfyUI.createWorkflow(imageName, options);
    console.log(`📊 Created workflow with ${Object.keys(workflow).length} nodes`);
    console.log(`🖼️ Workflow configured to use UUID image: ${imageName}`);
    console.log(`🎯 Output files will use UUID: ${outputUuid}`);
    
    // Validate that the workflow has the correct image
    if (workflow['13']?.inputs?.image === imageName) {
      console.log('✅ LoadImage node correctly configured with UUID filename');
    } else {
      console.error('❌ LoadImage node configuration mismatch!');
      console.error(`Expected: ${imageName}, Got: ${workflow['13']?.inputs?.image}`);
    }

    // 3. Verify image exists before executing workflow
    console.log('🔍 Verifying UUID image exists on ComfyUI server...');
    try {
      const verifyResponse = await fetch(`${COMFYUI_BASE_URL}/view?filename=${imageName}&type=input`);
      console.log(`📡 Image verification status: ${verifyResponse.status}`);
      
      if (!verifyResponse.ok) {
        console.error(`❌ UUID image not found on ComfyUI server: ${verifyResponse.status}`);
        console.error(`🔗 Tried URL: ${COMFYUI_BASE_URL}/view?filename=${imageName}&type=input`);
        throw new Error(`Uploaded UUID image not accessible: ${verifyResponse.status}`);
      } else {
        console.log(`✅ UUID image verified and accessible on ComfyUI server`);
        const imageSize = verifyResponse.headers.get('content-length');
        console.log(`📊 Image size on server: ${imageSize} bytes`);
      }
    } catch (error) {
      console.error(`❌ Error verifying UUID image:`, error);
      throw new Error(`Failed to verify uploaded image: ${error.message}`);
    }

    // 4. Execute workflow and get prompt ID
    console.log('🚀 Executing workflow with verified UUID image...');
    const promptId = await comfyUI.executeWorkflow(workflow);

    // 4. Create job record in database
    const { data: job, error: jobError } = await supabase
      .from('hy_generated_jobs')
      .insert({
        user_id: userId,
        prompt_id: promptId,
        status: 'processing',
        progress: 10, // Initial progress
        prompt: prompt || null,
        image_filename: imageName,
        workflow_type: 'hy3d',
        workflow_nodes: Object.keys(workflow).length,
        comfyui_server: COMFYUI_BASE_URL,
        execution_time: outputUuid // Store outputUuid in execution_time field temporarily
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Failed to create job record:', jobError);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to create job record: ${jobError.message}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Job started successfully:', {
      jobId: job.id,
      promptId: promptId,
      workflowNodes: Object.keys(workflow).length
    });

    // Return job information immediately
    return new Response(JSON.stringify({
      success: true,
      data: {
        jobId: job.id,
        promptId: promptId,
        status: 'processing',
        progress: 10,
        workflowNodes: Object.keys(workflow).length,
        comfyuiServer: COMFYUI_BASE_URL,
        message: 'Job started successfully. Use polling to check progress.',
        estimatedTime: '5-15 minutes'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Start job error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      workflow: 'hy3d-start'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});