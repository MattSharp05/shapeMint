import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useThumbnailGenerator } from '../hooks/useThumbnailGenerator';
import { GenerationForm, ModelDimensions } from '../components/Generation/GenerationForm';
import { GenerationProgress } from '../components/Generation/GenerationProgress';
import { ImageVariationPicker } from '../components/Generation/ImageVariationPicker';
import { ModelViewer } from '../components/3D/ModelViewer';
import { ThumbnailSelector } from '../components/UI/ThumbnailSelector';
import { Card } from '../components/UI/Card';
import { Download, Printer, ChevronDown, Info, ArrowLeft } from 'lucide-react';
import { FadeIn, FadeInUp, MotionButton } from '../components/Motion';
import { supabase } from '../supabaseClient';
import { modelService } from '../services/modelService';
import { falImageService } from '../services/falImageService';
import { ScaleResult } from '../utils/modelScaler';
import { useAuth } from '../hooks/useAuth';

// Order flow imports
import { ensureStableModelUrl } from '../services/modelUrlService';
import { MaterialSelection } from '../components/Order/MaterialSelection';
import { ShippingForm } from '../components/Order/ShippingForm';
import { VENDORS, SHAPEWAYS_MATERIALS, SLANT3D_MATERIALS, getMaterialsForVendor } from '../data/vendors';
import { OrderWizardState, ShippingInfo, Material } from '../types/order';
import { getQuote as getShapewaysQuote } from '../services/shapeways';
import { createOrder as createShapewaysOrder } from '../services/shapewaysOrder';
import { getQuote as getSlant3DQuote, getAvailableFilaments } from '../services/slant3d';
import { createOrder as createSlant3DOrder } from '../services/slant3dOrder';
import { getQuote as getTreatstockQuote, TreatstockQuoteResponse } from '../services/treatstock';
import { createOrder as createTreatstockOrder } from '../services/treatstockOrder';
import { getQuote as getCraftcloudQuote, CraftcloudVendorOption } from '../services/craftcloud';
import { createOrder as createCraftcloudOrder } from '../services/craftcloudOrder';
import { getCraftcloudMaterialConfigId } from '../data/craftcloudMaterials';

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

  // ── Checkout state ──────────────────────────────────────────────────
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: material, 2: shipping
  const [wizardState, setWizardState] = useState<OrderWizardState>({ vendorId: 'craftcloud' });
  const [quoteState, setQuoteState] = useState<{ loading: boolean; error?: string; data?: { quoteId: string; priceTotal: number; currency: string; reused?: boolean; expiresAt?: string; itemTotal?: number; surcharge?: number; shippingTotal?: number; publicFileServiceId?: string; treatstockRaw?: TreatstockQuoteResponse; craftcloudPriceId?: string; craftcloudQuoteId?: string; craftcloudShippingId?: string; vendorName?: string; productionTime?: string } }>({ loading: false });
  const [orderState, setOrderState] = useState<{ loading: boolean; error?: string; data?: any }>({ loading: false });
  const [craftcloudVendorOptions, setCraftcloudVendorOptions] = useState<CraftcloudVendorOption[]>([]);
  const [selectedCraftcloudVendor, setSelectedCraftcloudVendor] = useState<number>(-1);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [slant3DFilaments, setSlant3DFilaments] = useState<Material[]>([]);
  const [slant3DFilamentMap, setSlant3DFilamentMap] = useState<Record<string, string>>({});
  const [loadingFilaments, setLoadingFilaments] = useState(false);
  const [confirmedStlUrl, setConfirmedStlUrl] = useState<string | null>(null);

  // Extract prefilled data or existing model from navigation state
  useEffect(() => {
    if (location.state?.existingModel) {
      // Coming from Dashboard with an existing completed model
      const model = location.state.existingModel;
      setGeneratedModel(model);
      setStatus('completed');
    } else if (location.state) {
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


  // ── Checkout: STL URL resolution ──────────────────────────────────────
  const getModelUrlForPrinting = useCallback(async (): Promise<string> => {
    if (confirmedStlUrl) return confirmedStlUrl;
    const modelId = generatedModel?.id;
    if (modelId) {
      try {
        const { data: record } = await supabase
          .from('generated_models')
          .select('stl_url')
          .eq('id', modelId)
          .single();
        if (record?.stl_url) {
          setConfirmedStlUrl(record.stl_url);
          return record.stl_url;
        }
      } catch (e) {
        console.error('STL lookup error:', e);
      }
    }
    if (generatedModel?.urls?.stl) return generatedModel.urls.stl;
    return generatedModel?.urls?.glb || generatedModel?.modelUrl || '';
  }, [confirmedStlUrl, generatedModel]);

  // Fetch Slant3D filaments when vendor changes
  useEffect(() => {
    if (wizardState.vendorId === 'slant3d' && slant3DFilaments.length === 0 && !loadingFilaments) {
      setLoadingFilaments(true);
      getAvailableFilaments()
        .then(filaments => {
          const materials: Material[] = filaments
            .filter(f => f.available && f.public)
            .map(filament => ({
              id: `slant3d-${filament.publicId}`,
              name: filament.name,
              description: `${filament.profile} - ${filament.color}`,
              colors: [{ id: filament.color.toLowerCase().replace(/\s+/g, '-'), name: filament.color, hex: filament.hexValue || '#000000' }],
              finishes: []
            }));
          const mapping: Record<string, string> = {};
          materials.forEach(m => { mapping[m.id] = m.id.replace('slant3d-', ''); });
          SLANT3D_MATERIALS.forEach(hardcoded => {
            const match = materials.find(m => m.name.toLowerCase().replace(/\s+/g, '-') === hardcoded.id);
            if (match) mapping[hardcoded.id] = match.id.replace('slant3d-', '');
          });
          setSlant3DFilaments(materials);
          setSlant3DFilamentMap(mapping);
          setLoadingFilaments(false);
        })
        .catch(() => {
          setSlant3DFilaments(SLANT3D_MATERIALS);
          setLoadingFilaments(false);
        });
    }
  }, [wizardState.vendorId, slant3DFilaments.length, loadingFilaments]);

  // ── Checkout handlers ──────────────────────────────────────────────
  const handleMaterialSelect = (materialId: string) => setWizardState(prev => ({ ...prev, materialId, colorId: undefined, finishId: undefined }));
  const handleColorSelect = (colorId: string) => setWizardState(prev => ({ ...prev, colorId }));
  const handleFinishSelect = (finishId: string) => setWizardState(prev => ({ ...prev, finishId }));
  const handleShippingInfoChange = (shippingInfo: Partial<ShippingInfo>) => setWizardState(prev => ({ ...prev, shippingInfo: { ...prev.shippingInfo, ...shippingInfo, country: 'US' } }));

  const handleGetQuote = async () => {
    if (!wizardState.vendorId || !wizardState.materialId) {
      setQuoteState({ loading: false, error: !wizardState.materialId ? 'Select a material first' : 'Select a vendor' });
      return;
    }
    const { shippingInfo } = wizardState;
    if (!shippingInfo?.firstName || !shippingInfo.lastName || !shippingInfo.address1 || !shippingInfo.city || !shippingInfo.state || !shippingInfo.postalCode || !shippingInfo.phone) {
      setQuoteState({ loading: false, error: 'Complete shipping form' });
      return;
    }
    setQuoteState({ loading: true });
    try {
      const quantity = shippingInfo.quantity && shippingInfo.quantity > 0 ? Math.min(100, Math.floor(shippingInfo.quantity)) : 1;
      const printModelUrl = await getModelUrlForPrinting();

      if (wizardState.vendorId === 'shapeways') {
        const data = await getShapewaysQuote({ modelUrl: printModelUrl, selections: { baseMaterialId: wizardState.materialId, colorId: wizardState.colorId, finishId: wizardState.finishId }, quantity, shippingAddress: { firstName: shippingInfo.firstName!, lastName: shippingInfo.lastName!, email: shippingInfo.email || 'user@example.com', address1: shippingInfo.address1!, city: shippingInfo.city!, state: shippingInfo.state!, zipCode: shippingInfo.postalCode!, country: 'US', phone: shippingInfo.phone! } });
        setQuoteState({ loading: false, data });
      } else if (wizardState.vendorId === 'slant3d') {
        const filamentPublicId = slant3DFilamentMap[wizardState.materialId] || wizardState.materialId;
        const data = await getSlant3DQuote({ modelUrl: printModelUrl, filamentId: filamentPublicId, quantity, shippingAddress: { firstName: shippingInfo.firstName!, lastName: shippingInfo.lastName!, email: shippingInfo.email || 'user@example.com', address1: shippingInfo.address1!, address2: shippingInfo.address2, city: shippingInfo.city!, state: shippingInfo.state!, zipCode: shippingInfo.postalCode!, country: 'US', phone: shippingInfo.phone! } });
        setQuoteState({ loading: false, data });
      } else if (wizardState.vendorId === 'treatstock') {
        const data = await getTreatstockQuote({ modelUrl: printModelUrl, quantity, shippingAddress: { firstName: shippingInfo.firstName!, lastName: shippingInfo.lastName!, email: shippingInfo.email || 'user@example.com', address1: shippingInfo.address1!, address2: shippingInfo.address2, city: shippingInfo.city!, state: shippingInfo.state!, zipCode: shippingInfo.postalCode!, country: 'US', phone: shippingInfo.phone! } });
        setQuoteState({ loading: false, data });
      } else if (wizardState.vendorId === 'craftcloud') {
        const materialConfigId = getCraftcloudMaterialConfigId(wizardState.materialId!, wizardState.colorId, wizardState.finishId);
        if (!materialConfigId) { setQuoteState({ loading: false, error: 'This material/color/finish combination is not available.' }); return; }
        const isMulticolor = ['cc-multicolor-pla', 'cc-full-color', 'cc-mjf-multicolor'].includes(wizardState.materialId!);
        let objUrl: string | undefined, mtlUrl: string | undefined;
        if (isMulticolor && generatedModel?.id) {
          const { data: record } = await supabase.from('generated_models').select('obj_url, mtl_url').eq('id', generatedModel.id).single();
          objUrl = record?.obj_url || undefined;
          mtlUrl = record?.mtl_url || undefined;
        }
        const data = await getCraftcloudQuote({ modelUrl: printModelUrl, materialConfigId, quantity, shippingAddress: { firstName: shippingInfo.firstName!, lastName: shippingInfo.lastName!, email: shippingInfo.email || 'user@example.com', address1: shippingInfo.address1!, city: shippingInfo.city!, state: shippingInfo.state!, zipCode: shippingInfo.postalCode!, country: 'US', phone: shippingInfo.phone! }, ...(isMulticolor && objUrl && { objUrl, mtlUrl }) });
        if (!data.vendorOptions || data.vendorOptions.length === 0) { setQuoteState({ loading: false, error: 'No print vendors returned quotes.' }); return; }
        setCraftcloudVendorOptions(data.vendorOptions);
        setSelectedCraftcloudVendor(0);
        setShowVendorModal(true);
        const cheapest = data.vendorOptions[0];
        setQuoteState({ loading: false, data: { quoteId: data.craftcloudPriceId, priceTotal: cheapest.totalPrice, currency: data.currency, itemTotal: cheapest.itemPrice, shippingTotal: cheapest.shippingPrice, craftcloudPriceId: data.craftcloudPriceId, craftcloudQuoteId: cheapest.craftcloudQuoteId, craftcloudShippingId: cheapest.craftcloudShippingId, vendorName: cheapest.vendorId, productionTime: `${cheapest.productionTimeFast}-${cheapest.productionTimeSlow} business days` } });
      }
    } catch (e: any) {
      if (e?.code === 'material_not_printable') {
        setQuoteState({ loading: false, error: 'Full Color Nylon (MJF) is not available for this model. Please choose a different material.' });
      } else {
        setQuoteState({ loading: false, error: e.message || 'Quote failed' });
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (!quoteState.data || !wizardState.vendorId) return;
    const { shippingInfo } = wizardState;
    if (!shippingInfo) return;
    setOrderState({ loading: true });
    try {
      const quantity = shippingInfo.quantity && shippingInfo.quantity > 0 ? Math.min(100, Math.floor(shippingInfo.quantity)) : 1;
      const printModelUrl = await getModelUrlForPrinting();
      const addr = { firstName: shippingInfo.firstName!, lastName: shippingInfo.lastName!, email: shippingInfo.email || 'user@example.com', address1: shippingInfo.address1!, address2: shippingInfo.address2, city: shippingInfo.city!, state: shippingInfo.state!, zipCode: shippingInfo.postalCode!, country: 'US', phone: shippingInfo.phone! };
      const successNav = (resp: any) => navigate('/order-success', { state: { isDirectOrder: true, orderData: { orderId: resp.orderNumber, customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`, customerEmail: shippingInfo.email || 'user@example.com', filename: 'model', quantity: quantity.toString(), material: wizardState.materialId || '', shippingAddress: { name: `${shippingInfo.firstName} ${shippingInfo.lastName}`, street: shippingInfo.address1!, city: shippingInfo.city!, state: shippingInfo.state!, zip: shippingInfo.postalCode! }, message: 'Order submitted successfully.' } } });

      if (wizardState.vendorId === 'shapeways') {
        const resp = await createShapewaysOrder({ modelUrl: printModelUrl, selections: { baseMaterialId: wizardState.materialId!, colorId: wizardState.colorId, finishId: wizardState.finishId }, quantity, shippingAddress: addr, priorQuote: quoteState.data.itemTotal != null && quoteState.data.surcharge != null ? { itemTotal: quoteState.data.itemTotal, surcharge: quoteState.data.surcharge, total: quoteState.data.priceTotal } : undefined, quoteId: quoteState.data.quoteId });
        setOrderState({ loading: false, data: resp });
        successNav(resp);
      } else if (wizardState.vendorId === 'slant3d') {
        const filamentPublicId = slant3DFilamentMap[wizardState.materialId!] || wizardState.materialId!;
        const resp = await createSlant3DOrder({ modelUrl: printModelUrl, filamentId: filamentPublicId, quantity, shippingAddress: addr, priorQuote: quoteState.data.itemTotal != null && quoteState.data.shippingTotal != null ? { itemTotal: quoteState.data.itemTotal, shippingTotal: quoteState.data.shippingTotal, total: quoteState.data.priceTotal } : undefined, quoteId: quoteState.data.quoteId, publicFileServiceId: quoteState.data.publicFileServiceId });
        setOrderState({ loading: false, data: resp });
        successNav(resp);
      } else if (wizardState.vendorId === 'treatstock') {
        const resp = await createTreatstockOrder({ modelUrl: printModelUrl, quantity, shippingAddress: addr, priorQuote: { itemTotal: quoteState.data.itemTotal ?? quoteState.data.priceTotal, shippingTotal: quoteState.data.shippingTotal ?? 0, total: quoteState.data.priceTotal }, quoteId: quoteState.data.quoteId, quoteRaw: quoteState.data.treatstockRaw! });
        setOrderState({ loading: false, data: resp });
        successNav(resp);
      } else if (wizardState.vendorId === 'craftcloud') {
        const resp = await createCraftcloudOrder({ craftcloudQuoteId: quoteState.data.craftcloudQuoteId!, craftcloudShippingId: quoteState.data.craftcloudShippingId!, craftcloudPriceId: quoteState.data.craftcloudPriceId!, quantity, shippingAddress: addr, successUrl: `${window.location.origin}/order-success?vendor=craftcloud`, cancelUrl: `${window.location.origin}/generate?payment=cancelled`, priorQuote: quoteState.data.itemTotal != null && quoteState.data.shippingTotal != null ? { itemTotal: quoteState.data.itemTotal, shippingTotal: quoteState.data.shippingTotal, total: quoteState.data.priceTotal } : undefined, quoteId: quoteState.data.quoteId, modelUrl: printModelUrl });
        setOrderState({ loading: false, data: resp });
        window.location.href = resp.stripeCheckoutUrl;
      }
    } catch (e: any) {
      if (e.message === 'price_changed') {
        setOrderState({ loading: false, error: 'Price changed since quote. Please Get Quote again.' });
      } else {
        setOrderState({ loading: false, error: e.message || 'Order failed' });
      }
    }
  };

  const availableMaterials = wizardState.vendorId === 'slant3d'
    ? (slant3DFilaments.length > 0 ? slant3DFilaments : SLANT3D_MATERIALS)
    : getMaterialsForVendor(wizardState.vendorId || '');

  const isCompleted = status === 'completed' && generatedModel;
  const isWorking = status === 'generating' || status === 'scaling' || status === 'repairing';

  // ── Pre-generation view ──────────────────────────────────────────────
  if (!isCompleted && !isWorking) {
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
          progress={status === 'completed' ? 100 : status === 'repairing' ? 95 : status === 'scaling' ? 90 : generationProgress}
          status={status === 'scaling' ? 'generating' : status}
          estimatedTime={status === 'scaling' ? 'Scaling model...' : status === 'repairing' ? 'Preparing for 3D printing...' : undefined}
        />
      </div>
    );
  }

  // ── Generating / processing overlay ──────────────────────────────────
  if (isWorking) {
    return (
      <div className="pt-16 min-h-screen bg-brand-dark">
        <GenerationProgress
          progress={status === 'completed' ? 100 : status === 'repairing' ? 95 : status === 'scaling' ? 90 : generationProgress}
          status={status === 'scaling' ? 'generating' : status}
          estimatedTime={status === 'scaling' ? 'Scaling model...' : status === 'repairing' ? 'Preparing for 3D printing...' : undefined}
        />
      </div>
    );
  }

  // ── Post-generation: product page ────────────────────────────────────
  return (
    <div className="pt-16 min-h-screen bg-brand-dark">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row">
          {/* Left — Model viewer (60%) */}
          <FadeIn x={-20} duration={0.7} className="lg:w-[60%] bg-brand-dark-lighter lg:min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 lg:p-8">
            <div className="w-full aspect-square max-w-[700px]">
              <ModelViewer
                modelUrl={generatedModel}
                className="h-full w-full rounded-2xl"
              />
            </div>
          </FadeIn>

          {/* Right — Checkout sidebar (40%) */}
          <div className="lg:w-[40%] lg:min-h-[calc(100vh-4rem)] lg:overflow-y-auto border-l border-white/5">
            <div className="p-6 lg:p-10 max-w-lg mx-auto">
              {!checkoutMode ? (
                <>
                  {/* Title */}
                  <FadeIn delay={0.2} y={12}>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      {generatedModel?.prompt || 'Your Custom Design'}
                    </h1>
                    <p className="text-sm text-white/30 mb-8">AI-generated 3D model</p>
                  </FadeIn>

                  {/* Material toggle: Color vs Monochromatic */}
                  <div className="mb-6">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-3 block">
                      Print Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="card-glow p-4 rounded-xl border-2 border-brand-accent/50 bg-brand-dark-card text-center transition-all">
                        <div className="w-6 h-6 mx-auto mb-2 rounded-full" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }} />
                        <span className="text-sm font-medium text-white">Full Color</span>
                        <p className="text-xs text-white/30 mt-1">HD color print</p>
                      </button>
                      <button className="card-glow p-4 rounded-xl border-2 border-white/10 bg-brand-dark-card text-center transition-all hover:border-white/20">
                        <div className="w-6 h-6 mx-auto mb-2 rounded-full bg-white/20" />
                        <span className="text-sm font-medium text-white">Monochromatic</span>
                        <p className="text-xs text-white/30 mt-1">Single color SLA</p>
                      </button>
                    </div>
                  </div>

                  {/* Dimensions summary */}
                  {scaleInfo && (
                    <div className="mb-6 p-4 bg-white/5 rounded-xl">
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-2">Dimensions</p>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-white/30 block">W</span>
                          <span className="font-medium text-white">{scaleInfo.finalDimensions.width.toFixed(1)} {pendingDimensions?.unit || 'cm'}</span>
                        </div>
                        <div>
                          <span className="text-white/30 block">H</span>
                          <span className="font-medium text-white">{scaleInfo.finalDimensions.height.toFixed(1)} {pendingDimensions?.unit || 'cm'}</span>
                        </div>
                        <div>
                          <span className="text-white/30 block">D</span>
                          <span className="font-medium text-white">{scaleInfo.finalDimensions.depth.toFixed(1)} {pendingDimensions?.unit || 'cm'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Repair status */}
                  {repairReport && (
                    <div className={`mb-6 p-4 rounded-xl text-sm ${
                      repairReport.print_ready
                        ? 'bg-green-900/20 text-green-400 border border-green-500/20'
                        : 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {repairReport.print_ready ? 'Model is print-ready' : 'Model may need adjustments for best results'}
                    </div>
                  )}

                  {/* Actions */}
                  <FadeInUp delay={0.35}>
                    <div className="space-y-3 mb-8">
                      <MotionButton
                        onClick={() => {
                          setWizardState(prev => ({
                            ...prev,
                            modelData: generatedModel,
                            modelUrl: generatedModel?.urls?.glb,
                            stlUrl: generatedModel?.urls?.stl,
                          }));
                          setCheckoutMode(true);
                          setCheckoutStep(1);
                          setQuoteState({ loading: false });
                          setOrderState({ loading: false });
                        }}
                        className="btn-glow w-full py-4 bg-brand-accent text-brand-dark text-sm font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        Order Print
                      </MotionButton>

                      <MotionButton
                        onClick={handleBuyNow}
                        className="w-full py-4 bg-white/5 text-white border border-white/10 text-sm font-semibold uppercase tracking-wider rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Model
                      </MotionButton>
                    </div>
                  </FadeInUp>

                  {/* Details accordion */}
                  <details className="group border-t border-white/5 pt-4">
                    <summary className="flex items-center justify-between cursor-pointer py-2">
                      <span className="text-sm font-medium text-white/70">Model Details</span>
                      <ChevronDown className="h-4 w-4 text-white/30 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="pb-4 pt-2 text-sm text-white/40 space-y-2">
                      <div className="flex justify-between">
                        <span>Format</span>
                        <span className="font-medium text-white/70">GLB, STL</span>
                      </div>
                      {pendingDimensions && (
                        <div className="flex justify-between">
                          <span>Target {pendingDimensions.target}</span>
                          <span className="font-medium text-white/70">{pendingDimensions.value} {pendingDimensions.unit}</span>
                        </div>
                      )}
                    </div>
                  </details>

                  {/* Generate another */}
                  <div className="border-t border-white/5 pt-6 mt-4">
                    <button
                      onClick={() => {
                        setStatus('pending');
                        setGeneratedModel(null);
                        setRepairReport(null);
                        setScaleInfo(null);
                        setGenerationProgress(0);
                        repairDispatchedRef.current = false;
                      }}
                      className="text-sm text-brand-accent hover:underline font-medium"
                    >
                      Generate another design
                    </button>
                  </div>
                </>
              ) : (
                /* ── Inline checkout flow ───────────────────────────── */
                <>
                  {/* Back button */}
                  <button
                    onClick={() => {
                      if (checkoutStep > 1) {
                        setCheckoutStep(prev => prev - 1);
                      } else {
                        setCheckoutMode(false);
                      }
                    }}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 text-sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {checkoutStep > 1 ? 'Back to Materials' : 'Back'}
                  </button>

                  {/* Step indicator */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">
                      {checkoutStep === 1 ? 'Select Material & Color' : 'Shipping & Payment'}
                    </h2>
                    <p className="text-sm text-white/30">
                      Step {checkoutStep} of 2
                    </p>
                    <div className="flex gap-2 mt-3">
                      <div className={`h-1 flex-1 rounded-full ${checkoutStep >= 1 ? 'bg-brand-accent' : 'bg-white/10'}`} />
                      <div className={`h-1 flex-1 rounded-full ${checkoutStep >= 2 ? 'bg-brand-accent' : 'bg-white/10'}`} />
                    </div>
                  </div>

                  {/* Step 1: Material Selection */}
                  {checkoutStep === 1 && (
                    <div>
                      {wizardState.vendorId === 'slant3d' && loadingFilaments && (
                        <div className="text-center py-4">
                          <p className="text-white/50">Loading available materials...</p>
                        </div>
                      )}
                      <MaterialSelection
                        materials={availableMaterials}
                        selectedMaterialId={wizardState.materialId}
                        selectedColorId={wizardState.colorId}
                        selectedFinishId={wizardState.finishId}
                        onMaterialSelect={handleMaterialSelect}
                        onColorSelect={handleColorSelect}
                        onFinishSelect={handleFinishSelect}
                        onNext={() => setCheckoutStep(2)}
                        onBack={() => setCheckoutMode(false)}
                      />
                    </div>
                  )}

                  {/* Step 2: Shipping + Quote + Order */}
                  {checkoutStep === 2 && (
                    <div className="space-y-6">
                      {/* Quantity selector */}
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={wizardState.shippingInfo?.quantity || 1}
                          onChange={(e) => handleShippingInfoChange({ quantity: parseInt(e.target.value) || 1 })}
                          className="w-20 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 text-sm"
                        />
                      </div>

                      <ShippingForm
                        shippingInfo={wizardState.shippingInfo || {}}
                        onShippingInfoChange={handleShippingInfoChange}
                        onBack={() => setCheckoutStep(1)}
                        onGetQuote={handleGetQuote}
                        isQuoteLoading={quoteState.loading}
                        quoteError={quoteState.error}
                        quoteData={quoteState.data}
                        onPlaceOrder={handlePlaceOrder}
                        isOrderLoading={orderState.loading}
                        orderError={orderState.error}
                      />

                      {/* Craftcloud vendor selection modal */}
                      {showVendorModal && craftcloudVendorOptions.length > 0 && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <div className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6">
                            <h3 className="text-xl font-semibold text-white mb-1">Select a Print Vendor</h3>
                            <p className="text-sm text-white/40 mb-4">
                              {craftcloudVendorOptions.length} vendor{craftcloudVendorOptions.length !== 1 ? 's' : ''} quoted — sorted by lowest price
                            </p>
                            <div className="space-y-3 max-h-80 overflow-y-auto mb-6">
                              {craftcloudVendorOptions.map((option, idx) => (
                                <button
                                  key={option.craftcloudQuoteId}
                                  onClick={() => {
                                    setSelectedCraftcloudVendor(idx);
                                    setQuoteState(prev => ({
                                      ...prev,
                                      data: prev.data ? {
                                        ...prev.data,
                                        priceTotal: option.totalPrice,
                                        itemTotal: option.itemPrice,
                                        shippingTotal: option.shippingPrice,
                                        craftcloudQuoteId: option.craftcloudQuoteId,
                                        craftcloudShippingId: option.craftcloudShippingId,
                                        vendorName: option.vendorId,
                                        productionTime: `${option.productionTimeFast}-${option.productionTimeSlow} business days`,
                                      } : prev.data,
                                    }));
                                  }}
                                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                                    selectedCraftcloudVendor === idx
                                      ? 'border-brand-accent/50 bg-brand-accent/10'
                                      : 'border-white/10 hover:border-white/20 bg-white/5'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white">{option.vendorId}</span>
                                        {idx === 0 && (
                                          <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full font-medium">
                                            Best Price
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm text-white/40 mt-1">
                                        Production: {option.productionTimeFast}-{option.productionTimeSlow} days
                                        {option.shippingName && ` · ${option.shippingName}`}
                                        {option.shippingDeliveryTime && ` (${option.shippingDeliveryTime} days delivery)`}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-white">
                                        ${option.totalPrice.toFixed(2)}
                                      </div>
                                      <div className="text-xs text-white/40 space-y-0.5">
                                        <div>${option.itemPrice.toFixed(2)} item</div>
                                        <div>${option.shippingPrice.toFixed(2)} shipping</div>
                                        {option.minimumFee != null && option.minimumFee > 0 && (
                                          <div className="text-amber-400">+${option.minimumFee.toFixed(2)} order minimum</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setShowVendorModal(false)}
                              disabled={selectedCraftcloudVendor < 0}
                              className="btn-glow w-full bg-brand-accent text-brand-dark font-semibold py-3 rounded-lg hover:bg-brand-accent-light transition-colors disabled:opacity-50"
                            >
                              Confirm Selection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
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