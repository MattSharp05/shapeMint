import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GenerationForm } from '../components/Generation/GenerationForm';
import { GenerationProgress } from '../components/Generation/GenerationProgress';
import { ModelViewer } from '../components/3D/ModelViewer';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Download, Share2, ShoppingCart, Upload } from 'lucide-react';
import { modelService } from '../services/modelService';

export function Generate() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'pending' | 'generating' | 'completed' | 'failed'>('pending');
  const [generatedModel, setGeneratedModel] = useState<string | null>(null);
  const [generationData, setGenerationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [refineProgress, setRefineProgress] = useState(0);
  const [refineError, setRefineError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGenerate = async (data: any) => {
    setGenerating(true);
    setStatus('generating');
    setProgress(0);
    setGenerationData(data);
    setError(null);

    try {
      // Start progress simulation for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          // Cap at 90% until we get actual completion
          return prev < 90 ? prev + 5 : prev;
        });
      }, 1000);

      // ✅ Fix the prompt handling
      const response = await modelService.generate3DModel({
        prompt: data.prompt || '', // ✅ Ensure prompt is always a string
        image: data.image,
      });

      clearInterval(progressInterval);

      if (!response.success) {
        setStatus('failed');
        setError(response.error || 'Failed to generate model');
        setProgress(0);
        return;
      }

      // Extract model URL from the Edge Function response
      const modelUrl = response.data.modelUrl;
      
      if (!modelUrl) {
        setStatus('failed');
        setError('No model URL received from generation service');
        setProgress(0);
        return;
      }

      setGeneratedModel(modelUrl);
      setStatus('completed');
      setProgress(100);
      
      // ✅ Store ALL model details including file URLs
      setGenerationData({
        ...data,
        modelDetails: response.data,
        taskId: response.data.taskId,
        format: 'GLB',
        polygons: 'Unknown',
        fileSize: 'Unknown',
        // ✅ Store all file URLs for later use
        fileUrls: {
          glb: response.data.modelUrl,
          obj: response.data.objUrl,
          stl: response.data.stlUrl, // ✅ This is what we need!
        }
      });
    } catch (err) {
      console.error('Error during model generation:', err);
      setStatus('failed');
      setError('An unexpected error occurred');
      setProgress(0);
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!generationData?.taskId) return;
    setRefining(true);
    setRefineProgress(0);
    setRefineError(null);
    setStatus('generating');
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setRefineProgress((prev) => (prev < 90 ? prev + 5 : prev));
    }, 1000);
    try {
      const response = await modelService.refineModel({ preview_task_id: generationData.taskId });
      clearInterval(progressInterval);
      setRefineProgress(100);
      if (!response.success) {
        setRefining(false);
        setStatus('failed');
        setRefineError(response.error || 'Failed to refine model');
        return;
      }
      // Update preview and generationData with refined model
      setGeneratedModel(response.data.modelUrl);
      setGenerationData((prev: any) => ({
        ...prev,
        modelDetails: response.data,
        taskId: response.data.taskId,
        fileUrls: {
          glb: response.data.modelUrl,
          obj: response.data.objUrl,
          stl: response.data.stlUrl,
        },
        refined: true,
      }));
      setStatus('completed');
      setRefining(false);
    } catch (err) {
      clearInterval(progressInterval);
      setRefining(false);
      setStatus('failed');
      setRefineError('An unexpected error occurred during refinement');
    }
  };

  const handleBuyNow = () => {
    navigate('/order', { 
      state: { 
        modelData: generationData,
        modelUrl: generatedModel,
        // ✅ Pass the STL URL for the shipping form
        stlUrl: generationData?.fileUrls?.stl || generationData?.modelDetails?.stlUrl
      } 
    });
  };

  const handleDownload = () => {
    navigate('/download-checkout', {
      state: {
        modelData: generationData,
        modelUrl: generatedModel,
        price: 9.99,
        isGenerated: true
      }
    });
  };

  const handleUploadToMarketplace = () => {
    navigate('/marketplace-upload', {
      state: {
        modelData: generationData,
        modelUrl: generatedModel
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
            <GenerationForm onGenerate={handleGenerate} loading={generating} />
            
            {(generating || status === 'completed' || status === 'failed') && (
              <GenerationProgress
                progress={progress}
                status={status}
                estimatedTime={generating ? "45 seconds" : undefined}
              />
            )}

            {error && status === 'failed' && (
              <Card className="p-4 bg-red-50 border-red-200">
                <p className="text-red-600 text-sm">{error}</p>
                <Button 
                  onClick={() => setStatus('pending')} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  Try Again
                </Button>
              </Card>
            )}
          </div>

          {/* Preview/Results */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                3D Preview
              </h3>
              {/* Refine Button */}
              {status === 'completed' && generatedModel && (
                <div className="mb-4">
                  <Button
                    onClick={handleRefine}
                    loading={refining}
                    disabled={refining}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 mb-2"
                  >
                    {refining ? 'Refining...' : 'Refine Model'}
                  </Button>
                  {refining && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${refineProgress}%` }}
                      />
                    </div>
                  )}
                  {refineError && (
                    <div className="text-red-600 text-xs mt-2">{refineError}</div>
                  )}
                </div>
              )}
              
              {/* Debug buttons */}
              <div className="mb-4 space-x-2">
                <button 
                  onClick={() => setGeneratedModel('https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf')}
                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded"
                >
                  Test Model
                </button>
                <button 
                  onClick={() => setGeneratedModel('https://assets.meshy.ai/bafeb14a-10dd-4c49-ba2f-dd0d01238d2c/tasks/0197f1f6-1805-7cd7-9fd2-282c66e89b31/output/model.glb?Expires=4905705600&Signature=jc71~OhkOtnxmb4aubNuqUacbnF5TpEATgp~Llokuq~N3HG6JT1o0-mUxLwD0tKK0bG1Ry5tk7wTx47R-Uk~-oTNf~sdpYDOhSI2gqFGuSFDmAqAnRAJ9hN8Rl1fTKX8WxIRgPaEEaFiQEQr8273YSLgKcQ7DLS4k8aRGH~vSyouNIF8YLK5llXQ4C6MJspOewkb0ER3wXjbsBmWA2wj38pU4CMnGv-Q0YzFT5LLNLaMP-~qJT-11kFHU6D~qlexIBNFTik5IjmnIT0hKeoILxJ-G1h8EiHTb4SmBSS7hcmm5Ul-ZrwgN14yEWgL~UgiEELooCaIQI95ZZwefUJ7lw__&Key-Pair-Id=KL5I0C8H7HX83')}
                  className="px-3 py-1 bg-purple-500 text-white text-xs rounded"
                >
                  Test Meshy URL
                </button>
                <button 
                  onClick={() => setGeneratedModel(null)}
                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded"
                >
                  Clear
                </button>
                <button 
                  onClick={() => console.log('Current model data:', generationData)}
                  className="px-3 py-1 bg-green-500 text-white text-xs rounded"
                >
                  Log Data
                </button>
              </div>
              
              <ModelViewer 
                modelUrl={generatedModel || undefined}
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
                    <Button 
                      icon={Download} 
                      className="w-full"
                      onClick={handleDownload}
                    >
                      Download ($9.99)
                    </Button>
                    <Button variant="outline" icon={Share2} className="w-full">
                      Share
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      icon={Upload} 
                      className="w-full"
                      onClick={handleUploadToMarketplace}
                    >
                      Upload to Marketplace
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
                        <span className="ml-2 font-medium">
                          {generationData?.format || 'GLB, OBJ, STL'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Size:</span>
                        <span className="ml-2 font-medium">
                          {generationData?.size || 'Medium'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Polygons:</span>
                        <span className="ml-2 font-medium">
                          {generationData?.polygons || '12,480'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">File Size:</span>
                        <span className="ml-2 font-medium">
                          {generationData?.fileSize || '2.4 MB'}
                        </span>
                      </div>
                    </div>
                    
                    {/* ✅ Debug info to verify URLs */}
                    {generationData?.fileUrls && (
                      <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                        <p><strong>STL URL:</strong> {generationData.fileUrls.stl || 'Not available'}</p>
                      </div>
                    )}
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