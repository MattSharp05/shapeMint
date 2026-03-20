import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { GenerationForm, ModelDimensions } from '../components/Generation/GenerationForm';
import { GenerationProgress } from '../components/Generation/GenerationProgress';
import { ImageVariationPicker } from '../components/Generation/ImageVariationPicker';
import { Card } from '../components/UI/Card';
import { Info, Loader2 } from 'lucide-react';
import { FadeIn, FadeInUp } from '../components/Motion';
import { supabase } from '../supabaseClient';
import { modelService } from '../services/modelService';
import { falImageService } from '../services/falImageService';
import { ScaleResult } from '../utils/modelScaler';
import { useAuth } from '../hooks/useAuth';
import { InfoCollection, CollectedInfo } from '../components/Generation/InfoCollection';
import { getQuote as getCraftcloudQuote } from '../services/craftcloud';

// System prompt for generating 4 angle views from a reference image
const ANGLE_SYSTEM_PROMPT = `You are an expert image-generation engine. You must ALWAYS produce an image. Produce NO TEXT. Just an Image.

You are creating various views of a 3D object that will be used for 3D rendering. Therefore be extremely consistent with the object.

Do NOT change details, or add features that are not in the reference image.
Include minimal shadows and flat uniform lighting, which only accentuates geometry.`;

const ANGLE_PROMPTS = [
  'Rotate the view to look straight on at the object.',
  'Rotate the view to look straight at the back of the object.',
  'Create a side view of this character. Rotating the camera exactly 90 degrees from the front perspective. (Do not add Ears if they are not in the reference image)',
  'Create the missing view of this character. There should be Front, Back, Left.',
];

const ANGLE_LABELS = ['Front', 'Back', 'Left', 'Right'];

// CraftCloud material config IDs
const COLOR_CONFIG_ID = 'a69b05d8-39b9-5f3e-bd47-9df42b4b84c3';
const MONO_CONFIG_ID = '6250ed03-5e96-5de8-bf06-44a13b952058';  // SLA Resin
const SLS_CONFIG_ID = '6c633df0-aca1-5b95-aaab-5c19b4e0d24f';   // SLS Nylon PA12

