import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
    <div className="pt-16 min-h-screen bg-brand-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Dashboard
              </h1>
              <p className="text-xl text-white/40">
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
                <span className="text-xs text-white/40">
                  {autoThumbnailProgress.processed}/{autoThumbnailProgress.total} processed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-brand-accent text-brand-accent'
                    : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 bg-white/10 text-white/70 py-0.5 px-2 rounded-full text-xs">
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
                    ? 'border-brand-accent text-brand-accent'
                    : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
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
              <h3 className="text-lg font-semibold text-white mb-4">Your Designs</h3>
              {loadingModels ? (
                <div className="text-white/40">Loading your generated models...</div>
              ) : modelsError ? (
                <div className="text-red-400">Error: {modelsError}</div>
              ) : generatedModels.length === 0 ? (
                <div className="text-white/40">You have not generated any models yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedModels.map((model) => (
                    <div
                      key={model.id}
                      className="group card-glow rounded-2xl overflow-hidden bg-brand-dark-card cursor-pointer"
                      onClick={() => {
                        if (model.status === 'completed' && model.id) {
                          navigate(`/model/${model.id}`);
                        }
                      }}
                    >
                      {model.thumbnail_url ? (
                        <div className="aspect-square overflow-hidden bg-brand-dark-lighter">
                          <img
                            src={model.thumbnail_url}
                            alt={model.name || 'Generated Model'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square flex items-center justify-center bg-brand-dark-lighter text-white/20">
                          <div className="text-center">
                            <div className="text-sm font-medium">No Thumbnail</div>
                            <div className="text-xs text-white/15">Generating...</div>
                          </div>
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-md font-semibold text-white">
                            {model.prompt || model.name || 'Untitled Model'}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            model.status === 'completed'
                              ? 'bg-green-900/30 text-green-400'
                              : model.status === 'processing'
                              ? 'bg-yellow-900/30 text-yellow-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}>
                            {model.status}
                          </span>
                        </div>
                        <div className="text-sm text-white/30 mb-2">
                          <span>Created: {new Date(model.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Your Manufacturing Orders</h2>
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto mb-4"></div>
                <p className="text-white/40">Loading your orders...</p>
              </div>
            ) : ordersError ? (
              <div className="card-glow rounded-2xl bg-brand-dark-card p-6">
                <div className="text-center text-red-400">
                  Error loading orders: {ordersError}
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="card-glow rounded-2xl bg-brand-dark-card p-6">
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No orders yet</h3>
                  <p className="text-white/40">Your manufacturing orders will appear here</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="card-glow rounded-2xl bg-brand-dark-card p-6 cursor-pointer border-l-4 border-l-brand-accent"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsOrderModalOpen(true);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {order.filename}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-white/40">
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
                            ? 'bg-green-900/30 text-green-400'
                            : order.shipping_status === 'awaiting_shipment'
                            ? 'bg-yellow-900/30 text-yellow-400'
                            : 'bg-blue-900/30 text-blue-400'
                        }`}>
                          {order.shipping_status === 'shipped' || (order.tracking_numbers && order.tracking_numbers.length > 0) ? 'Shipped' :
                           order.shipping_status === 'awaiting_shipment' ? 'Processing' :
                           order.status}
                        </span>
                        <div className="text-lg font-bold text-white mt-2">
                          Order #{order.slant_order_id}
                        </div>
                      </div>
                    </div>
                  </div>
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
