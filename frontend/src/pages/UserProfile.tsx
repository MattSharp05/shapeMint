import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Star, Download, Heart, Grid, List, Eye, Award, TrendingUp, Edit, Save, X } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/user';
import { modelService } from '../services/modelService';
import type { User } from '../types/user';
import type { MarketplaceModel } from '../types';

export function UserProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [user, setUser] = useState<User | null>(null);
  const [userModels, setUserModels] = useState<MarketplaceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    avatar_url: ''
  });
  const [saveLoading, setSaveLoading] = useState(false);

  // Check if this is the current user's profile (My Account)
  const isOwnProfile = !username || username === currentUser?.id;
  const profileUserId = isOwnProfile ? currentUser?.id : username;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!profileUserId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user data
        const userData = await userService.getUser(profileUserId);
        if (userData) {
          setUser(userData);
          setEditForm({
            full_name: userData.full_name || '',
            bio: userData.bio || '',
            avatar_url: userData.avatar_url || ''
          });
        }

        // Fetch user's models
        const models = await modelService.fetchMarketplaceModels();
        const userModels = models.filter(model => model.user_id === profileUserId);
        setUserModels(userModels);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [profileUserId]);

  const handleSave = async () => {
    if (!user || !isOwnProfile) return;
    
    setSaveLoading(true);
    try {
      await userService.updateUser(user.id, {
        full_name: editForm.full_name,
        bio: editForm.bio,
        avatar_url: editForm.avatar_url
      });
      
      // Update local user state
      setUser({
        ...user,
        full_name: editForm.full_name,
        bio: editForm.bio,
        avatar_url: editForm.avatar_url
      });
      
      setIsEditing(false);
      console.log('✅ Profile updated successfully');
    } catch (error) {
      console.error('❌ Error updating profile:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      full_name: user?.full_name || '',
      bio: user?.bio || '',
      avatar_url: user?.avatar_url || ''
    });
    setIsEditing(false);
  };

  // Convert user models to design format for display
  const userDesigns = userModels.map(model => ({
    id: model.id,
    title: model.name || 'Untitled Model',
    thumbnail: model.thumbnail_url || 'https://placehold.co/400x300?text=3D+Model',
    price: 9.99, // Placeholder
    downloads: 0, // Placeholder
    likes: 0, // Placeholder
    views: 0, // Placeholder
    category: model.style || 'Other',
    featured: false,
    createdAt: model.created_at
  }));

  const sortedDesigns = [...userDesigns].sort((a, b) => {
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

  if (loading) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Loading Profile...</h2>
        </Card>
      </div>
    );
  }

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
                src={user.avatar_url || 'https://placehold.co/128x128?text=User'}
                alt={user.full_name}
                className="w-32 h-32 rounded-full object-cover"
              />
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                        placeholder="Full Name"
                        className="w-full text-2xl font-bold p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                      />
                      <input
                        value={editForm.avatar_url}
                        onChange={(e) => setEditForm({...editForm, avatar_url: e.target.value})}
                        placeholder="Avatar URL (optional)"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                      />
                    </div>
                  ) : (
                    <>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {user.full_name}
                      </h1>
                      <p className="text-gray-600 text-lg">{user.email}</p>
                    </>
                  )}
                </div>
                
                {isOwnProfile && (
                  <div className="flex items-center space-x-2 mt-4 md:mt-0">
                    {isEditing ? (
                      <>
                        <Button 
                          onClick={handleSave} 
                          disabled={saveLoading}
                          className="flex items-center space-x-1"
                        >
                          <Save className="h-4 w-4" />
                          <span>{saveLoading ? 'Saving...' : 'Save'}</span>
                        </Button>
                        <Button 
                          onClick={handleCancel} 
                          variant="outline"
                          className="flex items-center space-x-1"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancel</span>
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="flex items-center space-x-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit Profile</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mb-6">
                {isEditing ? (
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                  />
                ) : (
                  <p className="text-gray-700">
                    {user.bio || 'No bio provided yet.'}
                  </p>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
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
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <Card className="p-6 text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-2">{userModels.length}</div>
                    <div className="text-sm text-gray-600">Models Created</div>
                  </Card>
                  <Card className="p-6 text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-2">0</div>
                    <div className="text-sm text-gray-600">Downloads</div>
                  </Card>
                  <Card className="p-6 text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-2">0</div>
                    <div className="text-sm text-gray-600">Likes</div>
                  </Card>
                  <Card className="p-6 text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-2">0</div>
                    <div className="text-sm text-gray-600">Views</div>
                  </Card>
                </div>
              </div>
            </Card>

            {/* Achievements */}
            {/* Removed Achievements Section */}
          </div>

          {/* Designs */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Models ({userModels.length})
              </h2>
              
              <div className="flex items-center space-x-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
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

            {/* Designs Grid/List */}
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {sortedDesigns.map((design) => (
                <Card key={design.id} className="group overflow-hidden hover">
                  {viewMode === 'grid' ? (
                    <>
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={design.thumbnail}
                          alt={design.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {design.featured && (
                          <div className="absolute top-2 left-2 bg-brand-primary text-white px-2 py-1 rounded-md text-xs font-medium">
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
                            className="text-lg font-semibold text-gray-900 hover:text-brand-primary transition-colors"
                          >
                            {design.title}
                          </Link>
                          <span className="text-2xl font-bold text-brand-primary">
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
                      <div className="w-32 h-32 flex-shrink-0 overflow-hidden">
                        <img
                          src={design.thumbnail}
                          alt={design.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Link 
                                to={`/design/${design.id}`}
                                className="text-lg font-semibold text-gray-900 hover:text-brand-primary transition-colors"
                              >
                                {design.title}
                              </Link>
                              {design.featured && (
                                <span className="bg-brand-primary text-white px-2 py-1 rounded-md text-xs font-medium">
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
                            <div className="text-2xl font-bold text-brand-primary">
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