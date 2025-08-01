import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThumbnailGenerator } from '../hooks/useThumbnailGenerator';
import { GenerationForm } from '../components/Generation/GenerationForm';
import { GenerationProgress } from '../components/Generation/GenerationProgress';
import { ModelViewer } from '../components/3D/ModelViewer';
import { ThumbnailSelector } from '../components/UI/ThumbnailSelector';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Download, Share2, ShoppingCart, Camera, Store } from 'lucide-react';

export function Generate() {
  const [status, setStatus] = useState<'pending' | 'generating' | 'completed' | 'failed'>('pending');
  const [generatedModel, setGeneratedModel] = useState<any>(null);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [thumbnailData, setThumbnailData] = useState<{
    angles: { [angle: string]: string };
    selectedAngle: string;
    isCustom: boolean;
  } | null>(null);

  const navigate = useNavigate();

  // Client-side thumbnail generation
  const {
    isGenerating: isGeneratingThumbnails,
    generateThumbnails
  } = useThumbnailGenerator({ 
    uploadToStorage: false // Use data URLs for MVP speed
  });

  const handleGenerationSuccess = async (modelData: any) => {
    console.log('🎯 Model generation successful, received data:', modelData);
    setStatus('completed');
    setGeneratedModel(modelData);
    
    // Start client-side thumbnail generation immediately
    if (modelData.urls?.glb) {
      console.log('🎨 Starting client-side thumbnail generation...');
      try {
        const generatedThumbnails = await generateThumbnails(
          modelData.urls.glb,
          modelData.id
        );
        
        setThumbnailData({
          angles: generatedThumbnails,
          selectedAngle: Object.keys(generatedThumbnails)[0] || 'front',
          isCustom: false
        });
        setShowThumbnailSelector(true);
      } catch (error) {
        console.error('Failed to generate thumbnails:', error);
        // Continue without thumbnails - not a blocking error
      }
    }
  };

  const handleBuyNow = () => {
    navigate('/order');
  };

  const handlePublishToMarketplace = () => {
    navigate('/marketplace-upload', {
      state: {
        modelData: generatedModel,
        modelUrl: generatedModel?.urls?.glb
      }
    });
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Generate Your 3D Model
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your ideas into 3D reality with AI-powered generation in under 60 seconds
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generation Form */}
          <div className="space-y-6">
            <GenerationForm onSuccess={handleGenerationSuccess} />
            
            {status !== 'pending' && (
              <GenerationProgress
                progress={status === 'completed' ? 100 : 50}
                status={status}
                estimatedTime="45 seconds"
              />
            )}
          </div>

          {/* Preview/Results */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                3D Preview
              </h3>
              <ModelViewer 
                modelUrl={generatedModel?.urls?.glb}
                className="h-80 w-full"
              />
            </Card>

            {status === 'completed' && generatedModel && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Model is Ready!
                </h3>
                
                {/* Thumbnail Generation Status */}
                {isGeneratingThumbnails && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <Camera className="h-4 w-4 text-blue-600 mr-2 animate-pulse" />
                      <span className="text-sm text-blue-700">Generating thumbnails...</span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button icon={Download} className="w-full">
                      Download
                    </Button>
                    <Button variant="outline" icon={Share2} className="w-full">
                      Share
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      icon={ShoppingCart} 
                      className="w-full"
                      onClick={() => navigate('/manufacturing')}
                    >
                      Print
                    </Button>
                    <Button 
                      icon={ShoppingCart} 
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      onClick={handleBuyNow}
                    >
                      Buy Now
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      variant="outline" 
                      icon={Store} 
                      className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={handlePublishToMarketplace}
                    >
                      Publish to Marketplace
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Model Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Format:</span>
                        <span className="ml-2 font-medium">STL, OBJ</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Size:</span>
                        <span className="ml-2 font-medium">Medium</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Polygons:</span>
                        <span className="ml-2 font-medium">12,480</span>
                      </div>
                      <div>
                        <span className="text-gray-500">File Size:</span>
                        <span className="ml-2 font-medium">2.4 MB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
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