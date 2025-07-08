import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, ShoppingCart, Heart, Share2, Eye, Star, Calendar, User, FileText, Tag, Shield, Printer } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { ModelViewer } from '../components/3D/ModelViewer';

// Mock data - in a real app, this would come from an API
const mockDesignDetails = {
  '1': {
    id: '1',
    title: 'Modern Coffee Mug',
    description: 'Sleek contemporary coffee mug with ergonomic handle designed for daily use. Features a comfortable grip and perfect capacity for your morning coffee.',
    longDescription: 'This modern coffee mug combines functionality with aesthetic appeal. The ergonomic handle is designed to fit comfortably in your hand, while the sleek profile makes it perfect for both home and office use. The design has been optimized for 3D printing with minimal support requirements.',
    thumbnail: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 12.99,
    category: 'Home & Garden',
    downloads: 245,
    likes: 89,
    views: 1234,
    userName: 'DesignPro',
    userAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
    userRating: 4.8,
    userDesigns: 23,
    userJoined: '2023-05-15',
    featured: true,
    modelUrl: 'mock-model-url-1',
    tags: ['modern', 'coffee', 'mug', 'kitchen', 'ergonomic', 'daily-use'],
    createdAt: '2025-01-10',
    updatedAt: '2025-01-12',
    fileFormats: ['STL', 'OBJ', '3MF'],
    fileSize: '2.4 MB',
    polygons: 12480,
    printTime: '3-4 hours',
    material: 'PLA recommended',
    infill: '15-20%',
    supports: 'No supports needed',
    creatorNotes: 'This mug has been tested extensively and prints beautifully with minimal settings. I recommend using PLA filament with 0.2mm layer height for best results. The handle is designed to be strong enough for daily use while maintaining an elegant appearance. Feel free to scale it up or down as needed - I\'ve tested it from 80% to 120% scale successfully.',
    printingTips: [
      'Use 0.2mm layer height for smooth finish',
      'Print with the opening facing up',
      'No supports required with proper orientation',
      '15-20% infill provides good strength',
      'PLA filament recommended for food safety'
    ],
    license: 'Commercial use allowed',
    reviews: [
      {
        id: '1',
        userName: 'CoffeeLover42',
        rating: 5,
        comment: 'Perfect mug! Printed beautifully and feels great in hand.',
        date: '2025-01-08'
      },
      {
        id: '2',
        userName: 'MakerMike',
        rating: 4,
        comment: 'Great design, easy to print. Handle could be slightly thicker.',
        date: '2025-01-05'
      }
    ]
  },
  '2': {
    id: '2',
    title: 'Geometric Vase',
    description: 'Abstract geometric vase perfect for modern interiors',
    longDescription: 'This striking geometric vase features clean lines and angular surfaces that create beautiful light and shadow patterns. Perfect for modern and contemporary interiors, it can hold fresh flowers or stand alone as a sculptural piece. The design is optimized for 3D printing with excellent structural integrity.',
    thumbnail: 'https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 18.50,
    category: 'Art & Decor',
    downloads: 189,
    likes: 142,
    views: 2100,
    userName: 'ArtisticMind',
    userAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
    userRating: 4.6,
    userDesigns: 18,
    userJoined: '2023-03-22',
    featured: false,
    modelUrl: 'mock-model-url-2',
    tags: ['geometric', 'vase', 'modern', 'decor', 'abstract', 'sculptural'],
    createdAt: '2025-01-12',
    updatedAt: '2025-01-13',
    fileFormats: ['STL', 'OBJ'],
    fileSize: '3.1 MB',
    polygons: 18650,
    printTime: '5-6 hours',
    material: 'PLA or PETG recommended',
    infill: '10-15%',
    supports: 'Minimal supports needed',
    creatorNotes: 'This vase is designed to be both functional and artistic. The geometric facets create interesting visual effects as light hits the surface throughout the day. I recommend printing in a single color to emphasize the form, but it also looks stunning in gradient or multi-color prints.',
    printingTips: [
      'Print with 0.2-0.3mm layer height',
      'Use minimal supports only at overhangs',
      'Consider printing in vase mode for translucent materials',
      '10-15% infill is sufficient for decorative use',
      'PETG works great for a glossy finish'
    ],
    license: 'Commercial use allowed',
    reviews: [
      {
        id: '1',
        userName: 'ModernHome',
        rating: 5,
        comment: 'Absolutely beautiful! Looks amazing in my living room.',
        date: '2025-01-10'
      },
      {
        id: '2',
        userName: 'PrintMaster',
        rating: 4,
        comment: 'Great design, printed perfectly with minimal supports.',
        date: '2025-01-07'
      }
    ]
  },
  '3': {
    id: '3',
    title: 'Phone Stand',
    description: 'Adjustable phone stand for desk and bedside use',
    longDescription: 'This versatile phone stand is designed for maximum functionality and stability. Features an adjustable angle mechanism that works with phones of all sizes, from compact models to large phablets. The weighted base ensures your device stays secure while the open design allows for easy cable management.',
    thumbnail: 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 8.99,
    category: 'Accessories',
    downloads: 512,
    likes: 203,
    views: 3456,
    userName: 'TechCreator',
    userAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100',
    userRating: 4.7,
    userDesigns: 31,
    userJoined: '2023-01-10',
    featured: false,
    modelUrl: 'mock-model-url-3',
    tags: ['phone', 'stand', 'adjustable', 'desk', 'tech', 'functional'],
    createdAt: '2025-01-09',
    updatedAt: '2025-01-11',
    fileFormats: ['STL', 'OBJ', '3MF'],
    fileSize: '1.8 MB',
    polygons: 8920,
    printTime: '2-3 hours',
    material: 'PLA or ABS recommended',
    infill: '20-25%',
    supports: 'No supports needed',
    creatorNotes: 'I designed this stand after being frustrated with flimsy phone holders. The adjustable mechanism is robust and the base is wide enough to prevent tipping. Works great for video calls, watching content, or just keeping your phone visible on your desk.',
    printingTips: [
      'Print with 0.2mm layer height for smooth operation',
      'Use 20-25% infill for durability',
      'No supports needed with proper orientation',
      'ABS recommended for higher temperature resistance',
      'Sand the adjustment mechanism lightly if too tight'
    ],
    license: 'Commercial use allowed',
    reviews: [
      {
        id: '1',
        userName: 'OfficeWorker',
        rating: 5,
        comment: 'Perfect for video calls! Very stable and adjustable.',
        date: '2025-01-06'
      },
      {
        id: '2',
        userName: 'StudentLife',
        rating: 5,
        comment: 'Great for watching videos while studying. Highly recommend!',
        date: '2025-01-04'
      }
    ]
  },
  '4': {
    id: '4',
    title: 'Minimalist Lamp',
    description: 'Clean minimalist table lamp with modern aesthetics',
    longDescription: 'This elegant table lamp embodies minimalist design principles with clean lines and a focus on functionality. The shade diffuses light beautifully while the weighted base provides stability. Designed to accommodate standard LED bulbs and includes cable management features.',
    thumbnail: 'https://images.pexels.com/photos/1166643/pexels-photo-1166643.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 24.99,
    category: 'Lighting',
    downloads: 78,
    likes: 56,
    views: 890,
    userName: 'LightDesigns',
    userAvatar: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=100',
    userRating: 4.9,
    userDesigns: 12,
    userJoined: '2023-08-20',
    featured: false,
    modelUrl: 'mock-model-url-4',
    tags: ['lamp', 'minimalist', 'lighting', 'modern', 'table', 'led'],
    createdAt: '2025-01-07',
    updatedAt: '2025-01-08',
    fileFormats: ['STL', 'OBJ'],
    fileSize: '4.2 MB',
    polygons: 22340,
    printTime: '6-8 hours',
    material: 'PLA or PETG recommended',
    infill: '15-20%',
    supports: 'Minimal supports for shade',
    creatorNotes: 'This lamp design focuses on simplicity and elegance. The shade is designed to work with standard E26/E27 LED bulbs. I recommend using a warm white LED for the best ambiance. The base can be printed hollow and filled with sand for extra stability.',
    printingTips: [
      'Print base and shade separately for best results',
      'Use supports only for the shade overhang',
      'Consider printing shade in translucent material',
      'Fill base with sand or small weights for stability',
      'Sand and finish for professional appearance'
    ],
    license: 'Personal use only',
    reviews: [
      {
        id: '1',
        userName: 'InteriorDesigner',
        rating: 5,
        comment: 'Beautiful design! Fits perfectly in modern spaces.',
        date: '2025-01-05'
      }
    ]
  },
  '5': {
    id: '5',
    title: 'Garden Planter',
    description: 'Hexagonal planter perfect for succulents and small plants',
    longDescription: 'This geometric hexagonal planter combines modern design with practical functionality. Perfect for succulents, herbs, or small houseplants. Features drainage holes and a matching saucer to protect surfaces. The modular design allows multiple planters to be arranged in attractive patterns.',
    thumbnail: 'https://images.pexels.com/photos/1647962/pexels-photo-1647962.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 15.75,
    category: 'Home & Garden',
    downloads: 167,
    likes: 94,
    views: 1456,
    userName: 'GreenThumb',
    userAvatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=100',
    userRating: 4.5,
    userDesigns: 15,
    userJoined: '2023-06-12',
    featured: false,
    modelUrl: 'mock-model-url-5',
    tags: ['planter', 'hexagonal', 'garden', 'succulent', 'geometric', 'modular'],
    createdAt: '2025-01-06',
    updatedAt: '2025-01-07',
    fileFormats: ['STL', 'OBJ'],
    fileSize: '2.8 MB',
    polygons: 15670,
    printTime: '4-5 hours',
    material: 'PETG or ABS recommended',
    infill: '20%',
    supports: 'No supports needed',
    creatorNotes: 'I designed this planter for my own succulent collection and loved it so much I had to share! The hexagonal shape is not only aesthetically pleasing but also allows for efficient arrangement of multiple planters. Make sure to use PETG or ABS for better UV resistance if placing outdoors.',
    printingTips: [
      'Use PETG or ABS for outdoor use',
      'Print with drainage holes facing up',
      'No supports needed with proper orientation',
      '20% infill provides good strength',
      'Consider printing in earth tones for natural look'
    ],
    license: 'Commercial use allowed',
    reviews: [
      {
        id: '1',
        userName: 'PlantLover',
        rating: 4,
        comment: 'Great for my succulent collection! Love the geometric design.',
        date: '2025-01-03'
      },
      {
        id: '2',
        userName: 'GardenMaker',
        rating: 5,
        comment: 'Perfect size and the drainage works well. Printed 6 of them!',
        date: '2025-01-01'
      }
    ]
  },
  '6': {
    id: '6',
    title: 'Desk Organizer',
    description: 'Multi-compartment desk organizer for office supplies',
    longDescription: 'Keep your workspace tidy with this comprehensive desk organizer. Features multiple compartments of varying sizes to accommodate pens, pencils, paper clips, sticky notes, and other office essentials. The modular design allows you to print multiple units and arrange them to fit your specific needs.',
    thumbnail: 'https://images.pexels.com/photos/159644/art-supplies-brushes-rulers-scissors-159644.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 19.95,
    category: 'Office',
    downloads: 298,
    likes: 127,
    views: 2234,
    userName: 'OrganizeIT',
    userAvatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=100',
    userRating: 4.6,
    userDesigns: 27,
    userJoined: '2023-04-08',
    featured: false,
    modelUrl: 'mock-model-url-6',
    tags: ['organizer', 'desk', 'office', 'storage', 'modular', 'productivity'],
    createdAt: '2025-01-04',
    updatedAt: '2025-01-05',
    fileFormats: ['STL', 'OBJ', '3MF'],
    fileSize: '3.6 MB',
    polygons: 19850,
    printTime: '5-7 hours',
    material: 'PLA recommended',
    infill: '15-20%',
    supports: 'No supports needed',
    creatorNotes: 'As someone who works from home, I needed a better way to organize my desk supplies. This organizer has compartments sized for common office items and the modular design means you can print multiple units to create a custom organization system. The rounded corners make it easy to clean.',
    printingTips: [
      'Print with 0.2mm layer height for smooth finish',
      'No supports needed with proper orientation',
      '15-20% infill is sufficient for office supplies',
      'PLA works great for indoor office use',
      'Consider printing in professional colors like black or gray'
    ],
    license: 'Commercial use allowed',
    reviews: [
      {
        id: '1',
        userName: 'HomeOffice',
        rating: 5,
        comment: 'Exactly what I needed! Perfect compartment sizes.',
        date: '2025-01-02'
      },
      {
        id: '2',
        userName: 'ProductivityGuru',
        rating: 4,
        comment: 'Great design, helps keep my desk clean and organized.',
        date: '2024-12-30'
      }
    ]
  }
  // Add more mock designs as needed
};

