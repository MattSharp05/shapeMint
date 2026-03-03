import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useThumbnailGenerator } from '../hooks/useThumbnailGenerator';
import { GenerationForm, ModelDimensions } from '../components/Generation/GenerationForm';
import { GenerationProgress } from '../components/Generation/GenerationProgress';
import { ImageVariationPicker } from '../components/Generation/ImageVariationPicker';
import { ModelViewer } from '../components/3D/ModelViewer';
import { ThumbnailSelector } from '../components/UI/ThumbnailSelector';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Share2, ShoppingCart, Camera, Store, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { modelService } from '../services/modelService';
import { falImageService } from '../services/falImageService';
import { scaleAndUploadModel, ScaleResult } from '../utils/modelScaler';
import { useAuth } from '../hooks/useAuth';

export function Generate() {
  const [status, setStatus] = useState<'pending' | 'generating' | 'scaling' | 'repairing' | 'completed' | 'failed'>('pending');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedModel, setGeneratedModel] = useState<any>(null);
  const [repairReport, setRepairReport] = useState<any>(null);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [thumbnailData, setThumbnailData] = useState<{
    angles: { [angle: string]: string };
    selectedAngle: string;
    isCustom: boolean;
  } | null>(null);


  // Generation form state
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');

  // Image transform state (fal.ai pipeline)
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedImages, setTransformedImages] = useState<string[] | null>(null);
  const [transformError, setTransformError] = useState<string | null>(null);
  // Store the original inputs so we can regenerate
  const lastTransformInputs = useRef<{ image: string; prompt: string } | null>(null);

  // Model dimensions for scaling
  const [pendingDimensions, setPendingDimensions] = useState<ModelDimensions | null>(null);
  const [scaleInfo, setScaleInfo] = useState<ScaleResult | null>(null);

  const [prefilledData, setPrefilledData] = useState<{
    prefilledPrompt?: string;
    socialTag?: string;
    mode?: 'text' | 'image';
    image?: File;
  } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Extract prefilled data from navigation state
  useEffect(() => {
    if (location.state) {
      setPrefilledData(location.state);
    }
  }, [location.state]);

  // Client-side thumbnail generation (like working branch)
  const { isGenerating: isGeneratingThumbnails } = useThumbnailGenerator({ 
    uploadToStorage: false // Use data URLs for MVP speed
  });

  const repairDispatchedRef = useRef(false);

  const repairAndExportSTL = async (glbUrl: string, modelId: string, userId?: string) => {
    // Guard: only dispatch repair once per generation
    if (repairDispatchedRef.current) {
      console.log('🔧 Repair already dispatched, skipping duplicate call');
      return null;
    }
    repairDispatchedRef.current = true;

    try {
      console.log('🔧 Dispatching mesh repair...');
      setStatus('repairing');

      const { data, error } = await supabase.functions.invoke('repair-and-export-stl', {
        body: { glbUrl, modelId, userId }
      });

      if (error) {
        console.error('❌ Repair dispatch error:', error);
        repairDispatchedRef.current = false; // Allow retry on error
        return null;
      }

      if (data?.status === 'processing') {
        // Async flow: repair is running on Modal in the background
        // Modal will upload STL and update DB when done
        console.log('🔧 Repair dispatched to Modal. STL will be available at:', data.stlUrl);
        return data.stlUrl; // This URL will be valid once Modal finishes
      }

      if (!data?.success) {
        console.warn('⚠️ Repair dispatch issue:', data?.error);
        setRepairReport(data?.report || null);
        repairDispatchedRef.current = false;
        return null;
      }

      // Legacy sync response (if edge function waited for Modal)
      setRepairReport(data.report);
      return data.stlUrl;

    } catch (err) {
      console.error('❌ Repair error:', err);
      repairDispatchedRef.current = false; // Allow retry on error
      return null;
    }
  };

  /**
   * Scale the model to the user's specified dimensions (using Edge Function)
   */
  const applyModelScaling = async (
    glbUrl: string,
    modelId: string,
    dimensions: ModelDimensions
  ): Promise<{ scaledUrl: string; scaleResult: ScaleResult } | null> => {
    try {
      console.log('📐 Starting model scaling...', dimensions);
      setStatus('scaling');

      // Use Edge Function to scale model server-side (avoids CORS issues)
      const { data, error } = await supabase.functions.invoke('scale-model', {
        body: {
          glbUrl,
          modelId,
          userId: user?.id || '00000000-0000-0000-0000-000000000000',
          targetValue: dimensions.value,
          unit: dimensions.unit,
          target: dimensions.target
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to scale model');
      }

      if (!data || !data.success) {
        console.error('❌ Scaling failed:', data?.error);
        throw new Error(data?.error || 'Failed to scale model');
      }

      const { scaledUrl, originalDimensions, finalDimensions, scaleFactor } = data.data;

      // Dimensions are already in the requested unit from the edge function
      const scaleResult: ScaleResult = {
        scaledBlob: new Blob(), // Not needed when using edge function
        originalDimensions: {
          width: originalDimensions.width,
          height: originalDimensions.height,
          depth: originalDimensions.depth
        },
        finalDimensions: {
          width: finalDimensions.width,
          height: finalDimensions.height,
          depth: finalDimensions.depth
        },
        scaleFactor
      };

      console.log('✅ Model scaled successfully:', {
        originalDimensions: scaleResult.originalDimensions,
        finalDimensions: scaleResult.finalDimensions,
        scaleFactor: scaleResult.scaleFactor
      });

      setScaleInfo(scaleResult);
      return { scaledUrl, scaleResult };

    } catch (err) {
      console.error('❌ Model scaling error:', err);
      // Don't fail the whole generation - just use the original model
      return null;
    }
  };

  // Handle image/text transform request from GenerationForm
  // All generation paths now go through fal.ai first for 2D previews
  const handleImageTransformRequest = async (image: string | null, transformPrompt: string, dimensions: ModelDimensions) => {
    setIsTransforming(true);
    setTransformError(null);
    setTransformedImages(null);
    setPendingDimensions(dimensions);
    lastTransformInputs.current = { image: image || '', prompt: transformPrompt };

    try {
      console.log(`Starting ${image ? 'image transformation' : 'text-to-image generation'} via fal.ai...`);
      const result = await falImageService.transformImage(transformPrompt, image);
      setTransformedImages(result.images);
    } catch (err: any) {
      console.error('fal.ai generation failed:', err);
      setTransformError(err.message || 'Failed to generate previews. Please try again.');
    } finally {
      setIsTransforming(false);
    }
  };

  // Handle regenerating variations with the same inputs
  const handleRegenerateVariations = () => {
    if (lastTransformInputs.current) {
      handleImageTransformRequest(
        lastTransformInputs.current.image || null,
        lastTransformInputs.current.prompt,
        pendingDimensions || { value: 10, unit: 'cm', target: 'longest' }
      );
    }
  };

  // Handle user selecting a transformed image variation
  const handleVariationSelect = async (selectedImageUrl: string) => {
    console.log('User selected variation, sending to Meshy for 3D generation...');

    // Clear the variation picker
    setTransformedImages(null);

    // Set the selected image as the new image preview and trigger Meshy generation
    setImagePreview(selectedImageUrl);
    setStatus('generating');

    try {
      const modelData = await modelService.generate3DModel({
        type: 'image-to-3d',
        mode: 'preview',
        prompt: imagePrompt || 'AI-transformed image',
        image: selectedImageUrl,
        userId: user?.id,
      });

      // Clear form
      setImageFile(null);
      setImagePreview(null);
      setImagePrompt('');

      handleGenerationSuccess({
        ...modelData,
        prompt: imagePrompt || 'AI-transformed image',
        style: 'realistic',
        dimensions: pendingDimensions,
      });
    } catch (err: any) {
      console.error('3D generation from selected variation failed:', err);
      setStatus('failed');
    }
  };

  const handleGenerationSuccess = async (modelData: any) => {
    console.log('🎯 Model generation response:', modelData);
    repairDispatchedRef.current = false; // Reset for new generation

    // Store dimensions for later scaling
    // Capture dimensions in a local variable to avoid closure issues
    const dimensionsForScaling = modelData.dimensions || null;
    if (dimensionsForScaling) {
      console.log('📐 Storing dimensions for post-generation scaling:', dimensionsForScaling);
      setPendingDimensions(dimensionsForScaling);
    }

    // Check if this is a processing response (new immediate-return approach)
    if (modelData.data?.status === 'processing' && modelData.data?.taskId) {
      console.log('🔄 Model generation started, beginning polling for completion...');
      const taskId = modelData.data.taskId;
      const type = modelData.data.type;

      setStatus('generating');
      setGenerationProgress(0);

      // Start polling for completion using check-model-status edge function
      const pollForCompletion = async (taskId: string, type: 'text-to-3d' | 'image-to-3d', dimensions: ModelDimensions | null) => {
        const maxAttempts = 60; // 10 minutes max (10s interval)
        let attempts = 0;
        let intervalId: ReturnType<typeof setInterval> | null = null;
        let isProcessing = false; // Guard against concurrent checkStatus calls

        const checkStatus = async (): Promise<boolean> => {
          // Prevent overlapping calls from setInterval
          if (isProcessing) return false;

          if (attempts >= maxAttempts) {
            console.error('⏰ Polling timeout');
            setStatus('failed');
            return true; // Stop polling
          }

          try {
            console.log(`🔍 Polling attempt ${attempts + 1}/${maxAttempts} for task ${taskId}`);
            const statusResponse = await modelService.checkModelStatus(taskId, type);
            console.log('📊 Status data:', statusResponse);

            if (statusResponse?.status === 'completed') {
              // Mark as processing immediately to prevent duplicate calls
              isProcessing = true;
              if (intervalId) { clearInterval(intervalId); intervalId = null; }

              console.log('✅ Model generation complete!');

              let finalGlbUrl = statusResponse.model_url;
              let scaledInfo: ScaleResult | null = null;

              // Apply scaling if dimensions were specified
              if (dimensions && statusResponse.model_url) {
                console.log('📐 Applying scaling with dimensions:', dimensions);
                const scaleResult = await applyModelScaling(
                  statusResponse.model_url,
                  taskId,
                  dimensions
                );
                if (scaleResult) {
                  finalGlbUrl = scaleResult.scaledUrl;
                  scaledInfo = scaleResult.scaleResult;

                  console.log('💾 Updating database with scaled model URL...');

                  const { data: existingRecord, error: lookupError } = await supabase
                    .from('generated_models')
                    .select('id, meshy_task_id, glb_url, model_url')
                    .eq('id', taskId)
                    .single();

                  if (lookupError || !existingRecord) {
                    console.error('⚠️ Record not found with ID:', taskId, lookupError);
                  } else {
                    const { error: updateError } = await supabase
                      .from('generated_models')
                      .update({
                        glb_url: scaleResult.scaledUrl,
                        model_url: scaleResult.scaledUrl,
                        notes: `Scaled model. Original: ${statusResponse.model_url}. Target: ${dimensions.value}${dimensions.unit} ${dimensions.target}`,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', taskId)
                      .select();

                    if (updateError) {
                      console.error('⚠️ Failed to update database with scaled URL:', updateError);
                      if (existingRecord.meshy_task_id) {
                        await supabase
                          .from('generated_models')
                          .update({
                            glb_url: scaleResult.scaledUrl,
                            model_url: scaleResult.scaledUrl,
                            notes: `Scaled model. Original: ${statusResponse.model_url}. Target: ${dimensions.value}${dimensions.unit} ${dimensions.target}`,
                            updated_at: new Date().toISOString()
                          })
                          .eq('meshy_task_id', existingRecord.meshy_task_id)
                          .select();
                      }
                    } else {
                      console.log('✅ Database updated with scaled model URL');
                    }
                  }
                }
              }

              // Dispatch Blender mesh repair (async — Modal handles repair + upload + DB update)
              const stlUrl = await repairAndExportSTL(finalGlbUrl, taskId, user?.id);

              const finalModelData = {
                ...statusResponse,
                id: taskId,
                urls: {
                  glb: finalGlbUrl,
                  stl: stlUrl || undefined,
                  originalGlb: statusResponse.model_url
                },
                modelUrl: finalGlbUrl,
                originalModelUrl: statusResponse.model_url,
                scaleInfo: scaledInfo
              };
              setGeneratedModel(finalModelData);
              setStatus('completed');
              return true; // Stop polling
            } else if (statusResponse?.status === 'failed') {
              console.error('❌ Model generation failed:', statusResponse.error);
              setStatus('failed');
              return true; // Stop polling
            } else if (statusResponse?.status === 'processing') {
              if (typeof statusResponse.progress === 'number') {
                console.log(`⏳ Model generation is ${statusResponse.progress}% complete.`);
                setGenerationProgress(statusResponse.progress);
              } else {
                console.log('⏳ Model is still processing...');
              }
            }
          } catch (error) {
            console.error('Polling error:', error);
          }

          attempts++;
          return false; // Continue polling
        };

        // Perform the first check immediately
        const shouldStop = await checkStatus();

        // If the first check didn't resolve it, start the interval
        if (!shouldStop) {
          intervalId = setInterval(async () => {
            const stop = await checkStatus();
            if (stop && intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }, 10000);
        }
      };

      // Start polling in background, passing dimensions as parameter
      pollForCompletion(taskId, type, dimensionsForScaling);
      return;
    }
    
    // Handle legacy completed model response (if any)
    const mappedModelData = {
      ...modelData.data,
      id: modelData.data?.taskId,
      taskId: modelData.data?.taskId,
      urls: {
        glb: modelData.data?.modelUrl,
        stl: modelData.data?.stlUrl,
        obj: modelData.data?.objUrl,
        download: modelData.data?.downloadUrl
      },
      modelUrl: modelData.data?.modelUrl,
      downloadUrl: modelData.data?.downloadUrl,
      stlUrl: modelData.data?.stlUrl,
      objUrl: modelData.data?.objUrl
    };
    
    console.log('🔄 Mapped model data:', mappedModelData);
    
    setStatus('completed');
    setGeneratedModel(mappedModelData);
    
    // Start mesh repair and STL export if GLB URL is available
    if (mappedModelData.urls?.glb) {
      console.log('🔧 Starting mesh repair and STL export...');
      repairAndExportSTL(mappedModelData.urls.glb, mappedModelData.id, user?.id);
    }
    
    // Start server-side thumbnail generation via Edge function
    if (mappedModelData.urls?.glb) {
      console.log('🎨 Starting server-side thumbnail generation via Edge function...');
      // setIsGeneratingThumbnails(true); // This line is removed
      
      try {
        // Use client-side thumbnail generation for real 3D model screenshots
        const { ThumbnailGenerator, DEFAULT_CAMERA_ANGLES } = await import('../services/thumbnailGenerator');
        
        const generator = new ThumbnailGenerator({
          width: 400,
          height: 300,
          backgroundColor: '#f8fafc'
        });
        
        console.log('🎬 Generating real 3D thumbnails from GLB model...');
        
        // Generate thumbnails for multiple angles using original Meshy URL
        console.log('🎨 Loading model for thumbnails from:', mappedModelData.urls.glb);
        const thumbnails = await generator.generateAllThumbnails(mappedModelData.urls.glb, DEFAULT_CAMERA_ANGLES);
        
        // Clean up Three.js resources
        generator.dispose();
        
        if (thumbnails && Object.keys(thumbnails).length > 0) {
          setThumbnailData({
            angles: thumbnails,
            selectedAngle: Object.keys(thumbnails)[0] || 'front',
            isCustom: false
          });
          setShowThumbnailSelector(true);
          console.log('✅ Client-side 3D thumbnails generated successfully:', Object.keys(thumbnails));
        } else {
          console.log('⚠️ No thumbnails generated');
        }
      } catch (error) {
        console.error('Failed to generate client-side thumbnails:', error);
        // Continue without thumbnails - not a blocking error
      } finally {
        // setIsGeneratingThumbnails(false); // This line is removed
      }
    }
  };

  const handleBuyNow = () => {
    navigate('/download-checkout', {
      state: {
        modelData: {
          ...generatedModel,
          prompt: generatedModel?.prompt || 'Generated Model',
          settings: {
            style: 'realistic',
            quality: 'high',
            size: 'medium'
          }
        },
        modelUrl: generatedModel?.urls?.glb,
        stlUrl: generatedModel?.urls?.stl,
        price: 0, // Free for generated models
        isGenerated: true
      }
    });
  };

  const handlePublishToMarketplace = () => {
    navigate('/marketplace-upload', {
      state: {
        modelData: generatedModel,
        modelUrl: generatedModel?.urls?.glb
      }
    });
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Generate Your 3D Model
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your ideas into 3D reality with AI-powered generation in under 60 seconds
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generation Form */}
          <div className="space-y-6">
            {/* Show variation picker when we have transformed images */}
            {(transformedImages || isTransforming) ? (
              <Card className="p-6">
                <ImageVariationPicker
                  images={transformedImages || []}
                  onSelect={handleVariationSelect}
                  onRegenerate={handleRegenerateVariations}
                  loading={isTransforming}
                />
                {transformError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{transformError}</p>
                  </div>
                )}
                <button
                  onClick={() => { setTransformedImages(null); setTransformError(null); }}
                  className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Back to form
                </button>
              </Card>
            ) : (
              <GenerationForm
                onSuccess={handleGenerationSuccess}
                onImageTransformRequest={handleImageTransformRequest}
                prefilledData={prefilledData}
                mode={mode}
                setMode={setMode}
                prompt={prompt}
                setPrompt={setPrompt}
                imageFile={imageFile}
                setImageFile={setImageFile}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                isGenerating={status === 'generating'}
                isTransforming={isTransforming}
                imagePrompt={imagePrompt}
                setImagePrompt={setImagePrompt}
              />
            )}

            <GenerationProgress
              progress={status === 'completed' ? 100 : status === 'repairing' ? 95 : status === 'scaling' ? 90 : generationProgress}
              status={status === 'scaling' ? 'generating' : status}
              estimatedTime={status === 'scaling' ? 'Scaling model...' : status === 'repairing' ? 'Preparing for 3D printing...' : undefined}
            />
          </div>

          {/* Preview/Results */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                3D Preview
              </h3>
              <ModelViewer 
                modelUrl={generatedModel}
                className="h-80 w-full"
              />
            </Card>

            {status === 'completed' && generatedModel && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Model is Ready!
                </h3>
                
                {/* Thumbnail Generation Status */}
                {isGeneratingThumbnails && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <Camera className="h-4 w-4 text-blue-600 mr-2 animate-pulse" />
                      <span className="text-sm text-blue-700">Generating thumbnails...</span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  {/* Primary Action - Print This Design */}
                  <Button
                    icon={Printer}
                    className="w-full bg-brand-primary hover:bg-brand-primary-dark text-lg py-4"
                    onClick={() => navigate('/order', {
                      state: {
                        modelData: generatedModel,
                        modelUrl: generatedModel?.urls?.glb,
                      }
                    })}
                    size="lg"
                  >
                    Print
                  </Button>
                  
                  {/* Secondary Action - Buy Now */}
                  <Button
                    icon={ShoppingCart}
                    className="w-full bg-brand-accent text-gray-900 hover:bg-brand-accent-dark"
                    onClick={handleBuyNow}
                  >
                    Download
                  </Button>

                  {/* Tertiary Action - Publish to Marketplace */}
                  <Button
                    variant="outline"
                    icon={Store}
                    className="w-full border-brand-primary text-brand-primary hover:bg-brand-light"
                    onClick={handlePublishToMarketplace}
                  >
                    Publish to Marketplace
                  </Button>
                  
                  {/* Bottom Action - Share */}
                  <Button 
                    variant="outline" 
                    icon={Share2} 
                    className="w-full"
                  >
                    Share
                  </Button>
                </div>
                
                {repairReport && (
                  <div className={`p-3 rounded-lg border ${
                    repairReport.print_ready
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <h4 className="font-medium text-sm mb-2">
                      {repairReport.print_ready ? 'Print Ready' : 'Print Review Needed'}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>Manifold: {repairReport.is_manifold ? 'Yes' : 'No'}</div>
                      <div>Volume: {repairReport.volume_cm3?.toFixed(2)} cm3</div>
                      <div>Faces: {repairReport.output_face_count?.toLocaleString()}</div>
                      <div>Min wall: {repairReport.min_wall_thickness_mm?.toFixed(2)}mm</div>
                    </div>
                    {repairReport.warnings?.length > 0 && (
                      <div className="mt-2 text-xs text-yellow-700">
                        {repairReport.warnings.map((w: string, i: number) => (
                          <p key={i}>{w}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Model Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Format:</span>
                      <span className="ml-2 font-medium">GLB, STL</span>
                    </div>
                    {scaleInfo ? (
                      <>
                        <div>
                          <span className="text-gray-500">Height:</span>
                          <span className="ml-2 font-medium">{scaleInfo.finalDimensions.height.toFixed(1)} {pendingDimensions?.unit || 'cm'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Width:</span>
                          <span className="ml-2 font-medium">{scaleInfo.finalDimensions.width.toFixed(1)} {pendingDimensions?.unit || 'cm'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Depth:</span>
                          <span className="ml-2 font-medium">{scaleInfo.finalDimensions.depth.toFixed(1)} {pendingDimensions?.unit || 'cm'}</span>
                        </div>
                      </>
                    ) : pendingDimensions ? (
                      <div>
                        <span className="text-gray-500">Target {pendingDimensions.target}:</span>
                        <span className="ml-2 font-medium">{pendingDimensions.value} {pendingDimensions.unit}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-gray-500">Size:</span>
                        <span className="ml-2 font-medium">Original</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail Selector Modal */}
      {thumbnailData && (
        <ThumbnailSelector
          modelId={generatedModel?.id}
          angles={thumbnailData.angles}
          selectedAngle={thumbnailData.selectedAngle}
          onSelect={(angle) => {
            setThumbnailData(prev => prev ? { ...prev, selectedAngle: angle, isCustom: false } : null);
          }}
          onUpload={(_file) => {
            setThumbnailData(prev => prev ? { ...prev, isCustom: true } : null);
          }}
          onRemove={() => {
            setThumbnailData(prev => prev ? { ...prev, isCustom: false } : null);
          }}
          isOpen={showThumbnailSelector}
          onClose={() => setShowThumbnailSelector(false)}
          isCustom={thumbnailData.isCustom}
        />
      )}
    </div>
  );
}