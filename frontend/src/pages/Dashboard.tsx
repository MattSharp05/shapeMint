import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Download, DollarSign, Eye, Settings, Package, Truck, ExternalLink } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Modal } from '../components/UI/Modal';
import { AutoThumbnailProgress } from '../components/UI/AutoThumbnailProgress';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/logger';
import { useAutoThumbnail } from '../hooks/useAutoThumbnail';
import { supabase } from '../supabaseClient';
import { autoThumbnailService } from '../services/autoThumbnailService';
import type { GeneratedModel } from '../types/model';
import { ContactSubmissions } from '../components/Admin/ContactSubmissions';

interface Order {
  id: string;
  user_id?: string;
  slant_order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  filename: string;
  quantity: number;
  color: string;
  profile: string;
  status: string;
  tracking_numbers?: string[];
  shipping_status: string;
  label_download_url?: string;
  shipping_address: {
    name: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
  };
  created_at: string;
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('designs');

  const { user } = useAuth();

  const {
    progress: autoThumbnailProgress,
    triggerAutoGeneration,
    stopGeneration
  } = useAutoThumbnail({
    triggerOnMount: true
  });

  const [generatedModels, setGeneratedModels] = useState<GeneratedModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Order state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const tabs = [
    { id: 'designs', label: 'My Designs', count: generatedModels.length },
    { id: 'orders', label: 'Orders', count: orders.length }
  ];

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
  }, [user?.id]);

  // Function to fetch orders filtered by user email
  const fetchOrders = useCallback(async () => {
    if (!user?.email) return;

    setLoadingOrders(true);
    setOrdersError(null);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false });

      if (error) {
        setOrdersError(error.message);
        setOrders([]);
      } else {
        setOrders(data as Order[]);
      }
    } catch (err) {
      setOrdersError('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.email]);

  // Fetch orders on mount
  useEffect(() => {
    fetchOrders();
  }, [user, fetchOrders]);

  // Refresh orders when page comes into focus
  useEffect(() => {
    const handleFocus = () => {
      fetchOrders();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, fetchOrders]);

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Dashboard
              </h1>
              <p className="text-xl text-gray-600">
                Manage your designs and manufacturing orders
              </p>
            </div>

            {/* Thumbnail Generation */}
            <div className="flex flex-col items-end space-y-2">
              <Button
                onClick={triggerAutoGeneration}
                disabled={autoThumbnailProgress.isGenerating}
                variant="outline"
                className="text-sm"
              >
                {autoThumbnailProgress.isGenerating ? 'Generating...' : 'Generate Thumbnails'}
              </Button>
              {autoThumbnailProgress.total > 0 && (
                <span className="text-xs text-gray-500">
                  {autoThumbnailProgress.processed}/{autoThumbnailProgress.total} processed
                </span>
              )}
            </div>
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
                    ? 'border-brand-primary text-brand-primary'
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
            {/* Contact Submissions Tab - Only show for admin users */}
            {(user?.email === 'admin@shapemint.com' || user?.email === 'subhan.shaikh.me@gmail.com') && (
              <button
                onClick={() => setActiveTab('contact-submissions')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'contact-submissions'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Contact Submissions
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'designs' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Designs</h3>
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
                          <div className="text-center">
                            <div className="text-sm font-medium">No Thumbnail</div>
                            <div className="text-xs text-gray-500">Generating...</div>
                          </div>
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-md font-semibold text-gray-900">
                            {model.prompt || model.name || 'Untitled Model'}
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
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Your Manufacturing Orders</h2>
              <Button
                onClick={fetchOrders}
                disabled={loadingOrders}
                variant="outline"
                size="sm"
              >
                {loadingOrders ? 'Refreshing...' : 'Refresh Orders'}
              </Button>
            </div>

            {loadingOrders ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
                <p className="text-gray-500">Loading your orders...</p>
              </div>
            ) : ordersError ? (
              <Card className="p-6">
                <div className="text-center text-red-600">
                  Error loading orders: {ordersError}
                </div>
              </Card>
            ) : orders.length === 0 ? (
              <Card className="p-6">
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                  <p className="text-gray-500">Your manufacturing orders will appear here</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card
                    key={order.id}
                    className="p-6 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-brand-primary"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsOrderModalOpen(true);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {order.filename}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <div>Vendor: Slant3D</div>
                            <div>Order Date: {new Date(order.created_at).toLocaleDateString()}</div>
                            <div>Quantity: {order.quantity}</div>
                          </div>
                          <div>
                            <div>Material: {order.profile}</div>
                            <div>Color: {order.color}</div>
                            {order.tracking_numbers && order.tracking_numbers.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Truck className="h-3 w-3" />
                                <span>Tracking Available</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          order.shipping_status === 'shipped' || (order.tracking_numbers && order.tracking_numbers.length > 0)
                            ? 'bg-green-100 text-green-800'
                            : order.shipping_status === 'awaiting_shipment'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {order.shipping_status === 'shipped' || (order.tracking_numbers && order.tracking_numbers.length > 0) ? 'Shipped' :
                           order.shipping_status === 'awaiting_shipment' ? 'Processing' :
                           order.status}
                        </span>
                        <div className="text-lg font-bold text-gray-900 mt-2">
                          Order #{order.slant_order_id}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contact Submissions Tab */}
        {activeTab === 'contact-submissions' && (
          <div className="space-y-6">
            <ContactSubmissions />
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <Modal
            isOpen={isOrderModalOpen}
            onClose={() => setIsOrderModalOpen(false)}
            title={`Order #${selectedOrder.slant_order_id}`}
          >
            <div className="space-y-6">
              {/* Order Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Item:</span>
                    <span className="font-medium">{selectedOrder.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{selectedOrder.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Material:</span>
                    <span className="font-medium">{selectedOrder.profile}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Color:</span>
                    <span className="font-medium">{selectedOrder.color}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Date:</span>
                    <span className="font-medium">{new Date(selectedOrder.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Shipping Address</h3>
                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <div>{selectedOrder.shipping_address.name}</div>
                  <div>{selectedOrder.shipping_address.street1}</div>
                  <div>
                    {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.zip}
                  </div>
                </div>
              </div>

              {/* Tracking Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tracking & Status</h3>
                <div className={`rounded-lg p-4 ${
                  selectedOrder.tracking_numbers && selectedOrder.tracking_numbers.length > 0 ? 'bg-green-50' : 'bg-yellow-50'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Truck className="h-4 w-4" />
                    <span className="font-medium">
                      Shipping Status
                    </span>
                  </div>

                  {selectedOrder.tracking_numbers && selectedOrder.tracking_numbers.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Tracking Numbers:</div>
                      {selectedOrder.tracking_numbers.map((trackingNumber, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                          <code className="text-sm">{trackingNumber}</code>
                          <a
                            href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-brand-primary hover:text-brand-primary-dark text-sm"
                          >
                            <span>Track with USPS</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Your order is being prepared for shipment. Tracking information will be available once shipped.
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                {selectedOrder.tracking_numbers && selectedOrder.tracking_numbers.length > 0 && (
                  <Button
                    onClick={() => window.open(`https://tools.usps.com/go/TrackConfirmAction?tLabels=${selectedOrder.tracking_numbers![0]}`, '_blank')}
                    className="flex-1"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Track Package
                  </Button>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Auto-Thumbnail Progress */}
        <AutoThumbnailProgress
          progress={autoThumbnailProgress}
          onStop={stopGeneration}
          onRetry={triggerAutoGeneration}
        />
      </div>
    </div>
  );
}
