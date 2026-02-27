import { useState, useEffect } from 'react';
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
  onImageTransformRequest?: (image: string, prompt: string) => void;
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
}: GenerationFormProps) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    style: 'realistic' as const,
    quality: 'standard' as const,
  });
  const [dimensions, setDimensions] = useState<ModelDimensions>({
    value: 10,
    unit: 'cm',
    target: 'longest',
  });

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

    try {
      // Image mode with a prompt: route through fal.ai transform first
      if (mode === 'image' && imagePrompt.trim() && onImageTransformRequest && imagePreview) {
        console.log('Routing to image transform with prompt:', imagePrompt.trim());
        onImageTransformRequest(imagePreview, imagePrompt.trim());
        return;
      }

      let modelData;

      // Prepare generation parameters with explicit type
      const baseParams = {
        type: mode === 'image' ? ('image-to-3d' as const) : ('text-to-3d' as const),
        mode: 'preview' as const // Always use preview mode for now
      };

      if (mode === 'text') {
        // Text-to-3D generation
        console.log('Starting text-to-3D generation with prompt:', prompt.trim());
        modelData = await modelService.generate3DModel({
          ...baseParams,
          prompt: `${prompt}${prefilledData?.socialTag ? ` #${prefilledData.socialTag}` : ''}`,
          userId: user?.id
        });

      } else {
        // Image-to-3D generation (no transform prompt — direct to Meshy)
        if (!imagePreview) {
          throw new Error('No image data available');
        }
        console.log('Starting image-to-3D generation with file:', imageFile!.name);
        modelData = await modelService.generate3DModel({
          ...baseParams,
          prompt: imageFile ? imageFile.name : 'Image-to-3D generation',
          image: imagePreview,
          userId: user?.id
        });
      }

      // Clear form based on mode
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
          dimensions: dimensions // Pass dimensions for post-generation scaling
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

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Mode Selection */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-all ${
              mode === 'text'
                ? 'border-brand-primary bg-brand-light text-brand-primary'
                : 'border-gray-200 hover:border-gray-300'
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
                ? 'border-brand-primary bg-brand-light text-brand-primary'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Upload className="h-5 w-5" />
            <span>Upload Image</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Section */}
          {mode === 'text' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your 3D model
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic coffee mug with geometric patterns..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary resize-none"
                rows={4}
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload reference image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand-primary transition-colors">
                <input
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {imageFile ? imageFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                </label>
                {imagePreview && (
                  <div className="mt-4 relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-auto rounded-lg" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-75"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Image Transform Prompt */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-1">
                    <Wand2 className="h-4 w-4 text-brand-accent" />
                    <span>Describe how to transform this image</span>
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </div>
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Make this look like a fantasy warrior, turn this into a robot, style it as a cartoon character..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {imagePrompt.trim()
                    ? 'Your image will be transformed with AI before 3D generation. You will choose from 4 variations.'
                    : 'Leave empty to convert the image directly to 3D.'}
                </p>
              </div>
            </div>
          )}

          {/* Model Dimensions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Ruler className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700">Model Size</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={dimensions.value}
                  onChange={(e) => setDimensions({ ...dimensions, value: Math.max(1, Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  value={dimensions.unit}
                  onChange={(e) => setDimensions({ ...dimensions, unit: e.target.value as DimensionUnit })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                >
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="inches">inches</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimension</label>
                <select
                  value={dimensions.target}
                  onChange={(e) => setDimensions({ ...dimensions, target: e.target.value as DimensionTarget })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                >
                  <option value="height">Height</option>
                  <option value="width">Width</option>
                  <option value="depth">Depth</option>
                  <option value="longest">Longest Edge</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Your model will be scaled so the {dimensions.target} is {dimensions.value} {dimensions.unit}
            </p>
          </div>

          {/* Generation Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700">Generation Settings</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                <select
                  value={settings.style}
                  onChange={(e) => setSettings({ ...settings, style: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                >
                  <option value="realistic">Realistic</option>
                  <option value="stylized">Stylized</option>
                  <option value="minimalist">Minimalist</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
                <select
                  value={settings.quality}
                  onChange={(e) => setSettings({ ...settings, quality: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                >
                  <option value="draft">Draft</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
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
            ) : mode === 'image' && imagePrompt.trim() ? (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Transform & Preview
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}