import { useState, useEffect, useCallback } from 'react';
import { Upload, Type, Settings, X, Loader2, Ruler, Wand2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';
import { useAuth } from '../../hooks/useAuth';
import { modelService } from '../../services/modelService';
import type { DimensionUnit, DimensionTarget } from '../../utils/modelScaler';

export interface ModelDimensions {
  value: number;
  unit: DimensionUnit;
  target: DimensionTarget;
}

interface GenerationFormProps {
  onSuccess: (data: any) => void;
  onImageTransformRequest?: (image: string | null, prompt: string, dimensions: ModelDimensions) => void;
  mode: 'text' | 'image';
  setMode: (mode: 'text' | 'image') => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  imagePreview: string | null;
  setImagePreview: (preview: string | null) => void;
  isGenerating: boolean;
  isTransforming?: boolean;
  imagePrompt: string;
  setImagePrompt: (prompt: string) => void;
  prefilledData?: {
    prefilledPrompt?: string;
    socialTag?: string;
    mode?: 'text' | 'image';
    image?: File;
  } | null;
  defaultDimensions?: ModelDimensions;
  /** When true, shows the full form (text mode, dimensions, style/quality, transform prompt). When false, shows simplified image-only form. */
  isCustom?: boolean;
}

export function GenerationForm({
  onSuccess,
  onImageTransformRequest,
  prefilledData,
  mode,
  setMode,
  prompt,
  setPrompt,
  imageFile,
  setImageFile,
  imagePreview,
  setImagePreview,
  isGenerating,
  isTransforming,
  imagePrompt,
  setImagePrompt,
  defaultDimensions,
  isCustom = true,
}: GenerationFormProps) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    style: 'realistic' as const,
    quality: 'standard' as const,
  });
  const [dimensions, setDimensions] = useState<ModelDimensions>(
    defaultDimensions || { value: 10, unit: 'cm', target: 'longest' }
  );

  useEffect(() => {
    if (prefilledData) {
      setMode(prefilledData.mode || 'text');
      setPrompt(prefilledData.prefilledPrompt || '');
      if (prefilledData.image) {
        setImageFile(prefilledData.image);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(prefilledData.image);
      }
    }
  }, [prefilledData, setMode, setPrompt, setImageFile, setImagePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate inputs based on mode
    if (mode === 'text' && !prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (mode === 'image' && !imageFile) {
      setError('Please select an image');
      return;
    }

    setError(null);

    // ALL paths go through fal.ai first to generate 2D previews
    if (onImageTransformRequest) {
      if (mode === 'text') {
        // Text-to-image: no source image, just the prompt
        const fullPrompt = `${prompt.trim()}${prefilledData?.socialTag ? ` #${prefilledData.socialTag}` : ''}`;
        console.log('Routing text prompt to fal.ai for 2D previews:', fullPrompt);
        onImageTransformRequest(null, fullPrompt, dimensions);
      } else if (imagePrompt.trim()) {
        // Image + transform prompt
        console.log('Routing image + prompt to fal.ai for 2D previews:', imagePrompt.trim());
        onImageTransformRequest(imagePreview, imagePrompt.trim(), dimensions);
      } else {
        // Image only — use system prompt to optimize for 3D printing
        console.log('Routing image to fal.ai for 3D-optimized previews');
        onImageTransformRequest(imagePreview, 'Transform this image into a 3D-printable model', dimensions);
      }
      return;
    }

    // Fallback: direct generation if onImageTransformRequest is not provided
    try {
      let modelData;
      const baseParams = {
        type: mode === 'image' ? ('image-to-3d' as const) : ('text-to-3d' as const),
        mode: 'preview' as const
      };

      if (mode === 'text') {
        modelData = await modelService.generate3DModel({
          ...baseParams,
          prompt: `${prompt}${prefilledData?.socialTag ? ` #${prefilledData.socialTag}` : ''}`,
          userId: user?.id
        });
      } else {
        if (!imagePreview) throw new Error('No image data available');
        modelData = await modelService.generate3DModel({
          ...baseParams,
          prompt: imageFile ? imageFile.name : 'Image-to-3D generation',
          image: imagePreview,
          userId: user?.id
        });
      }

      if (mode === 'text') {
        setPrompt('');
      } else {
        setImageFile(null);
        setImagePreview(null);
        setImagePrompt('');
      }

      if (onSuccess) {
        onSuccess({
          ...modelData,
          prompt: mode === 'text' ? prompt.trim() : `Image: ${imageFile?.name}`,
          style: settings.style,
          dimensions: dimensions
        });
      }
    } catch (err) {
      console.error('Error generating model:', err);
      // Extract error message with proper type handling
      const errorMessage = (() => {
        if (err && typeof err === 'object' && 'message' in err) {
          return String(err.message);
        }
        if (typeof err === 'string') {
          return err;
        }
        return 'Failed to generate model. Please try again.';
      })();

      // Friendly error messages for common cases
      let userMessage: string;
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        userMessage = 'Generation took too long. Please try again.';
      } else if (errorMessage.includes('refine') || errorMessage.includes('Refine')) {
        userMessage = 'Failed to refine model. Please try again.';
      } else if (errorMessage.includes('download')) {
        userMessage = 'Failed to download model files. Please try again.';
      } else if (errorMessage.includes('storage') || errorMessage.includes('database')) {
        userMessage = 'Failed to save model. Please try again.';
      } else {
        userMessage = errorMessage;
      }

      setError(userMessage);
    } finally {
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop handlers
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging false if we're actually leaving the container
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) return;

      // Read file first, then switch mode and set preview together
      const reader = new FileReader();
      reader.onloadend = () => {
        if (mode === 'text') setMode('image');
        setImageFile(file);
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [setImageFile, setImagePreview, mode, setMode]);

  const inputClasses = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50";
  const selectClasses = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 [&>option]:bg-brand-dark [&>option]:text-white";
  const labelClasses = "block text-sm font-medium text-white/70 mb-1";

  return (
    <Card className="p-6">
      <div className="space-y-6" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {/* Mode Selection — only show for custom */}
        {isCustom && (
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-all ${
                mode === 'text'
                  ? 'border-brand-accent/50 bg-brand-accent/10 text-brand-accent'
                  : 'border-white/10 hover:border-white/20 text-white/50'
              }`}
            >
              <Type className="h-5 w-5" />
              <span>Text Prompt</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('image')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-all ${
                mode === 'image'
                  ? 'border-brand-accent/50 bg-brand-accent/10 text-brand-accent'
                  : 'border-white/10 hover:border-white/20 text-white/50'
              }`}
            >
              <Upload className="h-5 w-5" />
              <span>Upload Image</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Section */}
          {isCustom && mode === 'text' ? (
            <div>
              <label className={labelClasses}>
                Describe your 3D model
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic coffee mug with geometric patterns..."
                className={`${inputClasses} resize-none`}
                rows={4}
                required
              />
            </div>
          ) : (
            <div>
              <label className={labelClasses}>
                Upload reference image
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging
                    ? 'border-brand-accent/60 bg-brand-accent/10'
                    : 'border-white/10 hover:border-brand-accent/30'
                }`}
              >
                <input
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/50">
                    {imageFile ? imageFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-white/30 mt-1">PNG, JPG up to 10MB</p>
                </label>
                {imagePreview && (
                  <div className="mt-4 relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-auto rounded-lg" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/75"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Image Transform Prompt — only show for custom */}
              {isCustom && (
                <div className="mt-4">
                  <label className={labelClasses}>
                    <div className="flex items-center space-x-1">
                      <Wand2 className="h-4 w-4 text-brand-accent" />
                      <span>Describe how to transform this image</span>
                      <span className="text-white/30 font-normal">(optional)</span>
                    </div>
                  </label>
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Make this look like a fantasy warrior, turn this into a robot, style it as a cartoon character..."
                    className={`${inputClasses} resize-none`}
                    rows={3}
                  />
                  <p className="text-xs text-white/30 mt-1">
                    {imagePrompt.trim()
                      ? 'Your image will be transformed with AI before 3D generation. You will choose from 4 variations.'
                      : 'Leave empty to convert the image directly to 3D.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Model Dimensions — only show for custom */}
          {isCustom && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Ruler className="h-4 w-4 text-white/30" />
                <h3 className="text-sm font-medium text-white/70">Model Size</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClasses}>Size</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={dimensions.value}
                    onChange={(e) => setDimensions({ ...dimensions, value: Math.max(1, Number(e.target.value)) })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Unit</label>
                  <select
                    value={dimensions.unit}
                    onChange={(e) => setDimensions({ ...dimensions, unit: e.target.value as DimensionUnit })}
                    className={selectClasses}
                  >
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                    <option value="inches">inches</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Dimension</label>
                  <select
                    value={dimensions.target}
                    onChange={(e) => setDimensions({ ...dimensions, target: e.target.value as DimensionTarget })}
                    className={selectClasses}
                  >
                    <option value="height">Height</option>
                    <option value="width">Width</option>
                    <option value="depth">Depth</option>
                    <option value="longest">Longest Edge</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-white/30">
                Your model will be scaled so the {dimensions.target} is {dimensions.value} {dimensions.unit}
              </p>
            </div>
          )}

          {/* Generation Settings — only show for custom */}
          {isCustom && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-white/30" />
                <h3 className="text-sm font-medium text-white/70">Generation Settings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Style</label>
                  <select
                    value={settings.style}
                    onChange={(e) => setSettings({ ...settings, style: e.target.value as any })}
                    className={selectClasses}
                  >
                    <option value="realistic">Realistic</option>
                    <option value="stylized">Stylized</option>
                    <option value="minimalist">Minimalist</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Quality</label>
                  <select
                    value={settings.quality}
                    onChange={(e) => setSettings({ ...settings, quality: e.target.value as any })}
                    className={selectClasses}
                  >
                    <option value="draft">Draft</option>
                    <option value="standard">Standard</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isGenerating || isTransforming}
            size="lg"
          >
            {isTransforming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transforming Image...
              </>
            ) : isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Previews
              </>
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
