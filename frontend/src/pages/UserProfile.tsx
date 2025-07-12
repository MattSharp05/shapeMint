import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Star, Download, Heart, Grid, List, Eye, Award, TrendingUp } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';

// Mock user data - in a real app, this would come from an API
const mockUserProfiles = {
  'DesignPro': {
    username: 'DesignPro',
    displayName: 'Alex Chen',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
    bio: 'Passionate 3D designer specializing in functional household items and modern aesthetics. I love creating designs that blend form and function seamlessly.',
    location: 'San Francisco, CA',
    joinedDate: '2023-05-15',
    rating: 4.8,
    totalDesigns: 23,
    totalDownloads: 5420,
    totalLikes: 1230,
    totalViews: 45600,
    verified: true,
    specialties: ['Home & Garden', 'Kitchen', 'Modern Design', 'Functional Items'],
    socialLinks: {
      website: 'https://alexchen.design',
      instagram: '@alexchen_3d',
      twitter: '@alexchen3d'
    },
    achievements: [
      { title: 'Top Seller', description: 'Over 1000 downloads', icon: Award },
      { title: 'Rising Star', description: 'Fastest growing creator', icon: TrendingUp },
      { title: 'Community Favorite', description: 'Highly rated designs', icon: Star }
    ],
    designs: [
      {
        id: '1',
        title: 'Modern Coffee Mug',
        thumbnail: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 12.99,
        downloads: 245,
        likes: 89,
        views: 1234,
        category: 'Home & Garden',
        featured: true,
        createdAt: '2025-01-10'
      },
      {
        id: '7',
        title: 'Minimalist Desk Lamp',
        thumbnail: 'https://images.pexels.com/photos/1166643/pexels-photo-1166643.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 24.99,
        downloads: 156,
        likes: 78,
        views: 890,
        category: 'Lighting',
        featured: false,
        createdAt: '2025-01-08'
      },
      {
        id: '8',
        title: 'Kitchen Utensil Holder',
        thumbnail: 'https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 15.50,
        downloads: 203,
        likes: 92,
        views: 1100,
        category: 'Home & Garden',
        featured: false,
        createdAt: '2025-01-05'
      },
      {
        id: '9',
        title: 'Ergonomic Phone Stand',
        thumbnail: 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 9.99,
        downloads: 312,
        likes: 145,
        views: 1567,
        category: 'Accessories',
        featured: false,
        createdAt: '2025-01-03'
      }
    ]
  },
  'ArtisticMind': {
    username: 'ArtisticMind',
    displayName: 'Maria Rodriguez',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200',
    bio: 'Contemporary artist exploring the intersection of digital art and physical form through 3D printing. My work focuses on geometric patterns and abstract sculptures.',
    location: 'Barcelona, Spain',
    joinedDate: '2023-03-22',
    rating: 4.6,
    totalDesigns: 18,
    totalDownloads: 3240,
    totalLikes: 890,
    totalViews: 28400,
    verified: false,
    specialties: ['Art & Decor', 'Sculptures', 'Geometric', 'Abstract'],
    socialLinks: {
      website: 'https://mariarodriguez.art',
      instagram: '@maria_3d_art'
    },
    achievements: [
      { title: 'Creative Excellence', description: 'Unique artistic designs', icon: Star },
      { title: 'Community Choice', description: 'Most liked designs', icon: Heart }
    ],
    designs: [
      {
        id: '2',
        title: 'Geometric Vase',
        thumbnail: 'https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg?auto=compress&cs=tinysrgb&w=400',
        price: 18.50,
        downloads: 189,
        likes: 142,
        views: 2100,
        category: 'Art & Decor',
        featured: false,
        createdAt: '2025-01-12'
      }
    ]
  }
};

