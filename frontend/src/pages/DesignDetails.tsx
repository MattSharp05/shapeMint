import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, ShoppingCart, Heart, Share2, Printer, Eye, Calendar, User } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { ModelViewer } from '../components/3D/ModelViewer';
import { useAuth } from '../hooks/useAuth';
import { modelService } from '../services/modelService';
import { supabase } from '../supabaseClient';

// Utility function to validate URLs
const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url || url.trim() === '') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Utility function to get the best available model URL
const getBestModelUrl = (model: ModelDetails): string | undefined => {
  // Priority: GLB > OBJ > STL
  if (model.glb_url && isValidUrl(model.glb_url)) {
    console.log('✅ Using GLB URL:', model.glb_url);
    return model.glb_url;
  }
  // if (model.obj_url && isValidUrl(model.obj_url)) {
  //   console.log('✅ Using OBJ URL:', model.obj_url);
  //   return model.obj_url;
  // }
  // if (model.stl_url && isValidUrl(model.stl_url)) {
  //   console.log('✅ Using STL URL:', model.stl_url);
  //   return model.stl_url;
  // }
  
  console.log('❌ No valid URLs found:', {
    glb_url: model.glb_url,
    obj_url: model.obj_url,
    stl_url: model.stl_url
  });
  return undefined;
};

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
  // Additional fields for enhanced display
  downloads?: number;
  likes?: number;
  views?: number;
  description?: string;
  tags?: string[];
  category?: string;
  price?: number;
  creator_name?: string;
}

export function DesignDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [model, setModel] = useState<ModelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  // Memoize the best model URL to prevent infinite re-renders
  const bestModelUrl = useMemo(() => {
    return model ? getBestModelUrl(model) : undefined;
  }, [model]);

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
      
      console.log('🔍 Loading model details for ID:', modelId);

      // Fetch model from database
      const { data: modelData, error: modelError } = await supabase
        .from('generated_models')
        .select('*')
        .eq('id', modelId)
        .single();

      if (modelError) {
        console.error('❌ Error fetching model:', modelError);
        setError('Model not found');
        setLoading(false);
        return;
      }

      if (!modelData) {
        console.error('❌ No model data returned');
        setError('Model not found');
        setLoading(false);
        return;
      }
      
      console.log('📦 Model data loaded:', {
        id: modelData.id,
        name: modelData.name,
        status: modelData.status,
        glb_url: modelData.glb_url ? modelData.glb_url.substring(0, 50) + '...' : null,
        obj_url: modelData.obj_url ? modelData.obj_url.substring(0, 50) + '...' : null,
        stl_url: modelData.stl_url ? modelData.stl_url.substring(0, 50) + '...' : null,
      });

      // Get creator information - simplified to avoid RLS issues
      let creatorName = 'Unknown Creator';
      if (modelData.user_id) {
        // Use a simple fallback instead of querying users table to avoid RLS issues
        creatorName = `Creator-${modelData.user_id.slice(-4)}`;
      }

      // Enhance model data with additional information
      const enhancedModel: ModelDetails = {
        ...modelData,
        creator_name: creatorName,
        downloads: Math.floor(Math.random() * 100) + 10, // Mock data for now
        likes: Math.floor(Math.random() * 50) + 5, // Mock data for now
        views: Math.floor(Math.random() * 200) + 20, // Mock data for now
        description: modelData.prompt || 'AI-generated 3D model',
        tags: modelData.style ? [modelData.style] : ['3D Model'],
        category: modelData.style || 'Other',
        price: 9.99 // Default price
      };

      setModel(enhancedModel);
      setViewCount(enhancedModel.views || 0);

      // Increment view count
      incrementViewCount(modelId);

    } catch (error) {
      console.error('💥 Error loading model details:', error);
      setError('Failed to load model details');
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async (modelId: string) => {
    try {
      // In a real implementation, you would update the view count in the database
      // For now, we'll just increment the local state
      setViewCount(prev => prev + 1);
    } catch (error) {
      console.warn('Failed to increment view count:', error);
    }
  };

  const handleDownload = () => {
    if (!model) return;

    navigate('/download-checkout', {
      state: {
        modelData: {
          designId: model.id,
          designTitle: model.name,
          designDescription: model.description,
          creator: model.creator_name,
          isMarketplaceItem: true,
          objUrl: model.obj_url,
          glbUrl: model.glb_url
        },
        modelUrl: model.glb_url || model.obj_url,
        stlUrl: model.stl_url,
        price: model.price,
        isGenerated: false
      }
    });
  };

  const handleBuyNow = () => {
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
          creator: model.creator_name
        },
        modelUrl: model.glb_url || model.obj_url,
        stlUrl: model.stl_url
      }
    });
  };

  const handleLike = async () => {
    if (!model || !user) return;

    try {
      // In a real implementation, you would toggle like in the database
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
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
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
              {bestModelUrl ? (
                <ModelViewer 
                  modelUrl={bestModelUrl}
                  className="h-96 w-full"
                  debug={false} // Disable debug mode for production
                />
              ) : (
                <div className="h-96 w-full bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <span className="text-gray-500 text-2xl">📦</span>
                    </div>
                    <p className="text-gray-500">3D model not available</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {model.status === 'completed' 
                        ? 'No valid model files found. Please check the model URLs.'
                        : 'This model may still be processing or generation failed.'
                      }
                    </p>
                    {model.status !== 'completed' && (
                      <p className="text-xs text-gray-400 mt-2">
                        Current status: {model.status}
                      </p>
                    )}
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
              
              {/* Stats */}
              <div className="flex items-center space-x-6 text-sm text-gray-500 mb-6">
                    <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{viewCount} views</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Download className="h-4 w-4" />
                  <span>{model.downloads} downloads</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className="h-4 w-4" />
                  <span>{model.likes} likes</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(model.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Creator Info */}
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                    </div>
                <div>
                  <p className="text-sm text-gray-500">Created by</p>
                  <p className="font-medium text-gray-900">{model.creator_name}</p>
                </div>
              </div>
            </Card>

            {/* Tags */}
            {model.tags && model.tags.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {model.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
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
                onClick={handleBuyNow}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                size="lg"
                icon={Printer}
              >
                Get it Printed
                <span className="ml-auto text-sm opacity-90">Starting $20</span>
              </Button>
              
              <Button 
                onClick={handleDownload}
                variant="outline" 
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                icon={Download}
              >
                Download Files Only
                <span className="ml-auto text-sm text-gray-500">${model.price}</span>
              </Button>
            </div>

            {/* Social Actions */}
            <div className="flex space-x-3">
              <Button 
                onClick={handleLike}
                variant="outline" 
                className={`flex-1 ${isLiked ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                icon={Heart}
              >
                {isLiked ? 'Liked' : 'Like'}
              </Button>
              
              <Button 
                onClick={handleShare}
                variant="outline" 
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
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