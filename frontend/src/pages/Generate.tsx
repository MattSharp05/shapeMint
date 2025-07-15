import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { GenerationForm } from '../components/Generation/GenerationForm';
import { GenerationProgress } from '../components/Generation/GenerationProgress';
import { ModelViewer } from '../components/3D/ModelViewer';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Download, Share2, ShoppingCart } from 'lucide-react';

export function Generate() {
  const [status, setStatus] = useState<'pending' | 'generating' | 'completed' | 'failed'>('pending');


  const navigate = useNavigate();



  const handleBuyNow = () => {
    navigate('/order');
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
            <GenerationForm onSuccess={() => setStatus('completed')} />
            
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
                modelUrl={undefined}
                className="h-80 w-full"
              />
            </Card>

            {status === 'completed' && generatedModel && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Model is Ready!
                </h3>
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
                      Get Quote
                    </Button>
                    <Button 
                      icon={ShoppingCart} 
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      onClick={handleBuyNow}
                    >
                      Buy Now
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
    </div>
  );
}