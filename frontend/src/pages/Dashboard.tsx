import React, { useState } from 'react';
import { Upload, Download, DollarSign, Eye, Settings, Trash2, User, Mail, Bell, Shield, CreditCard, Globe, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';

const mockUserDesigns = [
  {
    id: '1',
    title: 'My Coffee Mug Design',
    thumbnail: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400',
    status: 'listed',
    price: 15.99,
    downloads: 23,
    earnings: 184.77,
    createdAt: '2025-01-15'
  },
  {
    id: '2',
    title: 'Abstract Sculpture',
    thumbnail: 'https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg?auto=compress&cs=tinysrgb&w=400',
    status: 'draft',
    price: 0,
    downloads: 0,
    earnings: 0,
    createdAt: '2025-01-12'
  }
];

const mockPurchases = [
  {
    id: '1',
    title: 'Geometric Vase',
    thumbnail: 'https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg?auto=compress&cs=tinysrgb&w=400',
    price: 18.50,
    purchasedAt: '2025-01-14',
    seller: 'ArtisticMind'
  }
];

const mockOrders = [
  {
    id: '1',
    design: 'Phone Stand',
    vendor: 'PrintCraft Pro',
    status: 'manufacturing',
    total: 34.38,
    orderedAt: '2025-01-13',
    estimatedDelivery: '2025-01-18'
  }
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('designs');
  const { user } = useAuth();
  const { favorites, removeFromFavorites } = useFavorites();
  const [accountSettings, setAccountSettings] = useState({
    email: user?.email || '',
    name: user?.name || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    marketingEmails: false,
    orderUpdates: true,
    newFollowers: true,
    profileVisibility: 'public' as 'public' | 'private',
    showEmail: false,
    showLocation: true
  });

  const tabs = [
    { id: 'designs', label: 'My Designs', count: mockUserDesigns.length },
    { id: 'favorites', label: 'Favorites', count: favorites.length },
    { id: 'purchases', label: 'Purchases', count: mockPurchases.length },
    { id: 'orders', label: 'Orders', count: mockOrders.length },
    { id: 'settings', label: 'Account Settings' }
  ];

  const handleRemoveFavorite = (designId: string) => {
    removeFromFavorites(designId);
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to the backend
    alert('Settings saved successfully!');
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Manage your designs, purchases, and manufacturing orders
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Designs</p>
                <p className="text-2xl font-bold text-gray-900">{mockUserDesigns.length}</p>
              </div>
              <Upload className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Downloads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockUserDesigns.reduce((sum, design) => sum + design.downloads, 0)}
                </p>
              </div>
              <Download className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${mockUserDesigns.reduce((sum, design) => sum + design.earnings, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Profile Views</p>
                <p className="text-2xl font-bold text-gray-900">1,234</p>
              </div>
              <Eye className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
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
                {tab.count !== undefined && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'designs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">My Designs</h2>
              <Link to="/generate">
                <Button>Upload New Design</Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockUserDesigns.map((design) => (
                <Card key={design.id} className="overflow-hidden">
                  <img
                    src={design.thumbnail}
                    alt={design.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {design.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        design.status === 'listed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {design.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Price:</span>
                        <span>${design.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Downloads:</span>
                        <span>{design.downloads}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Earnings:</span>
                        <span>${design.earnings.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Settings className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">My Favorites</h2>
            
            {favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((favorite) => (
                  <Card key={favorite.id} className="overflow-hidden hover">
                    <div className="relative">
                      <img
                        src={favorite.thumbnail}
                        alt={favorite.title}
                        className="w-full h-48 object-cover"
                      />
                      <button
                        onClick={() => handleRemoveFavorite(favorite.id)}
                        className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                        title="Remove from favorites"
                      >
                        <Heart className="h-4 w-4 text-red-500 fill-current" />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <Link 
                          to={`/design/${favorite.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-purple-600 transition-colors"
                        >
                          {favorite.title}
                        </Link>
                        <span className="text-2xl font-bold text-purple-600">
                          ${favorite.price}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        {favorite.description}
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {favorite.category}
                        </span>
                        <Link 
                          to={`/creator/${favorite.userName}`}
                          className="text-xs text-gray-500 hover:text-purple-600 transition-colors"
                        >
                          by {favorite.userName}
                        </Link>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Download className="h-3 w-3" />
                            <span>{favorite.downloads}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Heart className="h-3 w-3" />
                            <span>{favorite.likes}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Link to={`/download-checkout`} state={{
                          modelData: {
                            designId: favorite.id,
                            designTitle: favorite.title,
                            designDescription: favorite.description,
                            creator: favorite.userName,
                            isMarketplaceItem: true
                          },
                          modelUrl: `mock-model-url-${favorite.id}`,
                          price: favorite.price,
                          isGenerated: false
                        }}>
                          <Button size="sm" className="w-full">
                            <Download className="h-3 w-3 mr-1" />
                            Buy Digital Files
                          </Button>
                        </Link>
                        <Link to={`/order`} state={{
                          modelData: {
                            prompt: favorite.title,
                            settings: {
                              style: 'realistic',
                              quality: 'high',
                              size: 'medium'
                            },
                            isMarketplaceItem: true,
                            designId: favorite.id,
                            designTitle: favorite.title,
                            designDescription: favorite.description,
                            creator: favorite.userName
                          },
                          modelUrl: `mock-model-url-${favorite.id}`
                        }}>
                          <Button size="sm" variant="outline" className="w-full">
                            Order Physical Print
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <Heart className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
                <p className="text-gray-500 mb-6">
                  Heart designs on the marketplace to save them here for easy access.
                </p>
                <Link to="/marketplace">
                  <Button>
                    Browse Marketplace
                  </Button>
                </Link>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">My Purchases</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockPurchases.map((purchase) => (
                <Card key={purchase.id} className="overflow-hidden">
                  <img
                    src={purchase.thumbnail}
                    alt={purchase.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {purchase.title}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      <div className="flex justify-between">
                        <span>Price:</span>
                        <span>${purchase.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Seller:</span>
                        <span>{purchase.seller}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Purchased:</span>
                        <span>{purchase.purchasedAt}</span>
                      </div>
                    </div>
                    <Button size="sm" className="w-full">
                      <Download className="h-3 w-3 mr-1" />
                      Download Files
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Manufacturing Orders</h2>
            
            <div className="space-y-4">
              {mockOrders.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {order.design}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>Vendor: {order.vendor}</div>
                        <div>Order Date: {order.orderedAt}</div>
                        <div>Estimated Delivery: {order.estimatedDelivery}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'manufacturing' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.status}
                      </span>
                      <div className="text-lg font-bold text-gray-900 mt-2">
                        ${order.total}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
            
            {/* Account Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Account Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  value={accountSettings.name}
                  onChange={(e) => setAccountSettings({...accountSettings, name: e.target.value})}
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={accountSettings.email}
                  onChange={(e) => setAccountSettings({...accountSettings, email: e.target.value})}
                />
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">Change Password</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Current Password"
                    type="password"
                    value={accountSettings.currentPassword}
                    onChange={(e) => setAccountSettings({...accountSettings, currentPassword: e.target.value})}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={accountSettings.newPassword}
                    onChange={(e) => setAccountSettings({...accountSettings, newPassword: e.target.value})}
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={accountSettings.confirmPassword}
                    onChange={(e) => setAccountSettings({...accountSettings, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
            </Card>

            {/* Notification Settings */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Email Notifications</h4>
                    <p className="text-sm text-gray-500">Receive notifications about your account activity</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountSettings.emailNotifications}
                      onChange={(e) => setAccountSettings({...accountSettings, emailNotifications: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Order Updates</h4>
                    <p className="text-sm text-gray-500">Get notified about manufacturing and shipping updates</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountSettings.orderUpdates}
                      onChange={(e) => setAccountSettings({...accountSettings, orderUpdates: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">New Followers</h4>
                    <p className="text-sm text-gray-500">Be notified when someone follows your profile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountSettings.newFollowers}
                      onChange={(e) => setAccountSettings({...accountSettings, newFollowers: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Marketing Emails</h4>
                    <p className="text-sm text-gray-500">Receive updates about new features and promotions</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountSettings.marketingEmails}
                      onChange={(e) => setAccountSettings({...accountSettings, marketingEmails: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </Card>

            {/* Privacy Settings */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Privacy Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    value={accountSettings.profileVisibility}
                    onChange={(e) => setAccountSettings({...accountSettings, profileVisibility: e.target.value as 'public' | 'private'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="public">Public - Anyone can view your profile</option>
                    <option value="private">Private - Only you can view your profile</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Show Email Address</h4>
                    <p className="text-sm text-gray-500">Display your email on your public profile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountSettings.showEmail}
                      onChange={(e) => setAccountSettings({...accountSettings, showEmail: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Show Location</h4>
                    <p className="text-sm text-gray-500">Display your location on your public profile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountSettings.showLocation}
                      onChange={(e) => setAccountSettings({...accountSettings, showLocation: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </Card>

            {/* Billing Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Billing Information
              </h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Payment Method</h4>
                      <p className="text-sm text-gray-500">•••• •••• •••• 4242</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Billing Address</h4>
                      <p className="text-sm text-gray-500">123 Main St, San Francisco, CA 94105</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} className="px-8">
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}