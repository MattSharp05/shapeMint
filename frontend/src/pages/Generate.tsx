import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { GenerationForm } from '../components/Generation/GenerationForm';
import { GenerationProgress } from '../components/Generation/GenerationProgress';
import { ModelViewer } from '../components/3D/ModelViewer';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Download, Share2, ShoppingCart } from 'lucide-react';
import { modelService } from '../services/modelService';
import { useGLTF } from '@react-three/drei';

export function Generate() {
  // New status state
  const [status, setStatus] = useState<'pending' | 'generating' | 'completed' | 'failed'>('pending');
  // Old states you want to keep
  const [generatedModel, setGeneratedModel] = useState<string | null>(null);
  const [generationData, setGenerationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [refineProgress, setRefineProgress] = useState(0);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // Refine handler
  const handleRefine = async () => {
    if (!generationData?.taskId) return;
    // Clear cache for the current model URL before refining
    if (generatedModel) {
      console.log('🧹 Clearing cache for current model before refining:', generatedModel);
      useGLTF.clear(generatedModel);
    }
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
      setGeneratedModel(response.data.originalUrls?.glb || response.data.modelUrl);
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

      const response = await modelService.generate3DModel({
        prompt: data.prompt || '',
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
      
      // Store ALL model details including file URLs
      setGenerationData({
        ...data,
        modelDetails: response.data,
        taskId: response.data.taskId,
        format: 'GLB',
        polygons: 'Unknown',
        fileSize: 'Unknown',
        // Store all file URLs for later use
        fileUrls: {
          glb: response.data.modelUrl,
          obj: response.data.objUrl,
          stl: response.data.stlUrl,
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

  const handleEdit = () => {
    setIsEditing(true);
    setStatus('pending');
    setGeneratedModel(null);
  };

  const handleRegenerate = () => {
    setIsEditing(false);
    setStatus('pending');
    setGeneratedModel(null);
    setGenerationData(null);
    setHasGenerated(false);
    setFormKey(prev => prev + 1); // Force form to re-render completely
  };

  const handleBuyNow = () => {
    navigate('/order', { state: { modelData: generationData, modelUrl: generatedModel } });
  };

    const handleDownload = () => {
    // Navigate to download checkout page
    navigate('/download-checkout', {
      state: {
        modelData: generationData,
        modelUrl: generatedModel,
        price: 9.99, // Base price for generated models
        isGenerated: true
      }
    });
  };

  const handleUploadToMarketplace = () => {
    // Navigate to marketplace upload page
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
            <GenerationForm 
              key={formKey}
              onGenerate={handleGenerate} 
              loading={generating}
              initialData={isEditing ? generationData : null}
              isEditing={isEditing}
            />
            
            {/* Edit/Regenerate Buttons */}
            {hasGenerated && status === 'completed' && !isEditing && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Want to make changes?
                </h3>ß
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    icon={Edit} 
                    className="w-full"
                    onClick={handleEdit}
                  >
                    Edit Prompt
                  </Button>
                  <Button 
                    variant="outline" 
                    icon={RotateCcw}
                    className="w-full"
                    onClick={handleRegenerate}
                  >
                    Regenerate
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-3 text-center">
                  Edit to modify your current prompt, or regenerate with a fresh start
                </p>
              </Card>
            )}
            
            {(generating || status === 'completed') && (
              <GenerationProgress
                progress={progress}
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
                      Download
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