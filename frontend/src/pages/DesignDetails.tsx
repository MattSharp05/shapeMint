import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Printer, Calendar } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { ModelViewer } from '../components/3D/ModelViewer';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import { ensureStableModelUrl } from '../services/modelUrlService';

interface ModelDetails {
  id: string;
  name: string;
  prompt: string;
  style: string;
  obj_url: string | null;
  stl_url: string | null;
  glb_url: string | null;
  thumbnail_url: string | null;
  user_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  description?: string;
  tags?: string[];
  category?: string;
}

export function DesignDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [model, setModel] = useState<ModelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stableGlbUrl, setStableGlbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No model ID provided');
      setLoading(false);
      return;
    }

    loadModelDetails(id);
  }, [id]);

  const loadModelDetails = async (modelId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: modelData, error: modelError } = await supabase
        .from('generated_models')
        .select('*')
        .eq('id', modelId)
        .single();

      if (modelError) {
        setError('Model not found');
        setLoading(false);
        return;
      }

      if (!modelData) {
        setError('Model not found');
        setLoading(false);
        return;
      }

      const enhancedModel: ModelDetails = {
        ...modelData,
        description: modelData.prompt || 'AI-generated 3D model',
        tags: modelData.style ? [modelData.style] : ['3D Model'],
        category: modelData.style || 'Other',
      };

      setModel(enhancedModel);

      // Ensure the GLB URL is a stable Supabase URL (migrates old Meshy CDN URLs)
      const glbUrl = modelData.glb_url || modelData.obj_url;
      if (glbUrl) {
        ensureStableModelUrl(modelId, glbUrl, modelData.type || 'text-to-3d')
          .then((url) => {
            if (url) {
              setStableGlbUrl(url);
              // Update the model state too so navigation to Order uses the stable URL
              setModel(prev => prev ? { ...prev, glb_url: url } : prev);
            }
          });
      }
    } catch (error) {
      console.error('Error loading model details:', error);
      setError('Failed to load model details');
    } finally {
      setLoading(false);
    }
  };

  const handleGetPrinted = () => {
    if (!model) return;

    navigate('/order', {
      state: {
        modelData: {
          prompt: model.name,
          settings: {
            style: model.style || 'realistic',
            quality: 'high',
            size: 'medium'
          },
          isMarketplaceItem: true,
          designId: model.id,
          designTitle: model.name,
          designDescription: model.description,
        },
        modelUrl: model.glb_url || model.obj_url,
        stlUrl: model.stl_url
      }
    });
  };

  const handleShare = () => {
    if (!model) return;

    const shareUrl = `${window.location.origin}/design/${model.id}`;
    const shareText = `Check out this amazing 3D model: ${model.name}`;

    if (navigator.share) {
      navigator.share({
        title: model.name,
        text: shareText,
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading model details...</p>
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Model Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested model could not be found.'}</p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/marketplace')} className="w-full">
              Browse Marketplace
            </Button>
            <Button variant="outline" onClick={() => navigate('/generate')} className="w-full">
              Generate Your Own
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Marketplace</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Model Viewer */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">3D Preview</h3>
              {stableGlbUrl ? (
                <ModelViewer
                  modelUrl={stableGlbUrl}
                  className="h-96 w-full"
                  debug={false}
                />
              ) : (
                <div className="h-96 w-full bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <span className="text-gray-500 text-2xl">3D</span>
                    </div>
                    <p className="text-gray-500">3D model not available</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {model.status === 'completed'
                        ? 'No valid model files found.'
                        : 'This model may still be processing.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Thumbnail */}
            {model.thumbnail_url && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thumbnail</h3>
                <img
                  src={model.thumbnail_url}
                  alt={model.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </Card>
            )}
          </div>

          {/* Model Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{model.name}</h1>
              <p className="text-lg text-gray-600 mb-4">{model.description}</p>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(model.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {model.tags && model.tags.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {model.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-brand-light text-brand-primary rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Model Information */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Model Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Style:</span>
                  <span className="font-medium">{model.style || 'Realistic'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category:</span>
                  <span className="font-medium">{model.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${
                    model.status === 'completed' ? 'text-green-600' :
                    model.status === 'processing' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="font-medium">{formatDate(model.created_at)}</span>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleGetPrinted}
                className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                size="lg"
                icon={Printer}
              >
                Get it Printed
              </Button>
            </div>

            {/* Share */}
            <div>
              <Button
                onClick={handleShare}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                icon={Share2}
              >
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
