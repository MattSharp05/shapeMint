// supabase/functions/poll-comfyui-job/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const COMFYUI_BASE_URL = 'http://comfy.tunell.live';

// Helper function to process ComfyUI outputs and upload to Supabase
async function processOutputFiles(execution, promptId, supabase, job) {
  console.log('📁 Processing output files...');
  
  if (!execution?.outputs) {
    throw new Error('No outputs found in execution');
  }

  const outputFiles: Array<{
    filename: string;
    type: string;
    nodeId: string;
  }> = [];
  
  // Extract file information from execution outputs
  console.log('🔍 Analyzing execution outputs...');
  console.log('📊 Available node IDs:', Object.keys(execution.outputs));
  
  Object.keys(execution.outputs).forEach((nodeId) => {
    const nodeOutput = execution.outputs[nodeId];
    console.log(`🔍 Node ${nodeId} output structure:`, {
      nodeId,
      keys: Object.keys(nodeOutput),
      hasImages: !!nodeOutput.images,
      hasGltf: !!nodeOutput.gltf,
      hasFiles: !!nodeOutput.files,
      fullOutput: nodeOutput
    });
    
    // Check for images
    if (nodeOutput.images) {
      nodeOutput.images.forEach((img) => {
        console.log(`📷 Found image in node ${nodeId}:`, img);
        if (img.filename) {
          outputFiles.push({
            filename: img.filename,
            type: 'image',
            nodeId: nodeId
          });
        }
      });
    }
    
    // Check for GLB files in gltf property
    if (nodeOutput.gltf) {
      nodeOutput.gltf.forEach((file) => {
        console.log(`🎯 Found GLTF in node ${nodeId}:`, file);
        if (file.filename) {
          outputFiles.push({
            filename: file.filename,
            type: 'model',
            nodeId: nodeId
          });
        }
      });
    }
    
    // Check for generic files (GLB might be here)
    if (nodeOutput.files) {
      nodeOutput.files.forEach((file) => {
        console.log(`📁 Found file in node ${nodeId}:`, file);
        if (file.filename) {
          outputFiles.push({
            filename: file.filename,
            type: 'file',
            nodeId: nodeId
          });
        }
      });
    }
    
    // Check ALL other properties for potential file outputs
    Object.keys(nodeOutput).forEach(key => {
      if (!['images', 'gltf', 'files'].includes(key) && Array.isArray(nodeOutput[key])) {
        console.log(`🔍 Checking unknown property '${key}' in node ${nodeId}:`, nodeOutput[key]);
        nodeOutput[key].forEach((item, index) => {
          if (item && typeof item === 'object' && item.filename) {
            console.log(`📦 Found file in '${key}' property:`, item);
            outputFiles.push({
              filename: item.filename,
              type: key,
              nodeId: nodeId
            });
          }
        });
      }
    });
  });

  console.log(`📄 Found ${outputFiles.length} output files:`, outputFiles.map(f => f.filename));
  console.log('📋 File details:', outputFiles.map(f => ({
    filename: f.filename,
    type: f.type,
    nodeId: f.nodeId,
    isIn3DFolder: f.filename.includes('3D/'),
    isGLB: f.filename.endsWith('.glb')
  })));
  
  // Special check for Hy3D export nodes
  const exportNodes = ['17', '99']; // The Hy3DExportMesh nodes
  exportNodes.forEach(nodeId => {
    if (execution.outputs[nodeId]) {
      console.log(`🎯 Special check for Hy3D export node ${nodeId}:`, execution.outputs[nodeId]);
    } else {
      console.log(`❌ Export node ${nodeId} not found in outputs`);
    }
  });
  
  // If no GLB files found, let's check the entire execution structure
  if (outputFiles.filter(f => f.filename.endsWith('.glb')).length === 0) {
    console.log('❌ No GLB files detected! Full execution structure:');
    console.log(JSON.stringify(execution, null, 2));
  }

  // Filter to only process GLB files (skip intermediate PNG files)
  const glbFiles: Array<{
    filename: string;
    type: string;
    nodeId: string;
  }> = outputFiles.filter(fileInfo => 
    fileInfo.filename.toLowerCase().endsWith('.glb')
  );
  
  console.log(`📦 Processing ${glbFiles.length} GLB files (skipping ${outputFiles.length - glbFiles.length} intermediate files)`);
  
  // If no GLB files found in outputs, try direct file detection
  if (glbFiles.length === 0) {
    console.log('⚠️ No GLB files found in execution outputs, attempting direct file detection...');
    
    // Dynamic file detection using UUID from job data
    // ComfyUI increments counter with each generation (00001, 00002, 00003, etc.)
    // All outputs are now redirected to testing subfolder with UUID naming
    const outputUuid = job.execution_time; // UUID stored in execution_time field
    console.log(`🔑 Using output UUID from job: ${outputUuid}`);
    
    const basePatterns = [
      { subfolder: 'testing', prefix: `Hy3D_${outputUuid}_`, nodeId: '17' },
      { subfolder: 'testing', prefix: `Final_textured_${outputUuid}_`, nodeId: '99' }
    ];
    
    const detectedFiles = [];
    
    // Try counter values from 00001 to 00020 (should cover most cases)
    for (const pattern of basePatterns) {
      let found = false;
      
      for (let counter = 1; counter <= 20 && !found; counter++) {
        const paddedCounter = counter.toString().padStart(5, '0');
        const filename = `${pattern.prefix}${paddedCounter}_.glb`;
        const fullPath = `${pattern.subfolder}/${filename}`;
        
        try {
          console.log(`🔍 Checking for file: ${fullPath}`);
          
          // Build the download URL
          const params = new URLSearchParams({
            filename: filename,
            subfolder: pattern.subfolder,
            type: 'output',
            download: 'true'
          });
          
          const testUrl = `${COMFYUI_BASE_URL}/view?${params}`;
          console.log(`🔗 Testing URL: ${testUrl}`);
          
          // Try a HEAD request to check if file exists
          const testResponse = await fetch(testUrl, { method: 'HEAD' });
          
          if (testResponse.ok) {
            console.log(`✅ Found file: ${fullPath}`);
            detectedFiles.push({
              filename: fullPath,
              type: 'model',
              nodeId: pattern.nodeId
            });
            found = true; // Stop checking higher counters for this pattern
          } else {
            console.log(`❌ File not found: ${fullPath} (${testResponse.status})`);
          }
          
        } catch (error) {
          console.log(`❌ Error checking file ${fullPath}:`, error.message);
        }
      }
      
      if (!found) {
        console.log(`⚠️ No files found for pattern: ${pattern.subfolder}/${pattern.prefix}*_.glb`);
      }
    }
    
    // Add detected files to glbFiles array
    glbFiles.push(...detectedFiles);
    console.log(`🎯 Detected ${detectedFiles.length} GLB files dynamically`);
    
    // Legacy fallback for backward compatibility
    if (detectedFiles.length === 0) {
      console.log('🔄 Falling back to legacy static file detection...');
      const expectedFiles = outputUuid ? [
        `testing/Hy3D_${outputUuid}_00001_.glb`,              // From node 17
        `testing/Final_textured_${outputUuid}_00001_.glb`     // From node 99
      ] : [
        'testing/Hy3D_00001_.glb',              // Legacy fallback
        'testing/Final_textured_00001_.glb'     // Legacy fallback
      ];
      
      for (const expectedFile of expectedFiles) {
      try {
        console.log(`🔍 Checking for file: ${expectedFile}`);
        
        // Parse the filename
        let subfolder = '';
        let actualFilename = expectedFile;
        
        if (expectedFile.includes('/')) {
          const parts = expectedFile.split('/');
          if (parts.length === 2) {
            subfolder = parts[0];
            actualFilename = parts[1];
          }
        }
        
        // Build the download URL
        const params = new URLSearchParams({
          filename: actualFilename,
          subfolder: subfolder,
          type: 'output',
          download: 'true'
        });
        
        const testUrl = `${COMFYUI_BASE_URL}/view?${params}`;
        console.log(`🔗 Testing URL: ${testUrl}`);
        
        // Try a HEAD request to check if file exists without downloading
        const testResponse = await fetch(testUrl, { method: 'HEAD' });
        
        if (testResponse.ok) {
          console.log(`✅ Found file: ${expectedFile}`);
          glbFiles.push({
            filename: expectedFile,
            type: 'model',
            nodeId: expectedFile.includes('Final_textured') ? '99' : '17'
          });
        } else {
          console.log(`❌ File not found: ${expectedFile} (${testResponse.status})`);
        }
        
      } catch (error) {
        console.log(`❌ Error checking file ${expectedFile}:`, error.message);
      }
    }
    }
    
    console.log(`🎯 Detected ${glbFiles.length} GLB files directly from server`);
  }
  
  // Download and upload only GLB files
  const uploadPromises = glbFiles.map(async (fileInfo, index) => {
    try {
      console.log(`⬇️ Downloading file: ${fileInfo.filename}`);
      
      // Handle subfolder for 3D files - extract subfolder and filename properly
      let subfolder = '';
      let actualFilename = fileInfo.filename;
      
      if (fileInfo.filename.includes('/')) {
        const parts = fileInfo.filename.split('/');
        if (parts.length === 2) {
          subfolder = parts[0]; // e.g., "3D"
          actualFilename = parts[1]; // e.g., "Hy3D_textured_00001_.glb"
        }
      }
      
      // Build proper download URL with all required parameters
      const params = new URLSearchParams({
        filename: actualFilename,
        subfolder: subfolder, // Always include subfolder parameter
        type: 'output',
        download: 'true' // This is crucial for proper file download
      });

      const downloadUrl = `${COMFYUI_BASE_URL}/view?${params}`;
      console.log(`📡 Attempting download from: ${downloadUrl}`);
      console.log(`📂 File parsing: original="${fileInfo.filename}" → subfolder="${subfolder}" + filename="${actualFilename}"`);

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        console.error(`❌ Download failed for ${fileInfo.filename}:`, {
          status: response.status,
          statusText: response.statusText,
          url: downloadUrl,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        // Try to get response body for more details
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error(`❌ Error response body:`, errorText);
        
        throw new Error(`Failed to download file ${fileInfo.filename}: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const fileBlob = await response.blob();
      console.log(`✅ Downloaded ${fileInfo.filename}: ${fileBlob.size} bytes`);
      
      // Validate blob content
      if (fileBlob.size === 0) {
        throw new Error(`Downloaded file ${fileInfo.filename} is empty (0 bytes)`);
      }
      
      const fileExtension = actualFilename.split('.').pop() || 'bin';
      
      // Create storage filename with better organization
      const storageFilename = `comfyui-jobs/${promptId}/${index}_${actualFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      console.log(`📤 Uploading to storage: ${storageFilename}`);
      console.log(`📊 Upload details:`, {
        bucket: 'hy-3d-models',
        filename: storageFilename,
        size: fileBlob.size,
        contentType: getContentType(fileExtension)
      });
      
      const uploadResult = await supabase.storage
        .from('hy-3d-models')
        .upload(storageFilename, fileBlob, {
          contentType: getContentType(fileExtension),
          cacheControl: '3600',
          upsert: true
        });

      if (uploadResult.error) {
        console.error(`❌ Upload failed for ${fileInfo.filename}:`, {
          error: uploadResult.error,
          supabaseErrorCode: uploadResult.error.statusCode,
          supabaseErrorMessage: uploadResult.error.message
        });
        throw new Error(`Upload failed for ${fileInfo.filename}: ${uploadResult.error.message}`);
      }
      
      console.log(`📁 Upload successful:`, uploadResult.data);

      const publicUrl = supabase.storage
        .from('hy-3d-models')
        .getPublicUrl(storageFilename).data.publicUrl;

      console.log(`✅ Successfully processed ${fileInfo.filename} -> ${publicUrl}`);

      return {
        originalFilename: fileInfo.filename,
        storageFilename,
        publicUrl,
        fileExtension,
        size: fileBlob.size,
        nodeId: fileInfo.nodeId,
        type: fileInfo.type,
        isModel: fileExtension === 'glb',
        isPreview: ['png', 'jpg', 'jpeg'].includes(fileExtension.toLowerCase())
      };
    } catch (error) {
      console.error(`❌ Failed to process file ${fileInfo.filename}:`, error);
      return null;
    }
  });

  const uploadResults = await Promise.all(uploadPromises);
  const uploadedFiles = uploadResults.filter(result => result !== null);
  
  console.log(`✅ Successfully uploaded ${uploadedFiles.length} files`);
  return uploadedFiles;
}

function getContentType(fileExtension) {
  const ext = fileExtension.toLowerCase();
  switch (ext) {
    case 'glb':
      return 'model/gltf-binary';
    case 'obj':
      return 'model/obj';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
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

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed. Use GET to poll job status.'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('=== COMFYUI POLL JOB STATUS ===');
    
    // Get job ID from query parameters
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Job ID is required as query parameter'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    // Get job from database
    const { data: job, error: jobError } = await supabase
      .from('hy_generated_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Job not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 Checking job status: ${job.id} (${job.status})`);

    // If job is already completed or failed, return cached results
    if (job.status === 'completed') {
      return new Response(JSON.stringify({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          progress: job.progress,
          primaryModelUrl: job.primary_model_url,
          primaryPreviewUrl: job.primary_preview_url,
          allFiles: job.output_files || [],
          executionTime: job.execution_time,
          workflowNodes: job.workflow_nodes,
          comfyuiServer: job.comfyui_server,
          message: 'Generation completed successfully'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (job.status === 'failed') {
      return new Response(JSON.stringify({
        success: false,
        error: job.error_message || 'Generation failed',
        data: {
          jobId: job.id,
          status: job.status,
          progress: job.progress
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check ComfyUI status for processing jobs
    console.log(`🔍 Checking ComfyUI status for prompt: ${job.prompt_id}`);
    
    const historyResponse = await fetch(`${COMFYUI_BASE_URL}/history`);
    if (!historyResponse.ok) {
      throw new Error(`Failed to check ComfyUI status: ${historyResponse.status}`);
    }

    const history = await historyResponse.json();
    const execution = history[job.prompt_id];

    if (!execution) {
      // Still processing - increment progress slightly
      const newProgress = Math.min(job.progress + 5, 85);
      
      await supabase
        .from('hy_generated_jobs')
        .update({
          progress: newProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return new Response(JSON.stringify({
        success: true,
        data: {
          jobId: job.id,
          status: 'processing',
          progress: newProgress,
          message: 'Workflow still processing in ComfyUI...',
          estimatedTimeRemaining: '5-10 minutes'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if workflow completed successfully
    if (execution.outputs) {
      console.log('✅ Workflow completed! Processing outputs...');
      
      // Check execution status and which nodes ran
      console.log('📊 Execution status:', execution.status);
      console.log('📈 Executed nodes:', Object.keys(execution.outputs));
      console.log('🎯 Looking for export nodes 17 and 99 in executed nodes...');
      
      // Check if our target export nodes executed
      const exportNodesExecuted = ['17', '99'].filter(nodeId => 
        Object.keys(execution.outputs).includes(nodeId)
      );
      console.log(`📦 Export nodes that executed: ${exportNodesExecuted.join(', ') || 'NONE'}`);
      
      if (exportNodesExecuted.length === 0) {
        console.log('❌ CRITICAL: No export nodes executed! Workflow may have failed before GLB generation.');
        console.log('🔍 All executed nodes:', Object.keys(execution.outputs));
        
        // Check for any error messages in the execution
        if (execution.status && execution.status.messages) {
          console.log('📝 Execution messages:', execution.status.messages);
        }
      }
      
      try {
        // Process outputs and upload to storage
        const uploadedFiles = await processOutputFiles(execution, job.prompt_id, supabase, job);
        
        // Find primary model - prioritize Final_textured model over base Hy3D model
        const jobOutputUuid = job.execution_time; // Get UUID from job data
        const texturedModel = uploadedFiles.find(f => 
          f.isModel && (f.originalFilename.includes('Final_textured') || (jobOutputUuid && f.originalFilename.includes(`Final_textured_${jobOutputUuid}`)))
        );
        const primaryModel = texturedModel || uploadedFiles.find(f => f.isModel);
        
        // No preview files since we're only processing GLB files
        const primaryPreview = null;
        
        // Update job status to completed
        const { error: updateError } = await supabase
          .from('hy_generated_jobs')
          .update({
            status: 'completed',
            progress: 100,
            output_files: uploadedFiles,
            primary_model_url: primaryModel?.publicUrl || null,
            primary_preview_url: primaryPreview?.publicUrl || null,
            execution_time: execution.status?.exec_time || 'unknown',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        if (updateError) {
          console.error('❌ Failed to update job status:', updateError);
        }

        return new Response(JSON.stringify({
          success: true,
          data: {
            jobId: job.id,
            status: 'completed',
            progress: 100,
            primaryModelUrl: primaryModel?.publicUrl || null,
            primaryPreviewUrl: primaryPreview?.publicUrl || null,
            allFiles: uploadedFiles,
            executionTime: execution.status?.exec_time || 'unknown',
            workflowNodes: job.workflow_nodes,
            comfyuiServer: job.comfyui_server,
            message: 'Generation completed successfully',
            totalFiles: uploadedFiles.length,
            models: uploadedFiles.filter(f => f.isModel),
            previews: uploadedFiles.filter(f => f.isPreview)
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (processingError) {
        console.error('❌ Error processing outputs:', processingError);
        
        // Mark job as failed
        await supabase
          .from('hy_generated_jobs')
          .update({
            status: 'failed',
            error_message: `Output processing failed: ${processingError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        return new Response(JSON.stringify({
          success: false,
          error: `Output processing failed: ${processingError.message}`,
          data: {
            jobId: job.id,
            status: 'failed'
          }
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Check for workflow errors
    if (execution.status?.status_str === 'error') {
      const errorMessage = execution.status.messages?.join(', ') || 'Unknown workflow error';
      
      await supabase
        .from('hy_generated_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return new Response(JSON.stringify({
        success: false,
        error: `Workflow failed: ${errorMessage}`,
        data: {
          jobId: job.id,
          status: 'failed'
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Workflow is still running
    const newProgress = Math.min(job.progress + 3, 90);
    
    await supabase
      .from('hy_generated_jobs')
      .update({
        progress: newProgress,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return new Response(JSON.stringify({
      success: true,
      data: {
        jobId: job.id,
        status: 'processing',
        progress: newProgress,
        message: 'Workflow is running in ComfyUI...',
        estimatedTimeRemaining: '3-8 minutes'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Poll job error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      workflow: 'hy3d-poll'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});