export function UserProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');

  const user = mockUserProfiles[username as keyof typeof mockUserProfiles];

  if (!user) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Not Found</h2>
          <p className="text-gray-600 mb-6">The user profile you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/marketplace')}>
            Back to Marketplace
          </Button>
        </Card>
      </div>
    );
  }

  const sortedDesigns = [...user.designs].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'popular':
        return b.downloads - a.downloads;
      case 'liked':
        return b.likes - a.likes;
      case 'price-high':
        return b.price - a.price;
      case 'price-low':
        return a.price - b.price;
      default:
        return 0;
    }
  });

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        </div>

        {/* Profile Header */}
        <Card className="p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.displayName}
                className="w-32 h-32 rounded-full object-cover"
              />
              {user.verified && (
                <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-full">
                  <Star className="h-4 w-4 fill-current" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {user.displayName}
                    {user.verified && (
                      <span className="ml-2 text-blue-500">
                        <Star className="h-6 w-6 inline fill-current" />
                      </span>
                    )}
                  </h1>
                  <p className="text-xl text-gray-600">@{user.username}</p>
                </div>
                
                <div className="flex items-center space-x-4 mt-4 md:mt-0">
                  <div className="flex items-center space-x-1 text-yellow-500">
                    <Star className="h-5 w-5 fill-current" />
                    <span className="font-medium">{user.rating}</span>
                  </div>
                  <Button variant="outline">
                    Follow
                  </Button>
                </div>
              </div>
              
              <p className="text-gray-600 mb-4 max-w-2xl">
                {user.bio}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{user.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(user.joinedDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}</span>
                </div>
              </div>
              
              {/* Social Links */}
              {user.socialLinks && (
                <div className="flex space-x-4 mb-4">
                  {user.socialLinks.website && (
                    <a 
                      href={user.socialLinks.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 text-sm"
                    >
                      Website
                    </a>
                  )}
                  {user.socialLinks.instagram && (
                    <a 
                      href={`https://instagram.com/${user.socialLinks.instagram.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 text-sm"
                    >
                      {user.socialLinks.instagram}
                    </a>
                  )}
                  {user.socialLinks.twitter && (
                    <a 
                      href={`https://twitter.com/${user.socialLinks.twitter.replace('@', '')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 text-sm"
                    >
                      {user.socialLinks.twitter}
                    </a>
                  )}
                </div>
              )}
              
              {/* Specialties */}
              <div className="flex flex-wrap gap-2">
                {user.specialties.map((specialty) => (
                  <span 
                    key={specialty}
                    className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Stats & Achievements Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Designs</span>
                  <span className="font-bold text-gray-900">{user.totalDesigns}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Downloads</span>
                  <span className="font-bold text-gray-900">{user.totalDownloads.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Likes</span>
                  <span className="font-bold text-gray-900">{user.totalLikes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Views</span>
                  <span className="font-bold text-gray-900">{user.totalViews.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Achievements */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
              <div className="space-y-3">
                {user.achievements.map((achievement, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
                      <achievement.icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{achievement.title}</h4>
                      <p className="text-xs text-gray-500">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Designs */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Designs ({user.designs.length})
              </h2>
              
              <div className="flex items-center space-x-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Most Downloaded</option>
                  <option value="liked">Most Liked</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="price-low">Price: Low to High</option>
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

            {/* Designs Grid/List */}
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
                            className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors"
                          >
                            {design.title}
                          </Link>
                          <span className="text-2xl font-bold text-purple-600">
                            ${design.price}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {design.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {design.createdAt}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Download className="h-3 w-3" />
                              <span>{design.downloads}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="h-3 w-3" />
                              <span>{design.likes}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{design.views}</span>
                            </div>
                          </div>
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
                                className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors"
                              >
                                {design.title}
                              </Link>
                              {design.featured && (
                                <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-2 py-1 rounded-md text-xs font-medium">
                                  Featured
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                {design.category}
                              </span>
                              <span>{design.createdAt}</span>
                              <div className="flex items-center space-x-1">
                                <Download className="h-3 w-3" />
                                <span>{design.downloads}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Heart className="h-3 w-3" />
                                <span>{design.likes}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Eye className="h-3 w-3" />
                                <span>{design.views}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-6">
                            <div className="text-2xl font-bold text-purple-600">
                              ${design.price}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {user.designs.length === 0 && (
              <Card className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <Grid className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No designs yet</h3>
                <p className="text-gray-500">This creator hasn't published any designs yet.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}