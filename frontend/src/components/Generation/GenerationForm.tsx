import { useState } from 'react';
import { Upload, Type, Settings, Wand2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { Card } from '../UI/Card';
import { useAuth } from '../../hooks/useAuth';
import { modelService } from '../../services/modelService';

interface GenerationFormProps {
  onSuccess?: (model?: any) => void;
  loading?: boolean;
}

export function GenerationForm({ onSuccess, loading: initialLoading }: GenerationFormProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string>();
  const [settings, setSettings] = useState({
    size: 'medium' as const,
    style: 'realistic' as const,
    quality: 'standard' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to generate models');
      return;
    }

    // For image mode, prompt is optional. For text mode, prompt is required.
    if (mode === 'text' && !prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    // For image mode, we need an image (prompt is optional)
    if (mode === 'image' && !image) {
      setError('Please upload an image');
      return;
    }

    setLoading(true);
    setError(undefined);
    
    try {
      console.log('Starting model generation with params:', { prompt: prompt.trim(), hasImage: !!image });

      // Use the new unified modelService (handles routing to ComfyUI or MeshyAI)
      const result = await modelService.generate3DModel({
        prompt: prompt.trim(),
        image: image || undefined
      });

      if (!result.success) {
        setError(result.error || 'Failed to generate model');
        return;
      }
      
      // Clear form
      setPrompt('');
      setImage(null);
      setImagePreview('');
      
      if (onSuccess) {
        // Transform response to match expected structure
        const transformedData = {
          prompt: prompt.trim(),
          style: settings.style,
          urls: {
            glb: result.data?.modelUrl || result.data?.model_url,
            obj: result.data?.objUrl,
            stl: result.data?.stlUrl || result.data?.downloadUrl
          },
          modelDetails: result.data,
          type: result.data?.type || 'unknown',
          taskId: result.data?.taskId || result.data?.task_id
        };
        
        console.log('🔄 GenerationForm: Transforming response for parent');
        console.log('📦 GenerationForm: Original result.data:', result.data);
        console.log('🎯 GenerationForm: Transformed data:', transformedData);
        console.log('🔗 GenerationForm: GLB URL in transformed data:', transformedData.urls.glb);
        
        onSuccess(transformedData);
      }
    } catch (err) {
      console.error('Error generating model:', err);
      if (err instanceof Error) {
        if (err.message.includes('ComfyUI')) {
          setError(`ComfyUI generation failed: ${err.message}. Please try again or check your image.`);
        } else if (err.message.includes('MeshyAI')) {
          setError(`MeshyAI generation failed: ${err.message}. Please try a different prompt.`);
        } else if (err.message.includes('Network') || err.message.includes('network')) {
          setError('Network error. Please check your connection and try again.');
        } else if (err.message.includes('timeout')) {
          setError('Generation timeout. Please try again - this may take 5-15 minutes.');
        } else {
          setError(err.message);
        }
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('Failed to generate model. Please try again.');
      }
      console.log('Full error details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
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
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {image ? image.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                </label>
              </div>
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-contain rounded-lg border"
                  />
                </div>
              )}
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
            icon={Wand2}
            loading={loading}
            className="w-full"
            size="lg"
            disabled={!user}
          >
            {loading ? 'Generating...' : 'Generate 3D Model'}
          </Button>
        </form>
      </div>
    </Card>
  );
}