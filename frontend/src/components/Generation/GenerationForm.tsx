import { useState, useEffect } from 'react';
import { Upload, Type, Settings, X, Loader2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';
import { useAuth } from '../../hooks/useAuth';
import { modelService } from '../../services/modelService';

interface GenerationFormProps {
  onSuccess: (data: any) => void;
  mode: 'text' | 'image';
  setMode: (mode: 'text' | 'image') => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  imageFile: File | null;
  setImageFile: (file: File | null) => void;
  imagePreview: string | null;
  setImagePreview: (preview: string | null) => void;
  isGenerating: boolean;
  prefilledData?: {
    prefilledPrompt?: string;
    socialTag?: string;
    mode?: 'text' | 'image';
    image?: File;
  } | null;
}

export function GenerationForm({
  onSuccess,
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
}: GenerationFormProps) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    size: 'medium' as const,
    style: 'realistic' as const,
    quality: 'standard' as const,
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
    if (!user) {
      setError('Please log in to generate models');
      return;
    }

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
          userId: user.id
        });
        
      } else {
        // Image-to-3D generation
        if (!imagePreview) {
          throw new Error('No image data available');
        }
        console.log('Starting image-to-3D generation with file:', imageFile!.name);
        modelData = await modelService.generate3DModel({
          ...baseParams,
          prompt: imageFile ? imageFile.name : 'Image-to-3D generation', // Use filename or a fallback
          image: imagePreview, // Send data URI for image-to-3D
          userId: user.id
        });
      }
      
      // Clear form based on mode
      if (mode === 'text') {
        setPrompt('');
      } else {
        setImageFile(null);
        setImagePreview(null);
      }
      
      if (onSuccess) {
        onSuccess({
          ...modelData,
          prompt: mode === 'text' ? prompt.trim() : `Image: ${imageFile?.name}`,
          style: settings.style
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
                ? 'border-purple-500 bg-purple-50 text-purple-700'
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
                ? 'border-purple-500 bg-purple-50 text-purple-700'
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                rows={4}
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload reference image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                <input
                  type="file"
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                  id="image-upload"
                  required
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
            </div>
          )}

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700">Generation Settings</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <select
                  value={settings.size}
                  onChange={(e) => setSettings({ ...settings, size: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                <select
                  value={settings.style}
                  onChange={(e) => setSettings({ ...settings, style: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
            disabled={isGenerating}
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
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