import { useState } from 'react';
import { Upload, Type, Settings, Wand2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { Card } from '../UI/Card';
import { useAuth } from '../../hooks/useAuth';
import { meshyService } from '../../services/meshy';

interface GenerationFormProps {
  onSuccess?: () => void;
  loading?: boolean;
}

export function GenerationForm({ onSuccess, loading: initialLoading }: GenerationFormProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
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

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(undefined);
    
    try {
      // Convert form data to Meshy API format
      const generationData = {
        prompt: prompt.trim(),
        style: settings.style,
        negative_prompt: '',
        seed: Math.floor(Math.random() * 1000000)
      };

      console.log('Starting model generation with params:', generationData);

      // Generate and store the model
      await meshyService.generateAndStoreModel(generationData, user.id);
      
      // Clear form
      setPrompt('');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error generating model:', err);
      if (err instanceof Error) {
        if (err.message.includes('preview') || err.message.includes('Preview')) {
          setError('Failed to create preview. Please try a different prompt or try again later.');
        } else if (err.message.includes('refine') || err.message.includes('Refine')) {
          setError('Failed to refine model. Please try again.');
        } else if (err.message.includes('download')) {
          setError('Failed to download model files. Please try again.');
        } else if (err.message.includes('storage') || err.message.includes('database')) {
          setError('Failed to save model. Please try again.');
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
                  required
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {image ? image.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                </label>
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