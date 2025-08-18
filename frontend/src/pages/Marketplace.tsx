import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Grid, List, Heart, Download, Printer } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { modelService } from '../services/modelService';
import { MarketplaceModel } from '../types';

const mockDesigns = [
  {
    id: '1',
    title: 'Modern Coffee Mug',
    description: 'Sleek contemporary coffee mug with ergonomic handle',
    thumbnail: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 12.99,
    category: 'Home & Garden',
    downloads: 245,
    likes: 89,
    userName: 'DesignPro',
    featured: true,
    modelUrl: 'mock-model-url-1',
    stl_url: '',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Geometric Vase',
    description: 'Abstract geometric vase perfect for modern interiors',
    thumbnail: 'https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 18.50,
    category: 'Art & Decor',
    downloads: 189,
    likes: 142,
    userName: 'ArtisticMind',
    modelUrl: 'mock-model-url-2',
    stl_url: '',
    createdAt: '2024-01-10T14:30:00Z'
  },
  {
    id: '3',
    title: 'Phone Stand',
    description: 'Adjustable phone stand for desk and bedside use',
    thumbnail: 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 8.99,
    category: 'Accessories',
    downloads: 512,
    likes: 203,
    userName: 'TechCreator',
    modelUrl: 'mock-model-url-3',
    stl_url: '',
    createdAt: '2024-01-20T09:15:00Z'
  },
  {
    id: '4',
    title: 'Minimalist Lamp',
    description: 'Clean minimalist table lamp with modern aesthetics',
    thumbnail: 'https://images.pexels.com/photos/1166643/pexels-photo-1166643.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 24.99,
    category: 'Lighting',
    downloads: 78,
    likes: 56,
    userName: 'LightDesigns',
    modelUrl: 'mock-model-url-4',
    stl_url: '',
    createdAt: '2024-01-05T16:45:00Z'
  },
  {
    id: '5',
    title: 'Garden Planter',
    description: 'Hexagonal planter perfect for succulents and small plants',
    thumbnail: 'https://images.pexels.com/photos/1647962/pexels-photo-1647962.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 15.75,
    category: 'Home & Garden',
    downloads: 167,
    likes: 94,
    userName: 'GreenThumb',
    modelUrl: 'mock-model-url-5',
    stl_url: '',
    createdAt: '2024-01-12T11:20:00Z'
  },
  {
    id: '6',
    title: 'Desk Organizer',
    description: 'Multi-compartment desk organizer for office supplies',
    thumbnail: 'https://images.pexels.com/photos/159644/art-supplies-brushes-rulers-scissors-159644.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 19.95,
    category: 'Office',
    downloads: 298,
    likes: 127,
    userName: 'OrganizeIT',
    modelUrl: 'mock-model-url-6',
    stl_url: '',
    createdAt: '2024-01-08T13:30:00Z'
  }
];

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
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch real models from Supabase
    modelService.fetchMarketplaceModels().then(setMarketplaceModels);
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
    createdAt: model.created_at, // Add creation date for sorting
  }));

  // Combine real models and mock data (real models first)
  // TODO: Remove mockDesigns when real data is sufficient
  const allDesigns = [...realDesigns, ...mockDesigns];

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

  const handleBuyNow = (design: typeof mockDesigns[0]) => {
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

  const handleDownloadOnly = (design: typeof mockDesigns[0]) => {
    // Navigate to download checkout page
    navigate('/download-checkout', {
      state: {
        modelData: {
          designId: design.id,
          designTitle: design.title,
          designDescription: design.description,
          creator: design.userName,
          isMarketplaceItem: true
        },
        modelUrl: design.modelUrl,
        price: design.price,
        isGenerated: false
      }
    });
  };

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