export function DesignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLiked, setIsLiked] = useState(false);

  const design = mockDesignDetails[id as keyof typeof mockDesignDetails];

  if (!design) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Design Not Found</h2>
          <p className="text-gray-600 mb-6">The design you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/marketplace')}>
            Back to Marketplace
          </Button>
        </Card>
      </div>
    );
  }

  const handleDownload = () => {
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

  const handleBuyNow = () => {
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
        modelUrl: design.modelUrl
      }
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'printing', label: 'Printing Info' },
    { id: 'reviews', label: `Reviews (${design.reviews.length})` },
    { id: 'creator', label: 'Creator' }
  ];

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Marketplace</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 3D Model Viewer */}
          <div>
            <Card className="p-6">
              <ModelViewer 
                modelUrl={design.modelUrl}
                className="h-96 w-full mb-4"
              />
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{design.views} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Download className="h-4 w-4" />
                    <span>{design.downloads} downloads</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className={`flex items-center space-x-1 transition-colors ${
                      isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{design.likes + (isLiked ? 1 : 0)}</span>
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Design Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {design.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded">{design.category}</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Updated {design.updatedAt}</span>
                    </div>
                  </div>
                </div>
                {design.featured && (
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Featured
                  </span>
                )}
              </div>

              <p className="text-gray-600 mb-6">
                {design.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {design.tags.map((tag) => (
                  <span key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl font-bold text-purple-600">
                  ${design.price}
                </div>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center space-x-1 mb-1">
                    <Shield className="h-3 w-3" />
                    <span>{design.license}</span>
                  </div>
                  <div>File size: {design.fileSize}</div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleDownload}
                  className="w-full"
                  icon={Download}
                >
                  Buy Digital Files - ${design.price}
                </Button>
                <Button 
                  onClick={handleBuyNow}
                  variant="outline"
                  className="w-full"
                  icon={ShoppingCart}
                >
                  Order Physical Print
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">File Formats Included:</h4>
                <div className="flex space-x-2">
                  {design.fileFormats.map((format) => (
                    <span key={format} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* Creator Info */}
            <Card className="p-6">
              <div className="flex items-center space-x-4">
                <img
                  src={design.userAvatar}
                  alt={design.userName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{design.userName}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{design.userRating}</span>
                    </div>
                    <span>{design.userDesigns} designs</span>
                    <span>Joined {design.userJoined}</span>
                  </div>
                </div>
                <Link to={`/creator/${design.userName}`}>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  About This Design
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {design.longDescription}
                </p>
                
                {design.creatorNotes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      Creator Notes
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {design.creatorNotes}
                    </p>
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'printing' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <Printer className="h-5 w-5 mr-2" />
                  3D Printing Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Print Settings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Print Time:</span>
                        <span className="font-medium">{design.printTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Material:</span>
                        <span className="font-medium">{design.material}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Infill:</span>
                        <span className="font-medium">{design.infill}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Supports:</span>
                        <span className="font-medium">{design.supports}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">File Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Polygons:</span>
                        <span className="font-medium">{design.polygons.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">File Size:</span>
                        <span className="font-medium">{design.fileSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Formats:</span>
                        <span className="font-medium">{design.fileFormats.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Printing Tips</h4>
                  <ul className="space-y-2">
                    {design.printingTips.map((tip, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 flex-shrink-0"></span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}

            {activeTab === 'reviews' && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Customer Reviews
                </h3>
                
                <div className="space-y-6">
                  {design.reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{review.userName}</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                      <p className="text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'creator' && (
              <Card className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <img
                    src={design.userAvatar}
                    alt={design.userName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{design.userName}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{design.userRating} rating</span>
                      </div>
                      <span>{design.userDesigns} designs</span>
                      <span>Member since {design.userJoined}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Creator profile details coming soon...</p>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">Quick Stats</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Views:</span>
                  <span className="font-medium">{design.views.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Downloads:</span>
                  <span className="font-medium">{design.downloads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Likes:</span>
                  <span className="font-medium">{design.likes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{design.createdAt}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">Related Designs</h4>
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Related designs coming soon...</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}