export function Generate() {
  const [status, setStatus] = useState<'pending' | 'info_collection' | 'generating_angles' | 'generating' | 'scaling' | 'completed' | 'failed'>('pending');
  const [generationProgress, setGenerationProgress] = useState(0);

  // Multi-angle state
  const [angleImages, setAngleImages] = useState<string[] | null>(null);
  const [angleError, setAngleError] = useState<string | null>(null);

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

  // ── New flow state ──────────────────────────────────────────────────
  const [selectedVariationUrl, setSelectedVariationUrl] = useState<string | null>(null);
  const selectedVariationUrlRef = useRef<string | null>(null);
  const collectedInfoRef = useRef<CollectedInfo | null>(null);

  // Extract prefilled data or existing model from navigation state
  useEffect(() => {
    if (location.state?.existingModel) {
      // Coming from Dashboard with an existing completed model — redirect to model page
      const model = location.state.existingModel;
      if (model.id) {
        navigate(`/model/${model.id}`, { replace: true });
      }
    } else if (location.state) {
      setPrefilledData(location.state);
    }
  }, [location.state, navigate]);

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

  // Handle user selecting a transformed image variation — generate angle views
  const handleVariationSelect = async (selectedImageUrl: string) => {
    console.log('User selected variation, generating angle views...');
    setSelectedVariationUrl(selectedImageUrl);
    selectedVariationUrlRef.current = selectedImageUrl;
    setTransformedImages(null);
    setAngleImages(null);
    setAngleError(null);
    setStatus('generating_angles');

    try {
      // Generate 4 angle views in parallel
      const promises = ANGLE_PROMPTS.map((anglePrompt, i) => {
        console.log(`Generating ${ANGLE_LABELS[i]} view...`);
        return falImageService.transformImage(
          anglePrompt,
          selectedImageUrl,
          {
            systemPrompt: ANGLE_SYSTEM_PROMPT,
            numImages: 1,
            resolution: '1K',
            aspectRatio: '1:1',
            outputFormat: 'png',
          }
        ).then(result => {
          if (result.images.length > 0) {
            console.log(`${ANGLE_LABELS[i]} view generated`);
            return result.images[0];
          }
          throw new Error(`No image returned for ${ANGLE_LABELS[i]} view`);
        });
      });

      const generatedAngles = await Promise.all(promises);
      console.log(`All ${generatedAngles.length} angle views generated`);
      setAngleImages(generatedAngles);
      setStatus('info_collection');
    } catch (err: any) {
      console.error('Angle generation failed:', err);
      setAngleError(err.message || 'Failed to generate angle views.');
      setStatus('info_collection'); // Still proceed to info collection, will use single image fallback
    }
  };

  // Handle info collection submission — create account, then start 3D generation
  const handleInfoSubmit = async (info: CollectedInfo) => {
    console.log('Info collected, starting 3D generation...');
    collectedInfoRef.current = info;

    setImagePreview(selectedVariationUrl);
    setStatus('generating');

    try {
      // Use multi-image-to-3d if angle images are available, otherwise fallback to single image
      const useMultiImage = angleImages && angleImages.length === 4;
      console.log(useMultiImage
        ? `Sending ${angleImages!.length} angle images to Meshy (multi-image-to-3d)`
        : 'Sending single reference image to Meshy (image-to-3d)');

      const modelData = await modelService.generate3DModel({
        type: useMultiImage ? 'multi-image-to-3d' : 'image-to-3d',
        mode: 'preview',
        prompt: imagePrompt || prompt || 'AI-generated design',
        image: useMultiImage ? angleImages! : selectedVariationUrl!,
        userId: info.userId,
      });

      if (!modelData.success) {
        console.error('3D generation returned error:', modelData.error);
        setStatus('failed');
        return;
      }

      // Clear form
      setImageFile(null);
      setImagePreview(null);
      setImagePrompt('');

      handleGenerationSuccess({
        ...modelData,
        prompt: imagePrompt || prompt || 'AI-generated design',
        style: 'realistic',
        dimensions: pendingDimensions,
      });
    } catch (err: any) {
      console.error('3D generation failed:', err);
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
      const pollForCompletion = async (taskId: string, type: 'text-to-3d' | 'image-to-3d' | 'multi-image-to-3d', dimensions: ModelDimensions | null) => {
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
                    // Keep glb_url as the original colored model for display
                    // Store scaled version in model_url for ordering/quoting
                    const { error: updateError } = await supabase
                      .from('generated_models')
                      .update({
                        model_url: scaleResult.scaledUrl,
                        stl_url: scaleResult.scaledUrl,
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
                            model_url: scaleResult.scaledUrl,
                            stl_url: scaleResult.scaledUrl,
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

              // Save shipping info and selected 2D preview to DB
              const info = collectedInfoRef.current;
              if (info) {
                const updatePayload: Record<string, any> = {
                  shipping_info: {
                    firstName: info.firstName,
                    lastName: info.lastName,
                    phone: info.phone,
                    address1: info.address1,
                    address2: info.address2,
                    city: info.city,
                    state: info.state,
                    postalCode: info.postalCode,
                    email: info.email,
                  },
                  user_id: info.userId,
                };
                if (selectedVariationUrlRef.current) {
                  updatePayload.selected_2d_preview = selectedVariationUrlRef.current;
                }
                const { error: updateError } = await supabase
                  .from('generated_models')
                  .update(updatePayload)
                  .eq('id', taskId);
                if (updateError) {
                  console.error('Failed to save shipping info to model:', updateError);
                } else {
                  console.log('✅ Shipping info saved to model', taskId);
                }
              }

              // Fetch CraftCloud quotes for Color + Mono in parallel using the GLB
              if (info) {
                const addr = {
                  firstName: info.firstName,
                  lastName: info.lastName,
                  email: info.email,
                  address1: info.address1,
                  city: info.city,
                  state: info.state,
                  zipCode: info.postalCode,
                  country: 'US',
                  phone: info.phone,
                };

                console.log('💰 Fetching CraftCloud quotes in parallel...');
                const [colorResult, monoResult, slsResult] = await Promise.allSettled([
                  getCraftcloudQuote({ modelUrl: finalGlbUrl, materialConfigId: COLOR_CONFIG_ID, quantity: 1, shippingAddress: addr }),
                  getCraftcloudQuote({ modelUrl: finalGlbUrl, materialConfigId: MONO_CONFIG_ID, quantity: 1, shippingAddress: addr }),
                  getCraftcloudQuote({ modelUrl: finalGlbUrl, materialConfigId: SLS_CONFIG_ID, quantity: 1, shippingAddress: addr }),
                ]);

                const quoteUpdate: Record<string, any> = {};

                if (colorResult.status === 'fulfilled' && colorResult.value.vendorOptions?.length > 0) {
                  quoteUpdate.color_quotes = {
                    vendors: colorResult.value.vendorOptions,
                    craftcloudPriceId: colorResult.value.craftcloudPriceId,
                    currency: colorResult.value.currency || 'USD',
                  };
                  console.log('✅ Color quotes:', colorResult.value.vendorOptions.length, 'vendors');
                } else {
                  console.warn('⚠️ Color quote failed:', colorResult.status === 'rejected' ? colorResult.reason : 'No vendors');
                }

                if (monoResult.status === 'fulfilled' && monoResult.value.vendorOptions?.length > 0) {
                  quoteUpdate.mono_quotes = {
                    vendors: monoResult.value.vendorOptions,
                    craftcloudPriceId: monoResult.value.craftcloudPriceId,
                    currency: monoResult.value.currency || 'USD',
                  };
                  console.log('✅ Mono quotes:', monoResult.value.vendorOptions.length, 'vendors');
                } else {
                  console.warn('⚠️ Mono quote failed:', monoResult.status === 'rejected' ? monoResult.reason : 'No vendors');
                }

                if (slsResult.status === 'fulfilled' && slsResult.value.vendorOptions?.length > 0) {
                  quoteUpdate.sls_quotes = {
                    vendors: slsResult.value.vendorOptions,
                    craftcloudPriceId: slsResult.value.craftcloudPriceId,
                    currency: slsResult.value.currency || 'USD',
                  };
                  console.log('✅ SLS quotes:', slsResult.value.vendorOptions.length, 'vendors');
                } else {
                  console.warn('⚠️ SLS quote failed:', slsResult.status === 'rejected' ? slsResult.reason : 'No vendors');
                }

                if (Object.keys(quoteUpdate).length > 0) {
                  const { error: quoteSaveError } = await supabase
                    .from('generated_models')
                    .update(quoteUpdate)
                    .eq('id', taskId);
                  if (quoteSaveError) {
                    console.error('Failed to save quotes:', quoteSaveError);
                  } else {
                    console.log('✅ Quotes saved to DB');
                  }
                }

                // Send "model ready" email (fire and forget)
                const colorQuoteData = colorResult.status === 'fulfilled' && colorResult.value.vendorOptions?.length > 0
                  ? { totalPrice: colorResult.value.vendorOptions[0].totalPrice, vendorId: colorResult.value.vendorOptions[0].vendorId }
                  : undefined;
                const monoQuoteData = monoResult.status === 'fulfilled' && monoResult.value.vendorOptions?.length > 0
                  ? { totalPrice: monoResult.value.vendorOptions[0].totalPrice, vendorId: monoResult.value.vendorOptions[0].vendorId }
                  : undefined;
                const slsQuoteData = slsResult.status === 'fulfilled' && slsResult.value.vendorOptions?.length > 0
                  ? { totalPrice: slsResult.value.vendorOptions[0].totalPrice, vendorId: slsResult.value.vendorOptions[0].vendorId }
                  : undefined;

                supabase.functions.invoke('send-model-ready-email', {
                  body: {
                    email: info.email,
                    firstName: info.firstName,
                    modelId: taskId,
                    prompt: imagePrompt || prompt || 'AI-generated design',
                    thumbnailUrl: selectedVariationUrlRef.current || undefined,
                    colorQuote: colorQuoteData,
                    monoQuote: monoQuoteData,
                    slsQuote: slsQuoteData,
                  },
                }).catch(err => console.error('Email send failed:', err));

                // Send "model ready" SMS if user opted in (fire and forget)
                if (info.smsOptIn && info.phone) {
                  supabase.functions.invoke('send-model-ready-sms', {
                    body: {
                      to: info.phone,
                      modelId: taskId,
                      recipientName: info.firstName,
                    },
                  }).catch(err => console.error('SMS send failed:', err));
                }
              }

              // Redirect to the shareable model result page
              navigate(`/model/${taskId}`);
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
    const modelId = modelData.data?.taskId;
    console.log('🔄 Legacy immediate completion, model ID:', modelId);

    // Save shipping info to DB if available
    const info = collectedInfoRef.current;
    if (info && modelId) {
      const updatePayload: Record<string, any> = {
        shipping_info: {
          firstName: info.firstName,
          lastName: info.lastName,
          phone: info.phone,
          address1: info.address1,
          address2: info.address2,
          city: info.city,
          state: info.state,
          postalCode: info.postalCode,
          email: info.email,
        },
        user_id: info.userId,
      };
      if (selectedVariationUrlRef.current) {
        updatePayload.selected_2d_preview = selectedVariationUrlRef.current;
      }
      await supabase.from('generated_models').update(updatePayload).eq('id', modelId);
    }

    // Redirect to model result page
    if (modelId) {
      navigate(`/model/${modelId}`);
    }
  };


  const isWorking = status === 'generating' || status === 'scaling';

  // ── Generating angle views ──────────────────────────────────────────
  if (status === 'generating_angles' && selectedVariationUrl) {
    return (
      <div className="pt-16 min-h-screen bg-brand-dark">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center">
            <div className="mb-6">
              <img src={selectedVariationUrl} alt="Selected design" className="w-32 h-32 object-cover rounded-xl mx-auto shadow-lg" />
            </div>
            <Loader2 className="h-8 w-8 text-brand-accent animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Generating Angle Views</h2>
            <p className="text-white/40 text-sm">Creating front, back, left, and right views of your design...</p>
            <p className="text-white/30 text-xs mt-2">This may take 30-60 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Info collection view ──────────────────────────────────────────────
  if (status === 'info_collection' && selectedVariationUrl) {
    return (
      <InfoCollection
        selectedImage={selectedVariationUrl}
        prompt={imagePrompt || prompt || 'AI-generated design'}
        onSubmit={handleInfoSubmit}
        loading={false}
        angleImages={angleImages}
        angleLabels={ANGLE_LABELS}
      />
    );
  }

  // ── Pre-generation view ──────────────────────────────────────────────
  if (!isWorking && status === 'pending') {
    return (
      <div className="pt-16 min-h-screen bg-brand-dark">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <FadeIn y={16} delay={0.1}>
            <div className="text-center mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                Create Your Design
              </h1>
              <p className="text-white/40">
                Describe what you want or upload a reference image
              </p>
            </div>
          </FadeIn>

          <FadeInUp delay={0.25}>
            {/* Variation picker or generation form */}
            {(transformedImages || isTransforming) ? (
              <Card className="p-6 bg-brand-dark-card border-white/5">
                <ImageVariationPicker
                  images={transformedImages || []}
                  onSelect={handleVariationSelect}
                  onRegenerate={handleRegenerateVariations}
                  loading={isTransforming}
                />
                {transformError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-500/30">
                    <p className="text-sm text-red-400">{transformError}</p>
                  </div>
                )}
                <button
                  onClick={() => { setTransformedImages(null); setTransformError(null); }}
                  className="mt-3 text-sm text-white/40 hover:text-white/70 underline"
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
          </FadeInUp>

          {/* Estimated pricing hint */}
          <FadeIn delay={0.4} y={12}>
            <div className="mt-8 flex items-start gap-3 p-4 bg-brand-accent/5 border border-brand-accent/10 rounded-xl">
              <Info className="h-4 w-4 text-brand-accent mt-0.5 shrink-0" />
              <div className="text-sm text-white/50">
                <p className="font-medium text-white/70 mb-1">Estimated pricing</p>
                <p>3D prints start around <span className="font-semibold text-white/70">$20–$25</span> at 10 cm. Final price varies based on size, complexity, and material.</p>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Generation progress overlay */}
        <GenerationProgress
          progress={status === 'completed' ? 100 : status === 'scaling' ? 90 : generationProgress}
          status={status === 'scaling' ? 'generating' : status}
          estimatedTime={status === 'scaling' ? 'Scaling model...' : undefined}
        />
      </div>
    );
  }

  // ── Generating / processing overlay ──────────────────────────────────
  if (isWorking) {
    return (
      <div className="pt-16 min-h-screen bg-brand-dark">
        <GenerationProgress
          progress={status === 'completed' ? 100 : status === 'scaling' ? 90 : generationProgress}
          status={status === 'scaling' ? 'generating' : status}
          estimatedTime={status === 'scaling' ? 'Scaling model...' : undefined}
        />
      </div>
    );
  }

  // ── Post-generation: redirect to model result page ──────────────────
  // This shouldn't normally render since polling success redirects,
  // but handle edge cases (e.g., coming back with existing model)
  return (
    <div className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/50">Redirecting to your model...</p>
      </div>
    </div>
  );
}