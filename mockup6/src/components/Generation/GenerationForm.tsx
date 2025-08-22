import React, { useState } from 'react';
import { Upload, Type, Settings, Wand2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { Card } from '../UI/Card';

interface GenerationFormProps {
  onGenerate: (data: any) => void;
  loading?: boolean;
  initialData?: any;
  isEditing?: boolean;
  socialTag?: string;
}

export function GenerationForm({ onGenerate, loading, initialData, isEditing, socialTag }: GenerationFormProps) {
  const [mode, setMode] = useState<'text' | 'image'>(initialData?.mode || 'text');
  const [prompt, setPrompt] = useState(initialData?.prompt || '');
  const [image, setImage] = useState<File | null>(null);
  const [settings, setSettings] = useState({
    size: (initialData?.settings?.size || 'medium') as const,
    style: (initialData?.settings?.style || 'realistic') as const,
    quality: (initialData?.settings?.quality || 'standard') as const,
  });

  // Update form when initialData changes (for editing)
  React.useEffect(() => {
    if (initialData && isEditing) {
      setMode(initialData.mode || 'text');
      setPrompt(initialData.prompt || '');
      setImage(initialData.image || null);
      setSettings({
        size: initialData.settings?.size || 'medium',
        style: initialData.settings?.style || 'realistic',
        quality: initialData.settings?.quality || 'standard',
      });
    } else if (initialData && !isEditing) {
      // Handle prefilled data from Explore page
      setMode(initialData.mode || 'text');
      setPrompt(initialData.prompt || '');
      setImage(initialData.image || null);
      setSettings({
        size: initialData.settings?.size || 'medium',
        style: initialData.settings?.style || 'realistic',
        quality: initialData.settings?.quality || 'standard',
      });
    } else {
      // Reset to defaults when no initial data (regenerate case)
      setMode('text');
      setPrompt('');
      setImage(null);
      setSettings({
        size: 'medium',
        style: 'realistic',
        quality: 'standard',
      });
    }
  }, [initialData, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      mode,
      prompt: mode === 'text' ? prompt : undefined,
      image: mode === 'image' ? image : undefined,
      settings,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  return (
    <Card className="p-6">
      {isEditing && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">Editing Mode</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Modify your prompt and settings, then generate a new version
          </p>
        </div>
      )}
      
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
                {isEditing ? 'Edit your description' : 'Describe your 3D model'}
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

          <Button
            type="submit"
            icon={Wand2}
            loading={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Generating...' : isEditing ? 'Generate Updated Model' : 'Generate 3D Model'}
          </Button>
          
          {socialTag && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-sm text-blue-700">
                💡 <strong>Perfect for social media!</strong> Share with: <span className="font-mono">{socialTag}</span>
              </p>
            </div>
          )}
        </form>
      </div>
    </Card>
  );
}