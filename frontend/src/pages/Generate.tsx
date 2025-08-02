import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GenerationForm } from '../components/Generation/GenerationForm';
import { GenerationProgress } from '../components/Generation/GenerationProgress';
import { ModelViewer } from '../components/3D/ModelViewer';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Share2, ShoppingCart, Store, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';

export function Generate() {
  const [status, setStatus] = useState<'pending' | 'generating' | 'completed' | 'failed'>('pending');
  const [generatedModel, setGeneratedModel] = useState<any>(null);

  const navigate = useNavigate();

  const convertToSTL = async (glbUrl: string, modelId: string) => {
    try {
      console.log('🔧 Starting background GLB to STL conversion...');
      
      const { data, error } = await supabase.functions.invoke('save-stl-to-bucket', {
        body: { 
          glbUrl,
          modelId
        }
      });

      if (error) {
        console.error('❌ STL conversion failed:', error);
        return null;
      }

      if (!data.success) {
        console.error('❌ STL conversion API error:', data.error);
        return null;
      }

      console.log('✅ STL conversion completed:', {
        fileSize: data.data.fileSize,
        meshCount: data.data.meshCount,
        finalSize: data.data.scalingInfo.finalMaxDimension + 'mm'
      });
      
      return data.data.stlUrl;
      
    } catch (err) {
      console.error('❌ STL conversion error:', err);
      return null;
    }
  };

  const handleGenerationSuccess = async (modelData: any) => {
    console.log('🎯 Model generation successful, received data:', modelData);
    setStatus('completed');
    setGeneratedModel(modelData);
    
    // Start background STL conversion if GLB URL is available
    if (modelData.urls?.glb) {
      console.log('🔧 Starting background STL conversion from GLB...');
      convertToSTL(modelData.urls.glb, modelData.id);
      // Note: We don't await this - it runs in background
    }
  };

  const handleBuyNow = () => {
    navigate('/download-checkout', {
      state: {
        modelData: generatedModel,
        modelUrl: generatedModel?.urls?.glb,
        price: 12.99, // Standard price for generated models
        isGenerated: true
      }
    });
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
                
                <div className="space-y-3">
                  {/* Primary Action - Print This Design */}
                  <Button 
                    icon={Printer} 
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg py-4"
                    onClick={() => navigate('/order', {
                      state: {
                        modelData: generatedModel,
                        modelUrl: generatedModel?.urls?.glb,
                        stlUrl: generatedModel?.urls?.stl
                      }
                    })}
                    size="lg"
                  >
                    Print
                  </Button>
                  
                  {/* Secondary Action - Buy Now */}
                  <Button 
                    icon={ShoppingCart} 
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    onClick={handleBuyNow}
                  >
                    Download
                  </Button>

                  {/* Tertiary Action - Publish to Marketplace */}
                  <Button 
                    variant="outline" 
                    icon={Store} 
                    className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                    onClick={handlePublishToMarketplace}
                  >
                    Publish to Marketplace
                  </Button>
                  
                  {/* Bottom Action - Share */}
                  <Button 
                    variant="outline" 
                    icon={Share2} 
                    className="w-full"
                  >
                    Share
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
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}