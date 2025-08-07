import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, DollarSign, FileText, Eye, Sparkles, Camera, Heart, Download, Printer } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { ModelViewer } from '../components/3D/ModelViewer';
import { useThumbnailGenerator } from '../hooks/useThumbnailGenerator';
import { marketplaceService } from '../services/marketplaceService';
import { storageService } from '../services/storage';
import { MARKETPLACE_CATEGORIES, type MarketplaceCategory, type MarketplaceListing } from '../types/marketplace';

export function MarketplaceUpload() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modelData, modelUrl } = location.state || {};
  
  const [listingData, setListingData] = useState({
    title: modelData?.prompt || '',
    description: '',
    price: '',
    category: 'Home & Garden' as MarketplaceCategory,
    tags: '',
    notes: ''
  });
  
  const [uploading, setUploading] = useState(false);
  const [existingListing, setExistingListing] = useState<MarketplaceListing | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [thumbnailAngles, setThumbnailAngles] = useState<{ [angle: string]: string }>({});
  const [selectedThumbnailAngle, setSelectedThumbnailAngle] = useState<string>('front');
  const [isCustomThumbnail, setIsCustomThumbnail] = useState(false);
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);

  // Thumbnail generation
  const {
    isGenerating: isGeneratingThumbnails,
    generateThumbnails
  } = useThumbnailGenerator({ 
    uploadToStorage: true // Upload to storage for marketplace persistence
  });

  // Generate thumbnails when component mounts (if model has GLB URL)
  useEffect(() => {
    if (modelData?.urls?.glb && Object.keys(thumbnailAngles).length === 0) {
      generateThumbnails(modelData.urls.glb, modelData.id)
        .then((angles) => {
          setThumbnailAngles(angles);
          // Set first available angle as default
          const firstAngle = Object.keys(angles)[0] || 'front';
          setSelectedThumbnailAngle(firstAngle);
        })
        .catch((error) => {
          console.error('Failed to generate thumbnails:', error);
        });
    }
  }, [modelData?.id, modelData?.urls?.glb]); // Only depend on modelData.id and glb URL

  // Check if model already has a marketplace listing
  useEffect(() => {
    const checkExistingListing = async () => {
      if (!modelData?.id) return;

      try {
        const response = await marketplaceService.getListingByModelId(modelData.id);
        
        if (response.success && response.data) {
          setExistingListing(response.data);
          setIsEditMode(true);
          
          // Load existing listing data into form
          setListingData({
            title: response.data.title,
            description: response.data.description || '',
            price: response.data.price.toString(),
            category: response.data.category as MarketplaceCategory,
            tags: response.data.tags.join(', '),
            notes: response.data.notes || ''
          });
          
          // Load existing thumbnail selection
          if (response.data.selected_thumbnail_url) {
            setSelectedThumbnailAngle(response.data.selected_thumbnail_angle || 'front');
            setIsCustomThumbnail(response.data.is_custom_thumbnail);
          }
        }
      } catch (error) {
        console.error('❌ Exception during listing check:', error);
      }
    };

    // Only run once when component mounts
    checkExistingListing();
  }, []); // ← Empty dependency array = run only once

  if (!modelData || !modelUrl) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Model to Upload</h2>
          <p className="text-gray-600 mb-6">Please generate a model first before uploading to marketplace.</p>
          <Button onClick={() => navigate('/generate')}>
            Go to Generate
          </Button>
        </Card>
      </div>
    );
  }

  const handleUpload = async () => {
    if (!modelData?.id) {
      console.error('❌ No model data available for marketplace upload');
      return;
    }

    // Validate required fields
    if (!listingData.title.trim()) {
      alert('Please enter a title for your listing');
      return;
    }
    
    if (!listingData.price || parseFloat(listingData.price) <= 0) {
      alert('Please enter a valid price');
      return;
    }

    setUploading(true);
    
    try {
      let listingId: string;
      
      if (isEditMode && existingListing) {
        // Update existing listing
        
        // Handle thumbnail upload for updates
        let finalThumbnailUrl: string | undefined = existingListing.selected_thumbnail_url || undefined;
        
        if (isCustomThumbnail && customThumbnailFile) {
          try {
            console.log('📤 Uploading new custom thumbnail...');
            finalThumbnailUrl = await storageService.uploadCustomThumbnail(existingListing.id, customThumbnailFile);
            console.log('✅ Custom thumbnail uploaded:', finalThumbnailUrl);
          } catch (uploadError) {
            console.warn('⚠️ Failed to upload custom thumbnail, using existing:', uploadError);
          }
        } else if (!isCustomThumbnail) {
          // Use generated thumbnail
          finalThumbnailUrl = thumbnailAngles[selectedThumbnailAngle];
        }
        
        const updateResult = await marketplaceService.updateListing({
          listingId: existingListing.id,
          updates: {
            title: listingData.title.trim(),
            description: listingData.description.trim() || undefined,
            price: parseFloat(listingData.price),
            category: listingData.category,
            tags: listingData.tags ? listingData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
            notes: listingData.notes.trim() || undefined,
            selectedThumbnailUrl: finalThumbnailUrl,
            selectedThumbnailAngle: isCustomThumbnail ? 'custom' : selectedThumbnailAngle,
            isCustomThumbnail
          }
        });
        
        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to update listing');
        }
        
        listingId = existingListing.id;
        console.log('✅ Marketplace listing updated');
        
      } else {
        // Create new listing
        const result = await marketplaceService.createListing({
          modelId: modelData.id,
          title: listingData.title.trim(),
          description: listingData.description.trim() || undefined,
          price: parseFloat(listingData.price),
          category: listingData.category,
          tags: listingData.tags ? listingData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
          notes: listingData.notes.trim() || undefined,
          selectedThumbnailUrl: undefined, // Will be updated after custom upload
          selectedThumbnailAngle: isCustomThumbnail ? 'custom' : selectedThumbnailAngle,
          isCustomThumbnail,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to create listing');
        }

        listingId = result.data.id;
        console.log('✅ Marketplace listing created');

        // Handle thumbnail upload for new listings
        let finalThumbnailUrl: string | undefined;
        
        if (isCustomThumbnail && customThumbnailFile) {
          try {
            console.log('📤 Uploading custom thumbnail...');
            finalThumbnailUrl = await storageService.uploadCustomThumbnail(listingId, customThumbnailFile);
            console.log('✅ Custom thumbnail uploaded:', finalThumbnailUrl);
          } catch (uploadError) {
            console.warn('⚠️ Failed to upload custom thumbnail to storage, falling back to blob URL:', uploadError);
            finalThumbnailUrl = URL.createObjectURL(customThumbnailFile);
          }
        } else {
          // Use generated thumbnail
          finalThumbnailUrl = thumbnailAngles[selectedThumbnailAngle];
        }

        // Update listing with final thumbnail URL
        if (finalThumbnailUrl) {
          const updateResult = await marketplaceService.updateListing({
            listingId,
            updates: {
              selectedThumbnailUrl: finalThumbnailUrl
            }
          });
          
          if (!updateResult.success) {
            console.warn('Failed to update thumbnail URL, but continuing with publish...');
          }
        }
      }

      // Publish the listing (both new and updated)
      const publishResult = await marketplaceService.publishListing(listingId);
      
      if (publishResult.success) {
        console.log('✅ Marketplace listing published');
        
        // Show success message
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 animate-fade-in';
        successDiv.innerHTML = `
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>${isEditMode ? 'Successfully updated' : 'Successfully published to'} marketplace!</span>
        `;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
          successDiv.remove();
          navigate('/marketplace');
        }, 2000);
      } else {
        throw new Error(publishResult.error || 'Failed to publish listing');
      }
    } catch (error) {
      console.error('❌ Marketplace upload error:', error);
      alert(`Failed to ${isEditMode ? 'update' : 'publish to'} marketplace. Please try again.`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enhanced Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate('/generate')}
            className="group flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-all duration-200 mb-6 transform hover:translate-x-1"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Back to Generate</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-4">
              {isEditMode ? 'Edit Marketplace Listing' : 'Publish to Marketplace'}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {isEditMode 
                ? 'Update your listing details and republish to the marketplace' 
                : 'Share your creation with the world and start earning from your 3D designs'
              }
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enhanced Upload Form */}
          <div className="space-y-6">
            <Card className="p-8 backdrop-blur-sm bg-white/90 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Sparkles className="h-6 w-6 mr-3 text-purple-600" />
                  Listing Details
                </h3>
                {isEditMode && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full border border-amber-200">
                    Editing Existing
                  </span>
                )}
              </div>
              
              <div className="space-y-6">
                <div className="group">
                  <Input
                    label="Title"
                    placeholder="Give your design a catchy title"
                    value={listingData.title}
                    onChange={(e) => setListingData({...listingData, title: e.target.value})}
                    className="transition-all duration-200 focus:ring-4 focus:ring-purple-100"
                    required
                  />
                </div>
                
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your design, its features, and potential uses..."
                    value={listingData.description}
                    onChange={(e) => setListingData({...listingData, description: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 resize-none transition-all duration-200 bg-gray-50 focus:bg-white"
                    rows={4}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <Input
                      label="Price ($)"
                      type="number"
                      step="0.01"
                      min="0.99"
                      placeholder="9.99"
                      value={listingData.price}
                      onChange={(e) => setListingData({...listingData, price: e.target.value})}
                      className="transition-all duration-200 focus:ring-4 focus:ring-purple-100"
                      required
                    />
                  </div>
                  
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Category
                    </label>
                    <select
                      value={listingData.category}
                      onChange={(e) => setListingData({...listingData, category: e.target.value as MarketplaceCategory})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                    >
                      {MARKETPLACE_CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="group">
                  <Input
                    label="Tags (comma separated)"
                    placeholder="modern, minimalist, functional, decorative"
                    value={listingData.tags}
                    onChange={(e) => setListingData({...listingData, tags: e.target.value})}
                    className="transition-all duration-200 focus:ring-4 focus:ring-purple-100"
                    helperText="Add relevant tags to help buyers find your design"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-8 backdrop-blur-sm bg-white/90 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <FileText className="h-5 w-5 mr-3 text-gray-600" />
                Additional Notes
              </h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Creator Notes (Optional)
                </label>
                <textarea
                  placeholder="Any special printing instructions, recommended materials, or other notes for buyers..."
                  value={listingData.notes}
                  onChange={(e) => setListingData({...listingData, notes: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 resize-none transition-all duration-200 bg-gray-50 focus:bg-white"
                  rows={3}
                />
              </div>
            </Card>

            <Button 
              onClick={handleUpload}
              loading={uploading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              size="lg"
              icon={Upload}
            >
              {uploading 
                ? (isEditMode ? 'Updating Listing...' : 'Publishing to Marketplace...') 
                : (isEditMode ? 'Update Listing' : 'Publish to Marketplace')
              }
            </Button>
          </div>

          {/* Enhanced Preview */}
          <div className="space-y-6">
            <Card className="p-8 backdrop-blur-sm bg-white/90 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Eye className="h-5 w-5 mr-3 text-blue-600" />
                3D Model Preview
              </h3>
              <div className="relative group">
                <ModelViewer 
                  modelUrl={modelUrl}
                  className="h-80 w-full rounded-xl overflow-hidden shadow-lg"
                />
                <div className="absolute inset-0 rounded-xl ring-2 ring-purple-200 group-hover:ring-purple-400 transition-all duration-300"></div>
              </div>
              <div className="mt-6 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
                <p><strong>Generated from:</strong> {modelData.prompt || 'Image upload'}</p>
                <p><strong>Style:</strong> {modelData.settings?.style || 'Realistic'}</p>
                <p><strong>Quality:</strong> {modelData.settings?.quality || 'Standard'}</p>
              </div>
            </Card>

            {/* Thumbnail Selection Section */}
            <Card className="p-8 backdrop-blur-sm bg-white/90 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Camera className="h-5 w-5 mr-3 text-purple-600" />
                Choose Thumbnail
              </h3>
              
              {isGeneratingThumbnails ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating thumbnails...</p>
                </div>
              ) : Object.keys(thumbnailAngles).length > 0 ? (
                <div className="space-y-6">
                  {/* Angle Selection Grid */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Generated Views</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.entries(thumbnailAngles).map(([angle, url]) => (
                        <div
                          key={angle}
                          onClick={() => {
                            setSelectedThumbnailAngle(angle);
                            setIsCustomThumbnail(false);
                          }}
                          className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            selectedThumbnailAngle === angle && !isCustomThumbnail
                              ? 'border-purple-500 ring-2 ring-purple-200 transform scale-105' 
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`${angle} view`}
                            className="w-full h-20 object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                            <p className="text-white text-xs font-medium capitalize text-center">
                              {angle}
                            </p>
                          </div>
                          {selectedThumbnailAngle === angle && !isCustomThumbnail && (
                            <div className="absolute top-1 right-1 bg-purple-500 text-white rounded-full p-1">
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Upload Option */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Or Upload Custom</h4>
                    <div className="flex items-center space-x-4">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCustomThumbnailFile(file);
                              setIsCustomThumbnail(true);
                            }
                          }}
                          className="hidden"
                        />
                        <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
                          isCustomThumbnail ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-400'
                        }`}>
                          <Upload className="h-6 w-6 mx-auto mb-2 text-gray-500" />
                          <p className="text-sm text-gray-600">Click to upload custom thumbnail</p>
                        </div>
                      </label>
                      
                      {isCustomThumbnail && customThumbnailFile && (
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(customThumbnailFile)}
                            alt="Custom thumbnail"
                            className="w-20 h-20 object-cover rounded-lg border-2 border-purple-500"
                          />
                          <div className="absolute top-1 right-1 bg-purple-500 text-white rounded-full p-1">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No thumbnails available. Please try generating your model again.</p>
                </div>
              )}
            </Card>

            <Card className="p-8 backdrop-blur-sm bg-white/90 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Eye className="h-5 w-5 mr-3 text-green-600" />
                Marketplace Preview
              </h3>
              
              {/* Marketplace Card Preview */}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200">
                <div className="relative">
                  {/* Thumbnail Image */}
                  {isCustomThumbnail && customThumbnailFile ? (
                    <img
                      src={URL.createObjectURL(customThumbnailFile)}
                      alt="Preview thumbnail"
                      className="w-full h-48 object-cover"
                    />
                  ) : thumbnailAngles[selectedThumbnailAngle] ? (
                    <img
                      src={thumbnailAngles[selectedThumbnailAngle]}
                      alt={`Preview ${selectedThumbnailAngle} view`}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <Camera className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Heart button (non-functional preview) */}
                  <button className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                    <Heart className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer">
                      {listingData.title || 'Your Design Title'}
                    </h4>
                    <span className="text-2xl font-bold text-purple-600">
                      ${listingData.price || '0.00'}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">
                    {listingData.description || 'Your design description will appear here...'}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {listingData.category}
                    </span>
                    <span className="text-xs text-gray-500 hover:text-purple-600 transition-colors">
                      by You
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Download className="h-3 w-3" />
                        <span>0</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3" />
                        <span>0</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons - Marketplace Style */}
                  <div className="space-y-2">
                    <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-md shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-sm flex items-center justify-center">
                      <Printer className="h-4 w-4 mr-2" />
                      Get it Printed
                      <span className="ml-auto text-xs opacity-90">Starting $20</span>
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-md text-sm flex items-center justify-center transition-colors">
                      <Download className="h-3 w-3 mr-1" />
                      Download Files Only
                      <span className="ml-auto text-xs text-gray-500">${listingData.price || '0.00'}</span>
                    </button>
                  </div>
                  
                  {/* Tags Preview */}
                  {listingData.tags && listingData.tags.trim() && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        {listingData.tags.split(',').slice(0, 4).map((tag, index) => (
                          <span key={index} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                            {tag.trim()}
                          </span>
                        ))}
                        {listingData.tags.split(',').length > 4 && (
                          <span className="text-xs text-gray-500">+{listingData.tags.split(',').length - 4} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 text-xs text-gray-500 text-center">
                ✨ This is exactly how your listing will appear on the marketplace
              </div>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <DollarSign className="h-6 w-6 mr-3 text-green-600" />
                Earnings Calculator
              </h3>
              <div className="space-y-4 text-gray-700">
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">Your listing price:</span>
                  <span className="font-bold text-lg">${listingData.price || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">Platform fee (15%):</span>
                  <span className="font-bold text-red-600">-${((parseFloat(listingData.price) || 0) * 0.15).toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-green-300 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Your earnings per sale:</span>
                    <span className="font-bold text-2xl text-green-600">${((parseFloat(listingData.price) || 0) * 0.85).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}