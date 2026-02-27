import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, DollarSign, FileText, Eye, Sparkles } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { ModelViewer } from '../components/3D/ModelViewer';
import { modelService } from '../services/modelService';

const categories = [
  'Home & Garden',
  'Art & Decor', 
  'Accessories',
  'Lighting',
  'Office',
  'Toys & Games',
  'Jewelry',
  'Tools & Hardware',
  'Fashion',
  'Electronics'
];

export function MarketplaceUpload() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modelData, modelUrl } = location.state || {};
  
  const [listingData, setListingData] = useState({
    title: modelData?.prompt || '',
    description: '',
    price: '',
    category: 'Home & Garden',
    tags: '',
    notes: ''
  });
  const [uploading, setUploading] = useState(false);

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
    setUploading(true);
    
    try {
      // Validate required fields
      if (!listingData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!listingData.description.trim()) {
        throw new Error('Description is required');
      }
      if (!listingData.price || parseFloat(listingData.price) <= 0) {
        throw new Error('Valid price is required');
      }
      
      // Get model ID from modelData
      const modelId = modelData?.id;
      if (!modelId) {
        throw new Error('Model ID not found. Please try generating the model again.');
      }
      
      console.log('🚀 Publishing to marketplace...', { modelId, listingData });
      
      // Call the real marketplace publish service
      const result = await modelService.publishToMarketplace({
        modelId: modelId,
        title: listingData.title.trim(),
        description: listingData.description.trim(),
        price: parseFloat(listingData.price),
        category: listingData.category,
        tags: listingData.tags.trim(),
        notes: listingData.notes.trim() || undefined
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to publish to marketplace');
      }
      
      console.log('✅ Successfully published to marketplace!', result.data);
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 animate-fade-in';
      successDiv.innerHTML = `
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Successfully published to marketplace!</span>
      `;
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        successDiv.remove();
        navigate('/marketplace');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Failed to publish to marketplace:', error);
      
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 animate-fade-in';
      errorDiv.innerHTML = `
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <span>${error instanceof Error ? error.message : 'Failed to publish to marketplace'}</span>
      `;
      document.body.appendChild(errorDiv);
      
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enhanced Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate('/generate')}
            className="group flex items-center space-x-2 text-gray-600 hover:text-brand-primary transition-all duration-200 mb-6 transform hover:translate-x-1"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Back to Generate</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-5xl font-bold text-brand-primary mb-4">
              Publish to Marketplace
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Share your creation with the world and start earning from your 3D designs
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enhanced Upload Form */}
          <div className="space-y-6">
            <Card className="p-8 backdrop-blur-sm bg-white/90 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                <Sparkles className="h-6 w-6 mr-3 text-brand-primary" />
                Listing Details
              </h3>
              
              <div className="space-y-6">
                <div className="group">
                  <Input
                    label="Title"
                    placeholder="Give your design a catchy title"
                    value={listingData.title}
                    onChange={(e) => setListingData({...listingData, title: e.target.value})}
                    className="transition-all duration-200 focus:ring-4 focus:ring-brand-light"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-4 focus:ring-brand-light focus:border-brand-primary resize-none transition-all duration-200 bg-gray-50 focus:bg-white"
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
                      className="transition-all duration-200 focus:ring-4 focus:ring-brand-light"
                      required
                    />
                  </div>
                  
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Category
                    </label>
                    <select
                      value={listingData.category}
                      onChange={(e) => setListingData({...listingData, category: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-4 focus:ring-brand-light focus:border-brand-primary transition-all duration-200 bg-gray-50 focus:bg-white"
                    >
                      {categories.map(category => (
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
                    className="transition-all duration-200 focus:ring-4 focus:ring-brand-light"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-4 focus:ring-brand-light focus:border-brand-primary resize-none transition-all duration-200 bg-gray-50 focus:bg-white"
                  rows={3}
                />
              </div>
            </Card>

            <Button 
              onClick={handleUpload}
              loading={uploading}
              className="w-full py-4 bg-brand-primary hover:bg-brand-primary-dark text-white font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              size="lg"
              icon={Upload}
            >
              {uploading ? 'Publishing to Marketplace...' : 'Publish to Marketplace'}
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
                <div className="absolute inset-0 rounded-xl ring-2 ring-brand-light group-hover:ring-brand-primary transition-all duration-300"></div>
              </div>
              <div className="mt-6 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
                <p><strong>Generated from:</strong> {modelData.prompt || 'Image upload'}</p>
                <p><strong>Style:</strong> {modelData.settings?.style || 'Realistic'}</p>
                <p><strong>Quality:</strong> {modelData.settings?.quality || 'Standard'}</p>
              </div>
            </Card>

            <Card className="p-8 backdrop-blur-sm bg-white/90 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Eye className="h-5 w-5 mr-3 text-green-600" />
                Marketplace Preview
              </h3>
              
              <div className="border-2 border-dashed border-brand-primary/30 rounded-xl p-6 bg-brand-light hover:border-brand-primary transition-all duration-300">
                <h4 className="font-bold text-gray-900 mb-3 text-lg">
                  {listingData.title || 'Your Design Title'}
                </h4>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {listingData.description || 'Your design description will appear here...'}
                </p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm bg-brand-light text-brand-primary px-3 py-1 rounded-full font-medium">
                    {listingData.category}
                  </span>
                  <span className="text-2xl font-bold text-brand-primary">
                    ${listingData.price || '0.00'}
                  </span>
                </div>
                {listingData.tags && (
                  <div className="flex flex-wrap gap-2">
                    {listingData.tags.split(',').map((tag, index) => (
                      <span key={index} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium border border-blue-200">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
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