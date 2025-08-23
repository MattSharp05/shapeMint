import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Grid, List, Heart, Download, Printer, Loader2 } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { modelService } from '../services/modelService';
import { MarketplaceModel } from '../types';

// Remove all mock designs - keeping only real generated models

const categories = ['All', 'Home & Garden', 'Art & Decor', 'Accessories', 'Lighting', 'Office'];

// Helper function to capitalize first letter of each word
const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

export function Marketplace() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popular');
  const [marketplaceModels, setMarketplaceModels] = useState<MarketplaceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        setError(null);
        const models = await modelService.fetchMarketplaceModels();
        setMarketplaceModels(models);
      } catch (err) {
        console.error('Failed to fetch marketplace models:', err);
        setError('Failed to load marketplace models. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const DEFAULT_MODEL_THUMBNAIL = 'https://placehold.co/400x300?text=3D+Model';

  const realDesigns = marketplaceModels.map((model) => ({
    id: model.id,
    title: model.name || capitalizeWords(model.prompt || 'Untitled Model'), // Use model name first, fallback to prompt
    description: model.prompt || 'AI-generated 3D model', // Use prompt as description
    // Use actual thumbnail if available, otherwise fallback to placeholder
    thumbnail: model.thumbnail_url || DEFAULT_MODEL_THUMBNAIL,
    price: 9.99, // Placeholder price, can be replaced with real pricing logic
    category: capitalizeWords(model.style || 'Other'),
    downloads: 0, // Placeholder
    likes: 0, // Placeholder
    userName: `Creator-${model.user_id.slice(-4)}`, // Better user display format
    featured: false, // Placeholder
    modelUrl: model.glb_url || model.obj_url || model.stl_url || '',
    stl_url: model.stl_url || '', // <-- Add STL URL explicitly
    objUrl: model.obj_url || '', // <-- Add OBJ URL explicitly
    glbUrl: model.glb_url || '', // <-- Add GLB URL explicitly
    createdAt: model.created_at, // Add creation date for sorting
  }));

  // Use only real models - no more mock data
  const allDesigns = realDesigns;

  const filteredDesigns = allDesigns.filter(design => {
    const matchesSearch = design.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         design.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || design.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Apply sorting logic
  const sortedDesigns = [...filteredDesigns].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        // Sort by creation date (newest first)
        const dateA = new Date(a.createdAt || '2024-01-01').getTime();
        const dateB = new Date(b.createdAt || '2024-01-01').getTime();
        return dateB - dateA;
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'popular':
      default:
        // Sort by downloads + likes (most popular first)
        return (b.downloads + b.likes) - (a.downloads + a.likes);
    }
  });

  const handleBuyNow = (design: typeof realDesigns[0]) => {
    // Navigate to order page with marketplace design data
    navigate('/order', {
      state: {
        modelData: {
          prompt: design.title,
          settings: {
            style: 'realistic',
            quality: 'high',
            size: 'medium'
          },
          isMarketplaceItem: true,
          designId: design.id,
          designTitle: design.title,
          designDescription: design.description,
          creator: design.userName
        },
        modelUrl: design.modelUrl,
        stlUrl: design.stl_url // <-- Pass STL URL explicitly
      }
    });
  };

  const handleDownloadOnly = (design: typeof realDesigns[0]) => {
    // Navigate to download checkout page
    navigate('/download-checkout', {
      state: {
        modelData: {
          designId: design.id,
          designTitle: design.title,
          designDescription: design.description,
          creator: design.userName,
          isMarketplaceItem: true,
          objUrl: design.objUrl,
          glbUrl: design.glbUrl
        },
        modelUrl: design.modelUrl,
        stlUrl: design.stl_url, // Pass STL URL explicitly
        price: design.price,
        isGenerated: false
      }
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              3D Design Marketplace
            </h1>
            <p className="text-xl text-gray-600">
              Discover and purchase high-quality 3D models from talented creators
            </p>
          </div>

          {/* Loading UI */}
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-purple-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Loading Marketplace...
              </h3>
              <p className="text-gray-600">
                Fetching the latest 3D models for you
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              3D Design Marketplace
            </h1>
            <p className="text-xl text-gray-600">
              Discover and purchase high-quality 3D models from talented creators
            </p>
          </div>

          {/* Error UI */}
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Unable to Load Marketplace
              </h3>
              <p className="text-gray-600 mb-6">
                {error}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            3D Design Marketplace
          </h1>
          <p className="text-xl text-gray-600">
            Discover and purchase high-quality 3D models from talented creators
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search designs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-purple-50 text-purple-600' : 'text-gray-400'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-purple-50 text-purple-600' : 'text-gray-400'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {sortedDesigns.length} designs
          </p>
        </div>

        {/* Design Grid */}
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {sortedDesigns.map((design) => (
            <Card key={design.id} className="overflow-hidden hover">
              {viewMode === 'grid' ? (
                <>
                  <div className="relative">
                    <img
                      src={design.thumbnail}
                      alt={design.title}
                      className="w-full h-48 object-cover"
                    />
                    {design.featured && (
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-2 py-1 rounded-md text-xs font-medium">
                        Featured
                      </div>
                    )}
                    <button className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                      <Heart className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <Link 
                        to={`/design/${design.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer"
                      >
                        {design.title}
                      </Link>
                      <span className="text-2xl font-bold text-purple-600">
                        ${design.price}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      {design.description}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {design.category}
                      </span>
                      <Link 
                        to={`/creator/${design.userName}`}
                        className="text-xs text-gray-500 hover:text-purple-600 transition-colors"
                      >
                        by {design.userName}
                      </Link>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Download className="h-3 w-3" />
                          <span>{design.downloads}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="h-3 w-3" />
                          <span>{design.likes}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons - Prioritizing Print */}
                    <div className="space-y-2">
                      <Button 
                        size="sm" 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                        onClick={() => handleBuyNow(design)}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Get it Printed
                        <span className="ml-auto text-xs opacity-90">Starting $20</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                        onClick={() => handleDownloadOnly(design)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download Files Only
                        <span className="ml-auto text-xs text-gray-500">${design.price}</span>
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex">
                  <img
                    src={design.thumbnail}
                    alt={design.title}
                    className="w-32 h-32 object-cover"
                  />
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Link 
                            to={`/design/${design.id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer"
                          >
                            {design.title}
                          </Link>
                          {design.featured && (
                            <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-2 py-1 rounded-md text-xs font-medium">
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{design.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {design.category}
                          </span>
                          <Link 
                            to={`/creator/${design.userName}`}
                            className="hover:text-purple-600 transition-colors"
                          >
                            by {design.userName}
                          </Link>
                          <div className="flex items-center space-x-1">
                            <Download className="h-3 w-3" />
                            <span>{design.downloads}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="h-3 w-3" />
                            <span>{design.likes}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-6">
                        <div className="text-2xl font-bold text-purple-600 mb-3">
                          ${design.price}
                        </div>
                        <div className="space-y-2">
                          <Button 
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold min-w-[140px] shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                            onClick={() => handleBuyNow(design)}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Get it Printed
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 min-w-[140px]"
                            onClick={() => handleDownloadOnly(design)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Files Only ${design.price}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}