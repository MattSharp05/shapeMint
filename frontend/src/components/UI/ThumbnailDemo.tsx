import { useState } from 'react';
import { useThumbnailGenerator } from '../../hooks/useThumbnailGenerator';
import { DEFAULT_CAMERA_ANGLES } from '../../services/thumbnailGenerator';
import { Button } from './Button';
import { Card } from './Card';
import { Camera, Download } from 'lucide-react';

interface ThumbnailDemoProps {
  modelUrl?: string;
  modelId?: string;
}

export function ThumbnailDemo({ modelUrl, modelId }: ThumbnailDemoProps) {
  const [testUrl, setTestUrl] = useState(modelUrl || '');
  const [testId, setTestId] = useState(modelId || 'test-model');
  
  const {
    isGenerating,
    progress,
    thumbnails,
    error,
    completed,
    generateThumbnails,
    resetState
  } = useThumbnailGenerator();

  const handleGenerate = async () => {
    if (!testUrl.trim()) return;
    
    try {
      await generateThumbnails(testUrl, testId, DEFAULT_CAMERA_ANGLES);
    } catch (err) {
      console.error('Demo generation failed:', err);
    }
  };

  const downloadThumbnail = (angleName: string, dataUrl: string) => {
    const link = document.createElement('a');
    link.download = `${testId}-${angleName}.jpg`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Thumbnail Generator Demo</h2>
      
      {/* Input Controls */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model URL (GLB):
          </label>
          <input
            type="url"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://example.com/model.glb"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model ID:
          </label>
          <input
            type="text"
            value={testId}
            onChange={(e) => setTestId(e.target.value)}
            placeholder="test-model-id"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        
        <div className="flex space-x-3">
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || !testUrl.trim()}
            icon={Camera}
          >
            {isGenerating ? 'Generating...' : 'Generate Thumbnails'}
          </Button>
          
          {(completed || error) && (
            <Button 
              onClick={resetState}
              variant="outline"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Generation Progress:</h3>
          <div className="space-y-1">
            {DEFAULT_CAMERA_ANGLES.map((angle) => (
              <div key={angle.name} className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  progress[angle.name] ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className={`text-sm ${
                  progress[angle.name] ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {angle.label} {progress[angle.name] ? '✓' : '...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">Error:</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Generated Thumbnails */}
      {completed && Object.keys(thumbnails).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Generated Thumbnails ({Object.keys(thumbnails).length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(thumbnails).map(([angleName, dataUrl]) => {
              const angle = DEFAULT_CAMERA_ANGLES.find((a) => a.name === angleName);
              const imageUrl = dataUrl as string;
              return (
                <div key={angleName} className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={imageUrl} 
                    alt={angle?.label || angleName}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {angle?.label || angleName}
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadThumbnail(angleName, imageUrl)}
                        icon={Download}
                      >
                        Download
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Data URL ({Math.round(imageUrl.length / 1024)}KB)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
