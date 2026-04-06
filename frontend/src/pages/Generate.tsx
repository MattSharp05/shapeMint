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
import { useAuth } from '../hooks/useAuth';
import { InfoCollection, CollectedInfo } from '../components/Generation/InfoCollection';
import { PrintType } from '../data/printTypes';
import { BeamsBackground } from '../components/UI/BeamsBackground';

// Default system prompt for angle views (used when no print type config is provided)
const DEFAULT_ANGLE_SYSTEM_PROMPT = `You are an expert image-generation engine. You must ALWAYS produce an image. Produce NO TEXT. Just an Image.

You are creating various views of a full-color 3D object that will be used for 3D rendering. Therefore be extremely consistent with the object.

The style must be REALISTIC — not cartoon, not stylized. Render the object as it would appear in real life.
CRITICAL: Preserve ALL original colors from the reference image. The model must be FULLY COLORED — skin tones, clothing colors, hair color, accessories, etc. Do NOT render in grayscale, white, clay, or monochrome. Match the colors as closely as possible to the reference image.

Do NOT change details, or add features that are not in the reference image.
Use flat, even lighting that shows the geometry clearly without washing out the colors.`;

const ANGLE_PROMPTS = [
  'Show ONLY the front view of this object. One single object, centered in the frame, facing directly toward the camera. Do NOT show multiple angles or a turnaround sheet — just one isolated front view.',
  'Show ONLY the back view of this object. One single object, centered in the frame, with its back facing the camera. Do NOT show multiple angles or a turnaround sheet — just one isolated rear view.',
  'Show ONLY the left side view of this object. One single object, centered in the frame, rotated exactly 90 degrees so the left side faces the camera. Do NOT show multiple angles or a turnaround sheet — just one isolated side view.',
  'Show ONLY the right side view of this object. One single object, centered in the frame, rotated exactly 90 degrees so the right side faces the camera. Do NOT show multiple angles or a turnaround sheet — just one isolated side view.',
];

const ANGLE_LABELS = ['Front', 'Back', 'Left', 'Right'];

interface GenerateProps {
  printType?: PrintType;
}

