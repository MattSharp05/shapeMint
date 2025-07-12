import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, DollarSign, FileText, Tag, Eye } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { ModelViewer } from '../components/3D/ModelViewer';

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
    
    // Simulate upload process
    setTimeout(() => {
      setUploading(false);
      alert('Your design has been successfully uploaded to the marketplace!');
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => navigate('/generate')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Generate</span>
          </button>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upload to Marketplace
          </h1>
          <p className="text-xl text-gray-600">
            List your 3D model for sale in the ShapeMint marketplace
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Listing Details
              </h3>
              
              <div className="space-y-4">
                <Input
                  label="Title"
                  placeholder="Give your design a catchy title"
                  value={listingData.title}
                  onChange={(e) => setListingData({...listingData, title: e.target.value})}
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your design, its features, and potential uses..."
                    value={listingData.description}
                    onChange={(e) => setListingData({...listingData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    rows={4}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Price ($)"
                    type="number"
                    step="0.01"
                    min="0.99"
                    placeholder="9.99"
                    value={listingData.price}
                    onChange={(e) => setListingData({...listingData, price: e.target.value})}
                    required
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={listingData.category}
                      onChange={(e) => setListingData({...listingData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <Input
                  label="Tags (comma separated)"
                  placeholder="modern, minimalist, functional, decorative"
                  value={listingData.tags}
                  onChange={(e) => setListingData({...listingData, tags: e.target.value})}
                  helperText="Add relevant tags to help buyers find your design"
                />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Additional Notes
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Creator Notes (Optional)
                </label>
                <textarea
                  placeholder="Any special printing instructions, recommended materials, or other notes for buyers..."
                  value={listingData.notes}
                  onChange={(e) => setListingData({...listingData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  rows={3}
                />
              </div>
            </Card>

            <Button 
              onClick={handleUpload}
              loading={uploading}
              className="w-full"
              size="lg"
              icon={Upload}
            >
              {uploading ? 'Uploading...' : 'Upload to Marketplace'}
            </Button>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                3D Model Preview
              </h3>
              <ModelViewer 
                modelUrl={modelUrl}
                className="h-64 w-full mb-4"
              />
              <div className="text-sm text-gray-600">
                <p><strong>Generated from:</strong> {modelData.prompt || 'Image upload'}</p>
                <p><strong>Style:</strong> {modelData.settings?.style}</p>
                <p><strong>Quality:</strong> {modelData.settings?.quality}</p>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Marketplace Preview
              </h3>
              
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-2">
                  {listingData.title || 'Your Design Title'}
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  {listingData.description || 'Your design description will appear here...'}
                </p>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                    {listingData.category}
                  </span>
                  <span className="text-lg font-bold text-purple-600">
                    ${listingData.price || '0.00'}
                  </span>
                </div>
                {listingData.tags && (
                  <div className="flex flex-wrap gap-1">
                    {listingData.tags.split(',').map((tag, index) => (
                      <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 bg-green-50 border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Earnings Information
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Your listing price:</span>
                  <span>${listingData.price || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee (15%):</span>
                  <span>-${((parseFloat(listingData.price) || 0) * 0.15).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-green-300 pt-2">
                  <span>Your earnings per sale:</span>
                  <span>${((parseFloat(listingData.price) || 0) * 0.85).toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}