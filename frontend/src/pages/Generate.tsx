import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { GenerationForm, ModelDimensions } from '../components/Generation/GenerationForm';
import { GenerationProgress } from '../components/Generation/GenerationProgress';
import { ImageVariationPicker } from '../components/Generation/ImageVariationPicker';
import { Card } from '../components/UI/Card';
import { Info, Loader2 } from 'lucide-react';
import { FadeIn, FadeInUp } from '../components/Motion';
import { supabase } from '../supabaseClient';
import { modelService, draftModel } from '../services/modelService';
import { falImageService, RateLimitError } from '../services/falImageService';
import { useAuth } from '../hooks/useAuth';
import { InfoCollection, CollectedInfo } from '../components/Generation/InfoCollection';
import { SaveAccountModal } from '../components/Auth/SaveAccountModal';
import { PrintType, CoupleToppersPresetSelection } from '../data/printTypes';
import { CoupleMode } from '../components/Generation/CoupleTopperControls';
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
  // Store the original inputs so we can regenerate. additionalImages is only
  // populated for the cake-topper paired-photo flow (partner 2 ride-along).
  const lastTransformInputs = useRef<{ image: string; prompt: string; additionalImages?: string[] } | null>(null);

  // Cake-topper couple-mode state. Lives at this level so the form remount
  // (when the variation picker takes over) doesn't blow away the user's
  // selections, and so handleImageTransformRequest can read them on submit.
  const [coupleMode, setCoupleMode] = useState<CoupleMode>(null);
  const [partner2File, setPartner2File] = useState<File | null>(null);
  const [partner2Preview, setPartner2Preview] = useState<string | null>(null);
  const [couplePresets, setCouplePresets] = useState<CoupleToppersPresetSelection>({});

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

  // Phase 2 anon-first flow: a draft generated_models row is created as
  // soon as 2D variations start generating. Every stage update (variation
  // arrivals, pick, angles) patches this same row so anonymous users see
  // their in-progress work on the dashboard, and so the eventual 3D gen
  // updates it rather than creating a duplicate.
  const draftModelIdRef = useRef<string | null>(null);

  // Phase 4: account-save modal. Anonymous users hit this either via the
  // soft "save your work" button or a hard block when their rate-limit
  // runs out.
  const [saveModal, setSaveModal] = useState<null | {
    required: boolean;
    heading?: string;
    subheading?: string;
    onSuccess?: () => void;
  }>(null);

  // Phase 5 bug fix: when `?resume=<id>` is present, hold back the pending
  // view until the resume hydration completes. Otherwise the user sees a
  // flash of the empty generation form before the saved state loads.
  const isResuming = !!new URLSearchParams(location.search).get('resume');
  const [resumeHydrated, setResumeHydrated] = useState(!isResuming);

  // TEST (single-reference pipeline): generate 1 variation instead of 4 and
  // skip the angle-views stage — the selected image goes straight to Meshy
  // as single image-to-3d. Flip these back to 4 / false to restore the
  // full pipeline.
  const NUM_VARIATIONS = 1;
  const SKIP_ANGLE_VIEWS = true;

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

  // Resume recovery: re-fire fal.ai for any variation slots that were
  // null on the draft row. Fills them in progressively and persists each
  // via draftModel.recordVariation. Handles rate-limit errors by opening
  // the save-account modal (same pattern as the original batch path).
  const retryMissingVariations = async (
    modelId: string,
    image: string | null,
    transformPrompt: string,
    slots: number[]
  ) => {
    if (slots.length === 0) return;
    setIsTransforming(true);
    try {
      await Promise.all(slots.map((i) =>
        falImageService.transformImage(transformPrompt, image, {
          numImages: 1,
          systemPrompt: variationSystemPrompt,
          modelId,
          source: 'generate',
        })
          .then(result => {
            if (result.images.length > 0) {
              setTransformedImages(prev => {
                const updated = [...(prev || [])];
                updated[i] = result.images[0];
                return updated;
              });
              draftModel.recordVariation(modelId, i, result.images[0]).catch(() => {});
            }
          })
          .catch(err => {
            if (err instanceof RateLimitError) throw err;
            console.error(`Retry variation ${i + 1} failed:`, err);
          })
      ));
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        if (err.scope === 'anon_user_lifetime') {
          setSaveModal({
            required: true,
            heading: 'Create a free account to continue',
            subheading: "You've used your free previews. Save your designs and keep generating.",
            onSuccess: () => {
              setSaveModal(null);
              retryMissingVariations(modelId, image, transformPrompt, slots);
            },
          });
        } else {
          setTransformError(err.message || "You've hit today's generation limit. Try again tomorrow.");
        }
      }
    } finally {
      setIsTransforming(false);
    }
  };

  // Resume recovery for angle views: re-fire fal.ai for any angle slots
  // that were null on the draft row. Mirrors retryMissingVariations but
  // for the post-variation angles stage. Without this, a user who leaves
  // the page mid-angle-generation would see the loading screen forever
  // because the in-flight promises were lost with the page.
  const retryMissingAngles = async (
    modelId: string,
    referenceUrl: string,
    slots: number[]
  ) => {
    if (slots.length === 0) return;
    try {
      await Promise.all(slots.map((i) =>
        falImageService.transformImage(
          ANGLE_PROMPTS[i],
          referenceUrl,
          {
            systemPrompt: ANGLE_SYSTEM_PROMPT,
            numImages: 1,
            resolution: '1K',
            aspectRatio: '1:1',
            outputFormat: 'png',
            modelId,
            source: 'generate',
          }
        )
          .then(result => {
            if (result.images.length > 0) {
              setAngleImages(prev => {
                const updated = [...(prev || [null, null, null, null])];
                updated[i] = result.images[0];
                return updated;
              });
              draftModel.recordAngle(modelId, i, result.images[0]).catch(() => {});
            }
          })
          .catch(err => {
            if (err instanceof RateLimitError) throw err;
            console.error(`Retry ${ANGLE_LABELS[i]} angle failed:`, err);
          })
      ));
      // All missing slots filled — advance to info collection.
      setStatus('info_collection');
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        if (err.scope === 'anon_user_lifetime') {
          setSaveModal({
            required: true,
            heading: 'Create a free account to finish your model',
            subheading: 'Save your progress — just one step left before your 3D preview.',
            onSuccess: () => {
              setSaveModal(null);
              retryMissingAngles(modelId, referenceUrl, slots);
            },
          });
        } else {
          setAngleError(err.message || "You've hit today's generation limit. Try again tomorrow.");
        }
      }
    }
  };

  // Phase 5: resume a partial generation from the dashboard. Load the row
  // and rehydrate React state so the user picks up exactly where they
  // left off. Runs once per `?resume=<id>` change, only after the auth
  // session is available (ownership is enforced by RLS on select).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resumeId = params.get('resume');
    if (!resumeId || !user?.id) return;
    // Don't re-hydrate if we've already loaded this draft.
    if (draftModelIdRef.current === resumeId) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('generated_models')
        .select('id, stage, variation_urls, angle_urls, source_image_url, thumbnail_url, prompt, user_id, target_dimensions')
        .eq('id', resumeId)
        .single();
      if (cancelled) return;
      if (error || !data) {
        console.error('Resume: could not load draft model', error);
        return;
      }
      if (data.user_id !== user.id) {
        console.warn('Resume: model belongs to a different user; ignoring.');
        return;
      }

      draftModelIdRef.current = data.id;
      if (data.prompt) setImagePrompt(data.prompt);
      // Rehydrate dimensions so the eventual 3D gen triggers scaling.
      if (data.target_dimensions) {
        setPendingDimensions(data.target_dimensions as ModelDimensions);
      }

      const variations = Array.isArray(data.variation_urls) ? (data.variation_urls as (string | null)[]) : [];
      const angles = Array.isArray(data.angle_urls) ? (data.angle_urls as (string | null)[]) : [];

      // Helper: if we have any persisted variations at all, show the picker —
      // don't fall through to the pending form. Covers the case where the
      // user left mid-generation (stage='uploaded' with a partial array).
      const hasAnyVariation = variations.some(Boolean);

      // Find which variation slots are still empty (for mid-batch recovery).
      const missingSlots: number[] = [];
      for (let i = 0; i < NUM_VARIATIONS; i++) {
        if (!variations[i]) missingSlots.push(i);
      }

      switch (data.stage) {
        case 'variations_ready':
          setTransformedImages(variations.map((v) => v || ''));
          break;
        case 'uploaded':
          if (hasAnyVariation) {
            // Partial variations — show what we have and auto-retry the
            // null slots so the user gets 4 options without clicking
            // regenerate. lastTransformInputs is what "Regenerate all"
            // uses; populate it too so that button still works.
            const padded: (string | null)[] = [null, null, null, null];
            variations.slice(0, 4).forEach((v, i) => { padded[i] = v; });
            setTransformedImages(padded.map((v) => v || ''));
            lastTransformInputs.current = {
              image: data.source_image_url || '',
              prompt: data.prompt || '',
            };
            if (missingSlots.length > 0) {
              void retryMissingVariations(data.id, data.source_image_url || null, data.prompt || '', missingSlots);
            }
          }
          break;
        case 'reference_selected':
        case 'angles_ready': {
          // Jump to the angles screen. thumbnail_url is the selected variation.
          if (data.thumbnail_url) {
            setSelectedVariationUrl(data.thumbnail_url);
            selectedVariationUrlRef.current = data.thumbnail_url;
          }
          // Pad to 4 slots; null = still loading. If angles_ready, all 4 present.
          const padded: (string | null)[] = [null, null, null, null];
          angles.slice(0, 4).forEach((a, i) => { padded[i] = a; });
          setAngleImages(padded);

          // If we're resuming mid-angle-generation (reference_selected with
          // null slots), the in-flight fal promises were lost when the page
          // unmounted. Re-fire them for the missing slots so the user
          // doesn't get stuck on the loading screen forever.
          const missingAngleSlots: number[] = [];
          for (let i = 0; i < 4; i++) {
            if (!padded[i]) missingAngleSlots.push(i);
          }

          if (SKIP_ANGLE_VIEWS || data.stage === 'angles_ready' || missingAngleSlots.length === 0) {
            setStatus('info_collection');
          } else {
            setStatus('generating_angles');
            if (data.thumbnail_url) {
              void retryMissingAngles(data.id, data.thumbnail_url, missingAngleSlots);
            }
          }
          break;
        }
        case 'generating_3d':
        case 'model_ready':
        case 'ordered':
          // These stages should never hit Generate.tsx (Dashboard routes
          // them to /model/:id). If we somehow land here, bounce over.
          navigate(`/model/${data.id}`, { replace: true });
          return;
        default:
          // uploaded / other pre-variation states: no extra hydration.
          break;
      }
      setResumeHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [location.search, user?.id, navigate]);

  // Handle image/text transform request from GenerationForm
  // Fires 4 parallel calls with numImages=1 for progressive loading.
  // `additionalImages` carries extra reference photos (cake-topper paired
  // mode passes partner 2 here so nano-banana sees both faces).
  const handleImageTransformRequest = async (
    image: string | null,
    transformPrompt: string,
    dimensions: ModelDimensions,
    additionalImages?: string[],
  ) => {
    setIsTransforming(true);
    setTransformError(null);
    setTransformedImages([]);  // Start with empty array (not null) to show progressive UI
    setPendingDimensions(dimensions);
    lastTransformInputs.current = { image: image || '', prompt: transformPrompt, additionalImages };

    // Create (or reuse) the draft model row so every variation we generate
    // is attributable and resumable from the dashboard. Requires a session
    // (real or anonymous — AuthProvider now guarantees one on boot).
    if (user?.id && !draftModelIdRef.current) {
      const draftId = await draftModel.create(user.id, image || null);
      if (draftId) {
        draftModelIdRef.current = draftId;
        console.log('📝 Draft model row created:', draftId);
      }
    }
    const draftId = draftModelIdRef.current;

    // Persist the chosen dimensions on the draft row so resume can
    // rehydrate them. Without this, a resumed 3D gen has no
    // target_dimensions and the Blender scale step is skipped, leading
    // to quotes on unscaled geometry.
    if (draftId) {
      draftModel.patch(draftId, { target_dimensions: dimensions, prompt: transformPrompt }).catch(() => {});
    }

    try {
      console.log(`Starting ${image ? 'image transformation' : 'text-to-image generation'} via fal.ai (${NUM_VARIATIONS} parallel call${NUM_VARIATIONS === 1 ? '' : 's'})...`);

      // Fire parallel calls, each producing 1 image
      const promises = Array.from({ length: NUM_VARIATIONS }, (_, i) =>
        falImageService.transformImage(
          transformPrompt,
          image,
          { numImages: 1, systemPrompt: variationSystemPrompt, modelId: draftId, source: 'generate' },
          additionalImages,
        )
          .then(result => {
            if (result.images.length > 0) {
              console.log(`Variation ${i + 1} ready`);
              setTransformedImages(prev => {
                const updated = [...(prev || [])];
                updated[i] = result.images[0];
                return updated;
              });
              if (draftId) {
                // Persist progressively so anon users can leave and resume.
                draftModel.recordVariation(draftId, i, result.images[0]).catch(() => {});
              }
            }
          })
          .catch(err => {
            if (err instanceof RateLimitError) {
              // Propagate rate-limit errors — one is enough to stop the batch.
              throw err;
            }
            console.error(`Variation ${i + 1} failed:`, err);
          })
      );

      await Promise.all(promises);
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        if (err.scope === 'anon_user_lifetime') {
          setSaveModal({
            required: true,
            heading: 'Create a free account to continue',
            subheading: "You've used your free previews. Save your designs and keep generating.",
            onSuccess: () => {
              // Retry the same variation batch with the now-real session.
              setSaveModal(null);
              handleImageTransformRequest(image, transformPrompt, dimensions, additionalImages);
            },
          });
        } else {
          setTransformError(err.message || "You've hit today's generation limit. Try again tomorrow.");
        }
      } else {
        console.error('fal.ai generation failed:', err);
        setTransformError(err.message || 'Failed to generate previews. Please try again.');
      }
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
        pendingDimensions || { value: 10, unit: 'cm', target: 'longest' },
        lastTransformInputs.current.additionalImages,
      );
    }
  };

  // Handle user selecting a transformed image variation — generate angle views progressively
  const handleVariationSelect = async (selectedImageUrl: string) => {
    setSelectedVariationUrl(selectedImageUrl);
    selectedVariationUrlRef.current = selectedImageUrl;
    setTransformedImages(null);

    // Persist the selected variation as the thumbnail + stage transition.
    if (draftModelIdRef.current) {
      draftModel.recordSelectedVariation(draftModelIdRef.current, selectedImageUrl).catch(() => {});
    }

    // TEST: single-reference pipeline — no angle views. handleInfoSubmit's
    // fallback path sends selectedVariationUrl to Meshy as image-to-3d.
    if (SKIP_ANGLE_VIEWS) {
      console.log('Skipping angle views (single-reference test), proceeding to info collection...');
      setAngleImages(null);
      setStatus('info_collection');
      return;
    }

    console.log('User selected variation, generating angle views...');
    setAngleImages([null, null, null, null]);  // 4 slots, null = loading
    setAngleError(null);
    setStatus('generating_angles');

    try {
      // Generate 4 angle views in parallel, streaming each as it arrives
      const draftId = draftModelIdRef.current;
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
            modelId: draftId,
            source: 'generate',
          }
        ).then(result => {
          if (result.images.length > 0) {
            console.log(`${ANGLE_LABELS[i]} view generated`);
            setAngleImages(prev => {
              const updated = [...(prev || [null, null, null, null])];
              updated[i] = result.images[0];
              return updated;
            });
            if (draftId) {
              draftModel.recordAngle(draftId, i, result.images[0]).catch(() => {});
            }
            return result.images[0];
          }
          throw new Error(`No image returned for ${ANGLE_LABELS[i]} view`);
        }).catch(err => {
          if (err instanceof RateLimitError) throw err;
          console.error(`${ANGLE_LABELS[i]} view failed:`, err);
          return null;
        });
      });

      await Promise.all(promises);
      console.log('All angle views completed');
      setStatus('info_collection');
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        if (err.scope === 'anon_user_lifetime') {
          setSaveModal({
            required: true,
            heading: 'Create a free account to finish your model',
            subheading: 'Save your progress — just one step left before your 3D preview.',
            onSuccess: () => {
              setSaveModal(null);
              // Retry angle generation with the now-real session.
              handleVariationSelect(selectedImageUrl);
            },
          });
        } else {
          setAngleError(err.message || "You've hit today's generation limit. Try again tomorrow.");
        }
      } else {
        console.error('Angle generation failed:', err);
        setAngleError(err.message || 'Failed to generate angle views.');
      }
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
        modelId: draftModelIdRef.current,
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

    // Phase 6: shipping_info is no longer written here — it's collected
    // at checkout and stored on the user's profile. We still persist the
    // selected 2D preview so meshy-webhook can attach it to the result.
    const info = collectedInfoRef.current;
    if (info) {
      const updatePayload: Record<string, any> = { user_id: info.userId };
      if (selectedVariationUrlRef.current) {
        updatePayload.selected_2d_preview = selectedVariationUrlRef.current;
      }
      const { error: updateError } = await supabase
        .from('generated_models')
        .update(updatePayload)
        .eq('id', taskId);
      if (updateError) {
        console.error('⚠️ Failed to save model metadata:', updateError);
      }
    }

    // Redirect immediately — the meshy-webhook will handle scaling, quoting, and email
    console.log('🔄 Redirecting to model page. Webhook will handle post-processing.');
    navigate(`/model/${taskId}`);
  };


  const isWorking = status === 'generating' || status === 'scaling';

  // Renders the save-account modal overlay if active. Called at each
  // conditional return site so the modal survives any status branch.
  const renderSaveModal = () =>
    saveModal ? (
      <SaveAccountModal
        heading={saveModal.heading}
        subheading={saveModal.subheading}
        required={saveModal.required}
        onSuccess={saveModal.onSuccess || (() => setSaveModal(null))}
        onDismiss={saveModal.required ? undefined : () => setSaveModal(null)}
      />
    ) : null;

  // ── Generating angle views (progressive) ────────────────────────────
  if (status === 'generating_angles' && selectedVariationUrl) {
    const loadedCount = angleImages?.filter(Boolean).length || 0;
    return (
      <>
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
      {renderSaveModal()}
      </>
    );
  }

  // ── Info collection view ──────────────────────────────────────────────
  if (status === 'info_collection' && selectedVariationUrl) {
    return (
      <>
        <InfoCollection
          selectedImage={selectedVariationUrl}
          prompt={imagePrompt || prompt || 'AI-generated design'}
          onSubmit={handleInfoSubmit}
          onRequireAccount={() => setSaveModal({
            required: true,
            heading: 'Create a free account to continue',
            subheading: 'Save your design and track your order — takes 10 seconds.',
            onSuccess: () => {
              setSaveModal(null);
              // After conversion the user is no longer anonymous; the
              // InfoCollection button will then go straight through.
            },
          })}
          loading={false}
          angleImages={angleImages?.filter((img): img is string => !!img) || null}
          angleLabels={ANGLE_LABELS}
        />
        {renderSaveModal()}
      </>
    );
  }

  // ── Pre-generation view ──────────────────────────────────────────────
  if (!isWorking && status === 'pending') {
    // While a resume hydration is in-flight, don't flash the empty form.
    if (!resumeHydrated) {
      return (
        <BeamsBackground className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center" intensity="medium">
          <Loader2 className="h-8 w-8 text-brand-accent animate-spin" />
        </BeamsBackground>
      );
    }
    return (
      <>
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
                  slotCount={NUM_VARIATIONS}
                />
                {transformError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-500/30">
                    <p className="text-sm text-red-400">{transformError}</p>
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => { setTransformedImages(null); setTransformError(null); }}
                    className="text-sm text-white/40 hover:text-white/70 underline"
                  >
                    Back to form
                  </button>
                  {user?.isAnonymous && draftModelIdRef.current && (
                    <button
                      onClick={() => setSaveModal({
                        required: false,
                        heading: 'Save your designs',
                        subheading: 'Create a free account to keep these variations and continue later.',
                        onSuccess: () => setSaveModal(null),
                      })}
                      className="text-sm text-brand-accent hover:text-brand-accent/80 underline"
                    >
                      Save my work
                    </button>
                  )}
                </div>
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
                printTypeSlug={printType?.slug}
                coupleMode={coupleMode}
                setCoupleMode={setCoupleMode}
                partner2File={partner2File}
                setPartner2File={setPartner2File}
                partner2Preview={partner2Preview}
                setPartner2Preview={setPartner2Preview}
                couplePresets={couplePresets}
                setCouplePresets={setCouplePresets}
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
      {renderSaveModal()}
      </>
    );
  }

  // ── Generating / processing overlay ──────────────────────────────────
  if (isWorking) {
    return (
      <>
      <BeamsBackground className="pt-16 min-h-screen bg-brand-dark" intensity="medium">
        <GenerationProgress
          progress={status === 'completed' ? 100 : status === 'scaling' ? 90 : generationProgress}
          status={status === 'scaling' ? 'generating' : status}
          estimatedTime={status === 'scaling' ? 'Scaling model...' : undefined}
        />
      </BeamsBackground>
      {renderSaveModal()}
      </>
    );
  }

  // ── Post-generation: redirect to model result page ──────────────────
  // This shouldn't normally render since polling success redirects,
  // but handle edge cases (e.g., coming back with existing model)
  return (
    <>
    <BeamsBackground className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center" intensity="medium">
      <div className="text-center">
        <p className="text-white/50">Redirecting to your model...</p>
      </div>
    </BeamsBackground>
    {renderSaveModal()}
    </>
  );
}