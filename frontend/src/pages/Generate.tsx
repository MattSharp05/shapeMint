import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useThumbnailGenerator } from '../hooks/useThumbnailGenerator';
import { GenerationForm } from '../components/Generation/GenerationForm';
import { GenerationProgress } from '../components/Generation/GenerationProgress';
import { ModelViewer } from '../components/3D/ModelViewer';
import { ThumbnailSelector } from '../components/UI/ThumbnailSelector';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Share2, ShoppingCart, Camera, Store, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { modelService } from '../services/modelService';

export function Generate() {
  const [status, setStatus] = useState<'pending' | 'generating' | 'completed' | 'failed'>('pending');
  const [generatedModel, setGeneratedModel] = useState<any>(null);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);
  const [thumbnailData, setThumbnailData] = useState<{
    angles: { [angle: string]: string };
    selectedAngle: string;
    isCustom: boolean;
  } | null>(null);

  
  // Generation form state
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [prefilledData, setPrefilledData] = useState<{
    prefilledPrompt?: string;
    socialTag?: string;
    mode?: 'text' | 'image';
    image?: File;
  } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Extract prefilled data from navigation state
  useEffect(() => {
    if (location.state) {
      setPrefilledData(location.state);
    }
  }, [location.state]);

  // Client-side thumbnail generation (like working branch)
  const { isGenerating: isGeneratingThumbnails } = useThumbnailGenerator({ 
    uploadToStorage: false // Use data URLs for MVP speed
  });

  const convertToSTL = async (glbUrl: string, modelId: string) => {
    try {
      console.log('🔧 Starting background GLB to STL conversion...');
      
      const { data, error } = await supabase.functions.invoke('save-stl-to-bucket', {
        body: { 
          glbUrl,
          modelId,
          targetSize: 50 // 50mm max dimension
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
    console.log('🎯 Model generation response:', modelData);
    
    // Check if this is a processing response (new immediate-return approach)
    if (modelData.data?.status === 'processing' && modelData.data?.taskId) {
      console.log('🔄 Model generation started, beginning polling for completion...');
      const taskId = modelData.data.taskId;
      const type = modelData.data.type;
      
      setStatus('generating');
      
      // Start polling for completion using check-model-status edge function
      const pollForCompletion = async (taskId: string, type: 'text-to-3d' | 'image-to-3d') => {
        const maxAttempts = 60; // 10 minutes max (10s interval)
        let attempts = 0;

        const checkStatus = async (): Promise<boolean> => {
          if (attempts >= maxAttempts) {
            console.error('⏰ Polling timeout');
            setStatus('failed');
            return true; // Stop polling
          }

          try {
            console.log(`🔍 Polling attempt ${attempts + 1}/${maxAttempts} for task ${taskId}`);
            const statusResponse = await modelService.checkModelStatus(taskId, type);
            console.log('📊 Status data:', statusResponse);

            if (statusResponse?.status === 'completed') {
              console.log('✅ Model generation complete!');
              // Create a model object that matches the expected structure
              const finalModelData = {
                ...statusResponse,
                id: taskId,
                urls: { glb: statusResponse.model_url },
                modelUrl: statusResponse.model_url
              };
              setGeneratedModel(finalModelData);
              setStatus('completed');
              return true; // Stop polling
            } else if (statusResponse?.status === 'failed') {
              console.error('❌ Model generation failed:', statusResponse.error);
              setStatus('failed');
              return true; // Stop polling
            } else if (statusResponse?.status === 'processing') {
              if (typeof statusResponse.progress === 'number') {
                console.log(`⏳ Model generation is ${statusResponse.progress}% complete.`);
              } else {
                console.log('⏳ Model is still processing...');
              }
            }
          } catch (error) {
            console.error('Polling error:', error);
          }

          attempts++;
          return false; // Continue polling
        };

        // Perform the first check immediately
        const shouldStop = await checkStatus();

        // If the first check didn't resolve it, start the interval
        if (!shouldStop) {
          const intervalId = setInterval(async () => {
            const stop = await checkStatus();
            if (stop) {
              clearInterval(intervalId);
            }
          }, 10000);
        }
      };

      // Start polling in background
      pollForCompletion(taskId, type);
      return;
    }
    
    // Handle legacy completed model response (if any)
    const mappedModelData = {
      ...modelData.data,
      id: modelData.data?.taskId,
      taskId: modelData.data?.taskId,
      urls: {
        glb: modelData.data?.modelUrl,
        stl: modelData.data?.stlUrl,
        obj: modelData.data?.objUrl,
        download: modelData.data?.downloadUrl
      },
      modelUrl: modelData.data?.modelUrl,
      downloadUrl: modelData.data?.downloadUrl,
      stlUrl: modelData.data?.stlUrl,
      objUrl: modelData.data?.objUrl
    };
    
    console.log('🔄 Mapped model data:', mappedModelData);
    
    setStatus('completed');
    setGeneratedModel(mappedModelData);
    
    // Start background STL conversion if GLB URL is available
    if (mappedModelData.urls?.glb) {
      console.log('🔧 Starting background STL conversion from GLB...');
      convertToSTL(mappedModelData.urls.glb, mappedModelData.id);
      // Note: We don't await this - it runs in background
    }
    
    // Start server-side thumbnail generation via Edge function
    if (mappedModelData.urls?.glb) {
      console.log('🎨 Starting server-side thumbnail generation via Edge function...');
      // setIsGeneratingThumbnails(true); // This line is removed
      
      try {
        // Use client-side thumbnail generation for real 3D model screenshots
        const { ThumbnailGenerator, DEFAULT_CAMERA_ANGLES } = await import('../services/thumbnailGenerator');
        
        const generator = new ThumbnailGenerator({
          width: 400,
          height: 300,
          backgroundColor: '#f8fafc'
        });
        
        console.log('🎬 Generating real 3D thumbnails from GLB model...');
        
        // Generate thumbnails for multiple angles using original Meshy URL
        console.log('🎨 Loading model for thumbnails from:', mappedModelData.urls.glb);
        const thumbnails = await generator.generateAllThumbnails(mappedModelData.urls.glb, DEFAULT_CAMERA_ANGLES);
        
        // Clean up Three.js resources
        generator.dispose();
        
        if (thumbnails && Object.keys(thumbnails).length > 0) {
          setThumbnailData({
            angles: thumbnails,
            selectedAngle: Object.keys(thumbnails)[0] || 'front',
            isCustom: false
          });
          setShowThumbnailSelector(true);
          console.log('✅ Client-side 3D thumbnails generated successfully:', Object.keys(thumbnails));
        } else {
          console.log('⚠️ No thumbnails generated');
        }
      } catch (error) {
        console.error('Failed to generate client-side thumbnails:', error);
        // Continue without thumbnails - not a blocking error
      } finally {
        // setIsGeneratingThumbnails(false); // This line is removed
      }
    }
  };

  const handleBuyNow = () => {
    navigate('/download-checkout', {
      state: {
        modelData: {
          ...generatedModel,
          prompt: generatedModel?.prompt || 'Generated Model',
          settings: {
            style: 'realistic',
            quality: 'high',
            size: 'medium'
          }
        },
        modelUrl: generatedModel?.urls?.glb,
        stlUrl: generatedModel?.urls?.stl,
        price: 0, // Free for generated models
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
            <GenerationForm 
              onSuccess={handleGenerationSuccess} 
              prefilledData={prefilledData}
              mode={mode}
              setMode={setMode}
              prompt={prompt}
              setPrompt={setPrompt}
              imageFile={imageFile}
              setImageFile={setImageFile}
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              isGenerating={status === 'generating'}
            />
            
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
                modelUrl={generatedModel}
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