export function Generate({ printType }: GenerateProps = {}) {
  const ANGLE_SYSTEM_PROMPT = printType?.angleSystemPrompt || DEFAULT_ANGLE_SYSTEM_PROMPT;
  const variationSystemPrompt = printType?.variationSystemPrompt || undefined;
  const [status, setStatus] = useState<'pending' | 'info_collection' | 'generating_angles' | 'generating' | 'scaling' | 'completed' | 'failed'>('pending');
  const [generationProgress, setGenerationProgress] = useState(0);

  // Multi-angle state
  const [angleImages, setAngleImages] = useState<(string | null)[] | null>(null);
  const [angleError, setAngleError] = useState<string | null>(null);

  // Generation form state
  const [mode, setMode] = useState<'text' | 'image'>(printType?.defaultMode || 'text');
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

  // Handle image/text transform request from GenerationForm
  // Fires 4 parallel calls with numImages=1 for progressive loading
  const handleImageTransformRequest = async (image: string | null, transformPrompt: string, dimensions: ModelDimensions) => {
    setIsTransforming(true);
    setTransformError(null);
    setTransformedImages([]);  // Start with empty array (not null) to show progressive UI
    setPendingDimensions(dimensions);
    lastTransformInputs.current = { image: image || '', prompt: transformPrompt };

    try {
      console.log(`Starting ${image ? 'image transformation' : 'text-to-image generation'} via fal.ai (4 parallel calls)...`);

      // Fire 4 parallel calls, each producing 1 image
      const promises = Array.from({ length: 4 }, (_, i) =>
        falImageService.transformImage(transformPrompt, image, { numImages: 1, systemPrompt: variationSystemPrompt })
          .then(result => {
            if (result.images.length > 0) {
              console.log(`Variation ${i + 1} ready`);
              setTransformedImages(prev => {
                const updated = [...(prev || [])];
                updated[i] = result.images[0];
                return updated;
              });
            }
          })
          .catch(err => {
            console.error(`Variation ${i + 1} failed:`, err);
          })
      );

      await Promise.all(promises);
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

  // Handle user selecting a transformed image variation — generate angle views progressively
  const handleVariationSelect = async (selectedImageUrl: string) => {
    console.log('User selected variation, generating angle views...');
    setSelectedVariationUrl(selectedImageUrl);
    selectedVariationUrlRef.current = selectedImageUrl;
    setTransformedImages(null);
    setAngleImages([null, null, null, null]);  // 4 slots, null = loading
    setAngleError(null);
    setStatus('generating_angles');

    try {
      // Generate 4 angle views in parallel, streaming each as it arrives
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
            setAngleImages(prev => {
              const updated = [...(prev || [null, null, null, null])];
              updated[i] = result.images[0];
              return updated;
            });
            return result.images[0];
          }
          throw new Error(`No image returned for ${ANGLE_LABELS[i]} view`);
        }).catch(err => {
          console.error(`${ANGLE_LABELS[i]} view failed:`, err);
          return null;
        });
      });

      await Promise.all(promises);
      console.log('All angle views completed');
      setStatus('info_collection');
    } catch (err: any) {
      console.error('Angle generation failed:', err);
      setAngleError(err.message || 'Failed to generate angle views.');
      setStatus('info_collection');
    }
  };

  // Handle info collection submission — create account, then start 3D generation
  const handleInfoSubmit = async (info: CollectedInfo) => {
    console.log('Info collected, starting 3D generation...');
    collectedInfoRef.current = info;

    setImagePreview(selectedVariationUrl);
    setStatus('generating');

    try {
      // Use multi-image-to-3d if we have all 4 angle images, otherwise fallback to single image
      const validAngleImages = angleImages?.filter((img): img is string => !!img) || [];
      const useMultiImage = validAngleImages.length === 4;
      console.log(useMultiImage
        ? `Sending ${validAngleImages.length} angle images to Meshy (multi-image-to-3d)`
        : `Sending single reference image to Meshy (image-to-3d) — ${validAngleImages.length}/4 angles available`);

      const modelData = await modelService.generate3DModel({
        type: useMultiImage ? 'multi-image-to-3d' : 'image-to-3d',
        mode: 'preview',
        prompt: imagePrompt || prompt || 'AI-generated design',
        image: useMultiImage ? validAngleImages : selectedVariationUrl!,
        userId: info.userId,
        dimensions: pendingDimensions || undefined,
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

    const taskId = modelData.data?.taskId;
    if (!taskId) {
      console.error('❌ No task ID in generation response');
      setStatus('failed');
      return;
    }

    // Save shipping info, 2D preview, and dimensions to DB immediately
    // so the meshy-webhook has everything it needs for post-processing
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
          country: 'US',
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
        console.error('⚠️ Failed to save shipping info:', updateError);
      } else {
        console.log('✅ Shipping info saved to model', taskId);
      }
    }

    // Redirect immediately — the meshy-webhook will handle scaling, quoting, and email
    console.log('🔄 Redirecting to model page. Webhook will handle post-processing.');
    navigate(`/model/${taskId}`);
  };


  const isWorking = status === 'generating' || status === 'scaling';

  // ── Generating angle views (progressive) ────────────────────────────
  if (status === 'generating_angles' && selectedVariationUrl) {
    const loadedCount = angleImages?.filter(Boolean).length || 0;
    return (
      <div className="pt-16 min-h-screen bg-brand-dark">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-6">
            <div className="mb-6">
              <img src={selectedVariationUrl} alt="Selected design" className="w-32 h-32 object-cover rounded-xl mx-auto shadow-lg" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Generating Angle Views</h2>
            <p className="text-white/40 text-sm">{loadedCount}/4 views ready</p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
            {ANGLE_LABELS.map((label, i) => (
              <div key={label} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                {angleImages?.[i] ? (
                  <div className="relative w-full h-full">
                    <img src={angleImages[i]!} alt={`${label} view`} className="w-full h-full object-cover animate-fadeIn" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs py-1 text-center">{label}</div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 text-brand-accent animate-spin mb-2" />
                    <span className="text-white/30 text-xs">{label}</span>
                  </div>
                )}
              </div>
            ))}
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
        angleImages={angleImages?.filter((img): img is string => !!img) || null}
        angleLabels={ANGLE_LABELS}
      />
    );
  }

  // ── Pre-generation view ──────────────────────────────────────────────
  if (!isWorking && status === 'pending') {
    return (
      <BeamsBackground className="pt-16 min-h-screen bg-brand-dark" intensity="medium">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
          <FadeIn y={16} delay={0.1}>
            <div className="text-center mb-10">
              {printType && (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent mb-4">
                  {printType.title}
                </p>
              )}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                {printType?.heroTagline || 'Create Your Design'}
              </h1>
              <p className="text-white/40">
                {printType?.description || 'Describe what you want or upload a reference image'}
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
                defaultDimensions={printType?.defaultDimensions as ModelDimensions | undefined}
                isCustom={!printType || printType.slug === 'custom'}
                stylePresets={printType?.stylePresets}
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
      </BeamsBackground>
    );
  }

  // ── Generating / processing overlay ──────────────────────────────────
  if (isWorking) {
    return (
      <BeamsBackground className="pt-16 min-h-screen bg-brand-dark" intensity="medium">
        <GenerationProgress
          progress={status === 'completed' ? 100 : status === 'scaling' ? 90 : generationProgress}
          status={status === 'scaling' ? 'generating' : status}
          estimatedTime={status === 'scaling' ? 'Scaling model...' : undefined}
        />
      </BeamsBackground>
    );
  }

  // ── Post-generation: redirect to model result page ──────────────────
  // This shouldn't normally render since polling success redirects,
  // but handle edge cases (e.g., coming back with existing model)
  return (
    <BeamsBackground className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center" intensity="medium">
      <div className="text-center">
        <p className="text-white/50">Redirecting to your model...</p>
      </div>
    </BeamsBackground>
  );
}