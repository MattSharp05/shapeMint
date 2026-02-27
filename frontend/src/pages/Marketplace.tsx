import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Grid, List, Printer, Loader2 } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { modelService } from '../services/modelService';
import { MarketplaceModel } from '../types';

const categories = ['All', 'Home & Garden', 'Art & Decor', 'Accessories', 'Lighting', 'Office'];

// Helper function to capitalize first letter of each word
const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

export function Marketplace() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
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
    title: model.name || capitalizeWords(model.prompt || 'Untitled Model'),
    description: model.prompt || 'AI-generated 3D model',
    thumbnail: model.thumbnail_url || DEFAULT_MODEL_THUMBNAIL,
    category: capitalizeWords(model.style || 'Other'),
    modelUrl: model.glb_url || model.obj_url || model.stl_url || '',
    stl_url: model.stl_url || '',
    objUrl: model.obj_url || '',
    glbUrl: model.glb_url || '',
    createdAt: model.created_at,
  }));

  const allDesigns = realDesigns;

  const filteredDesigns = allDesigns.filter(design => {
    const matchesSearch = design.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         design.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || design.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedDesigns = [...filteredDesigns].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        const dateA = new Date(a.createdAt || '2024-01-01').getTime();
        const dateB = new Date(b.createdAt || '2024-01-01').getTime();
        return dateB - dateA;
      case 'oldest':
        const dateC = new Date(a.createdAt || '2024-01-01').getTime();
        const dateD = new Date(b.createdAt || '2024-01-01').getTime();
        return dateC - dateD;
      default:
        return 0;
    }
  });

  const handleGetPrinted = (design: typeof realDesigns[0]) => {
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
        },
        modelUrl: design.modelUrl,
        stlUrl: design.stl_url
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
              Discover high-quality AI-generated 3D models ready for printing
            </p>
          </div>

          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-brand-primary animate-spin mx-auto mb-4" />
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
              Discover high-quality AI-generated 3D models ready for printing
            </p>
          </div>

          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-2xl">!</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Unable to Load Marketplace
              </h3>
              <p className="text-gray-600 mb-6">
                {error}
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-brand-primary hover:bg-brand-primary-dark text-white"
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
            Discover high-quality AI-generated 3D models ready for printing
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>

              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-brand-light text-brand-primary' : 'text-gray-400'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-brand-light text-brand-primary' : 'text-gray-400'}`}
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
                  </div>
                  <div className="p-6">
                    <Link
                      to={`/design/${design.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-brand-primary transition-colors cursor-pointer block mb-2"
                    >
                      {design.title}
                    </Link>
                    <p className="text-gray-600 text-sm mb-4">
                      {design.description}
                    </p>
                    <div className="mb-4">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {design.category}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200"
                      onClick={() => handleGetPrinted(design)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Get it Printed
                    </Button>
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
                        <Link
                          to={`/design/${design.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-brand-primary transition-colors cursor-pointer block mb-2"
                        >
                          {design.title}
                        </Link>
                        <p className="text-gray-600 mb-2">{design.description}</p>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {design.category}
                        </span>
                      </div>
                      <div className="ml-6">
                        <Button
                          size="sm"
                          className="bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold min-w-[140px] shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200"
                          onClick={() => handleGetPrinted(design)}
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Get it Printed
                        </Button>
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
