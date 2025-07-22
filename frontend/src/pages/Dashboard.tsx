import React, { useState } from 'react';
import { Upload, Download, DollarSign, Eye, Settings, Trash2 } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../supabaseClient';
import type { GeneratedModel } from '../types/model';

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

  const tabs = [
    { id: 'designs', label: 'My Designs', count: mockUserDesigns.length },
    { id: 'purchases', label: 'Purchases', count: mockPurchases.length },
    { id: 'orders', label: 'Orders', count: mockOrders.length },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Settings' }
  ];

  // Fetch current user
  const { user } = useAuth();
  const [generatedModels, setGeneratedModels] = useState<GeneratedModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    setLoadingModels(true);
    setModelsError(null);
    supabase
      .from('generated_models')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setModelsError(error.message);
          setGeneratedModels([]);
        } else {
          setGeneratedModels(data as GeneratedModel[]);
        }
        setLoadingModels(false);
      });
  }, [user]);

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
              <Button>Upload New Design</Button>
            </div>
            
            {/* Demo content grid (keep unchanged) */}
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
            {/* User's Generated Models Section */}
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Models</h3>
              {loadingModels ? (
                <div className="text-gray-500">Loading your generated models...</div>
              ) : modelsError ? (
                <div className="text-red-500">Error: {modelsError}</div>
              ) : generatedModels.length === 0 ? (
                <div className="text-gray-500">You have not generated any models yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedModels.map((model) => (
                    <Card key={model.id} className="overflow-hidden">
                      {model.thumbnail_url ? (
                        <img
                          src={model.thumbnail_url}
                          alt={model.name || 'Generated Model'}
                          className="w-full h-48 object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center bg-gray-100 text-gray-400">
                          No Thumbnail
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-md font-semibold text-gray-900">
                            {model.name || 'Untitled Model'}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            model.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : model.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {model.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <span>Created: {new Date(model.created_at).toLocaleString()}</span>
                        </div>
                        {/* Add more model info/actions here as needed */}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
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

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
            <Card className="p-6">
              <div className="text-center py-12">
                <p className="text-gray-500">Analytics dashboard coming soon...</p>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
            <Card className="p-6">
              <div className="text-center py-12">
                <p className="text-gray-500">Settings panel coming soon...</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}