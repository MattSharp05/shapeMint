import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Truck, Trash2 } from 'lucide-react';
import { OrderStatusTracker } from '../components/UI/OrderStatusTracker';
import { Button } from '../components/UI/Button';
import { Modal } from '../components/UI/Modal';
import { AutoThumbnailProgress } from '../components/UI/AutoThumbnailProgress';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/logger';
import { useAutoThumbnail } from '../hooks/useAutoThumbnail';
import { supabase } from '../supabaseClient';
import { modelService } from '../services/model';
import type { GeneratedModel } from '../types/model';
import { ContactSubmissions } from '../components/Admin/ContactSubmissions';
import { BeamsBackground } from '../components/UI/BeamsBackground';

interface Order {
  id: string;
  user_id?: string;
  vendor: string;
  order_number: string;
  vendor_order_id?: string;
  customer_name: string;
  customer_email: string;
  material_id?: string;
  quantity: number;
  status: string;
  item_subtotal?: number;
  shipping_price?: number;
  total_price?: number;
  currency?: string;
  shipping_address: {
    firstName?: string;
    lastName?: string;
    email?: string;
    address1?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
    // Legacy Slant3D format
    name?: string;
    street1?: string;
    zip?: string;
  };
  last_vendor_status?: any;
  vendor_order_raw?: any;
  created_at: string;
  shipped_at?: string;
  delivered_at?: string;
  // Joined from generated_models
  thumbnail_url?: string;
}

const VENDOR_LABELS: Record<string, string> = {
  craftcloud: 'CraftCloud',
  slant3d: 'Slant3D',
  shapeways: 'Shapeways',
  treatstock: 'Treatstock',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-900/30 text-gray-400' },
  pending_payment: { label: 'Awaiting Payment', color: 'bg-yellow-900/30 text-yellow-400' },
  submitted: { label: 'Submitted', color: 'bg-blue-900/30 text-blue-400' },
  in_production: { label: 'In Production', color: 'bg-purple-900/30 text-purple-400' },
  shipped: { label: 'Shipped', color: 'bg-green-900/30 text-green-400' },
  delivered: { label: 'Delivered', color: 'bg-green-900/30 text-green-400' },
  failed: { label: 'Failed', color: 'bg-red-900/30 text-red-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-900/30 text-red-400' },
};

function getShippingDisplay(addr: Order['shipping_address']) {
  // Handle both CraftCloud format (firstName/address1) and legacy Slant3D (name/street1)
  const name = addr?.firstName ? `${addr.firstName} ${addr.lastName || ''}`.trim() : addr?.name || '';
  const street = addr?.address1 || addr?.street1 || '';
  const city = addr?.city || '';
  const state = addr?.state || '';
  const zip = addr?.zipCode || addr?.zip || '';
  return { name, street, city, state, zip };
}

function getTrackingInfo(order: Order): { trackingNumber?: string; trackingUrl?: string } {
  const vs = order.last_vendor_status;
  if (Array.isArray(vs)) {
    for (const part of vs) {
      if (part.trackingNumber || part.trackingUrl) {
        return { trackingNumber: part.trackingNumber, trackingUrl: part.trackingUrl };
      }
    }
  } else if (vs?.trackingNumber || vs?.trackingUrl) {
    return { trackingNumber: vs.trackingNumber, trackingUrl: vs.trackingUrl };
  }
  // Legacy Slant3D format
  if (vs?.tracking_number) {
    return { trackingNumber: vs.tracking_number };
  }
  return {};
}

function getCheapestPrice(model: GeneratedModel): number | null {
  const prices: number[] = [];
  for (const q of [model.mono_quotes, model.sls_quotes]) {
    if (q?.vendors?.[0]?.totalPrice) {
      prices.push(q.vendors[0].totalPrice);
    }
  }
  return prices.length > 0 ? Math.min(...prices) : null;
}

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const gridItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 12 } },
};

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

  // Delete model state
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteModel = async (modelId: string) => {
    setDeletingModelId(modelId);
    try {
      await modelService.deleteModel(modelId);
      setGeneratedModels((prev) => prev.filter((m) => m.id !== modelId));
    } catch (err) {
      logger.error('Failed to delete model:', err);
    } finally {
      setDeletingModelId(null);
      setConfirmDeleteId(null);
    }
  };

  // Order state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [refreshingStatuses, setRefreshingStatuses] = useState(false);

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

  // Refresh CraftCloud order statuses via edge function
  const refreshCraftcloudStatuses = useCallback(async (orderList: Order[]) => {
    const craftcloudOrders = orderList.filter(
      (o) => o.vendor === 'craftcloud' && !['delivered', 'cancelled', 'failed'].includes(o.status)
    );
    if (craftcloudOrders.length === 0) return;

    setRefreshingStatuses(true);
    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-craftcloud-get-order`;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

    const results = await Promise.allSettled(
      craftcloudOrders.map((order) =>
        fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ orderId: order.id }),
        }).then((r) => r.ok ? r.json() : null)
      )
    );

    // Merge updated statuses into orders
    setOrders((prev) =>
      prev.map((order) => {
        const idx = craftcloudOrders.findIndex((o) => o.id === order.id);
        if (idx === -1) return order;
        const result = results[idx];
        if (result.status === 'fulfilled' && result.value) {
          return {
            ...order,
            status: result.value.status || order.status,
            last_vendor_status: result.value.vendorStatus,
          };
        }
        return order;
      })
    );
    setRefreshingStatuses(false);
  }, []);

  // Function to fetch orders and match thumbnails from generated models
  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;

    setLoadingOrders(true);
    setOrdersError(null);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['submitted', 'in_production', 'shipped', 'delivered'])
        .order('created_at', { ascending: false });

      if (error) {
        setOrdersError(error.message);
        setOrders([]);
        return;
      }

      // Match thumbnails: orders store file_url which corresponds to a generated model's glb_url
      const ordersWithThumbnails = (data || []).map((order: any) => {
        const matchedModel = generatedModels.find(
          (m) => m.glb_url === order.file_url || m.glb_url === order.model_url
        );
        return {
          ...order,
          thumbnail_url: matchedModel?.thumbnail_url || null,
        } as Order;
      });

      setOrders(ordersWithThumbnails);
    } catch (err) {
      setOrdersError('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.id, generatedModels]);

  // Fetch orders on mount
  useEffect(() => {
    fetchOrders();
  }, [user, fetchOrders]);

  // Auto-refresh CraftCloud statuses when switching to orders tab
  useEffect(() => {
    if (activeTab === 'orders' && orders.length > 0) {
      refreshCraftcloudStatuses(orders);
    }
  }, [activeTab]); // intentionally only on tab change

  // Refresh orders when page comes into focus
  useEffect(() => {
    const handleFocus = () => {
      fetchOrders();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, fetchOrders]);

  return (
    <BeamsBackground className="pt-16 min-h-screen bg-brand-dark" intensity="medium">
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
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                  variants={gridContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {generatedModels.map((model) => {
                    const cheapest = getCheapestPrice(model);
                    return (
                      <motion.div
                        key={model.id}
                        variants={gridItemVariants}
                        whileHover={{ y: -6 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-brand-dark-card text-center shadow-sm transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-white/10 cursor-pointer"
                        onClick={() => {
                          if (model.status === 'completed' && model.id) {
                            navigate(`/model/${model.id}`);
                          }
                        }}
                      >
                        {/* Thumbnail */}
                        <div className="relative flex w-full items-center justify-center bg-black">
                          {model.thumbnail_url ? (
                            <img
                              src={model.thumbnail_url}
                              alt={model.name || 'Generated Model'}
                              className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full aspect-square flex items-center justify-center text-white/15">
                              <div className="text-center">
                                <Package className="h-10 w-10 mx-auto mb-1" />
                                <div className="text-xs">Generating...</div>
                              </div>
                            </div>
                          )}
                          {/* Delete button overlay */}
                          <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                            {confirmDeleteId === model.id ? (
                              <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-lg p-1.5">
                                <button
                                  onClick={() => handleDeleteModel(model.id)}
                                  disabled={deletingModelId === model.id}
                                  className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                  {deletingModelId === model.id ? '...' : 'Delete'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-xs px-2 py-1 rounded bg-white/20 text-white/70 hover:bg-white/30"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(model.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-sm rounded-lg p-1.5 text-white/40 hover:text-red-400"
                                title="Delete model"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex flex-grow flex-col items-center gap-2 p-6">
                          <h3 className="font-semibold text-white text-base leading-snug line-clamp-2">
                            {model.prompt || model.name || 'Untitled Model'}
                          </h3>
                          <p className="text-sm text-white/30">
                            {new Date(model.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Price / Status footer */}
                        <div className="px-6 pb-6">
                          {model.status === 'completed' && cheapest ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-2xl font-bold text-brand-accent">${cheapest.toFixed(2)}</span>
                              <span className="text-xs text-white/30 uppercase tracking-wider">Starting at</span>
                            </div>
                          ) : (
                            <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium ${
                              model.status === 'completed'
                                ? 'bg-green-900/30 text-green-400'
                                : model.status === 'processing'
                                ? 'bg-yellow-900/30 text-yellow-400'
                                : 'bg-red-900/30 text-red-400'
                            }`}>
                              {model.status}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                Your Manufacturing Orders
                {refreshingStatuses && (
                  <span className="ml-3 text-sm font-normal text-white/40">Updating statuses...</span>
                )}
              </h2>
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
                {orders.map((order) => {
                  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const tracking = getTrackingInfo(order);
                  return (
                    <div
                      key={order.id}
                      className="card-glow rounded-2xl bg-brand-dark-card p-6 cursor-pointer border-l-4 border-l-brand-accent"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsOrderModalOpen(true);
                      }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        {order.thumbnail_url ? (
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-dark-lighter shrink-0">
                            <img
                              src={order.thumbnail_url}
                              alt="Model"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-brand-dark-lighter shrink-0 flex items-center justify-center">
                            <Package className="h-8 w-8 text-white/15" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold text-white truncate">
                              Order #{order.order_number || order.vendor_order_id || order.id.slice(0, 8)}
                            </h3>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium shrink-0 ml-2 ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-white/40">
                            <div>Vendor: {VENDOR_LABELS[order.vendor] || order.vendor}</div>
                            <div>Quantity: {order.quantity}</div>
                            <div>Ordered: {new Date(order.created_at).toLocaleDateString()}</div>
                            {order.total_price != null && (
                              <div>Total: ${Number(order.total_price).toFixed(2)} {order.currency || 'USD'}</div>
                            )}
                          </div>
                          {tracking.trackingNumber && (
                            <div className="flex items-center gap-1 mt-2 text-sm text-green-400">
                              <Truck className="h-3 w-3" />
                              <span>Tracking: {tracking.trackingNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        {selectedOrder && (() => {
          const shipping = getShippingDisplay(selectedOrder.shipping_address);
          const statusCfg = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending;
          const tracking = getTrackingInfo(selectedOrder);

          const summaryLines = [
            { label: 'Order ID', value: selectedOrder.order_number || selectedOrder.vendor_order_id || selectedOrder.id.slice(0, 8) },
            { label: 'Vendor', value: VENDOR_LABELS[selectedOrder.vendor] || selectedOrder.vendor },
            { label: 'Order Date', value: new Date(selectedOrder.created_at).toLocaleDateString() },
            { label: 'Quantity', value: String(selectedOrder.quantity) },
            ...(shipping.name ? [{ label: 'Ship To', value: `${shipping.name}${shipping.city ? `, ${shipping.city}` : ''}` }] : []),
            ...(selectedOrder.item_subtotal != null ? [{ label: 'Subtotal', value: `$${Number(selectedOrder.item_subtotal).toFixed(2)}` }] : []),
            ...(selectedOrder.shipping_price != null ? [{ label: 'Shipping', value: `$${Number(selectedOrder.shipping_price).toFixed(2)}` }] : []),
            ...(selectedOrder.total_price != null ? [{ label: 'Total', value: `$${Number(selectedOrder.total_price).toFixed(2)} ${selectedOrder.currency || 'USD'}` }] : []),
          ];

          const statusDescriptions: Record<string, string> = {
            submitted: 'Your order has been submitted to the manufacturer.',
            in_production: 'Your model is currently being printed.',
            shipped: 'Your package is on the way!',
            delivered: 'Your package has been delivered.',
            failed: 'There was an issue with your order.',
            cancelled: 'This order has been cancelled.',
          };

          return (
            <Modal
              isOpen={isOrderModalOpen}
              onClose={() => setIsOrderModalOpen(false)}
            >
              <OrderStatusTracker
                thumbnailUrl={selectedOrder.thumbnail_url}
                statusTitle={statusCfg.label}
                statusDescription={statusDescriptions[selectedOrder.status] || 'Order is being processed.'}
                itemName={`Order #${selectedOrder.order_number || selectedOrder.vendor_order_id || selectedOrder.id.slice(0, 8)}`}
                itemDetails={`${VENDOR_LABELS[selectedOrder.vendor] || selectedOrder.vendor} · Qty ${selectedOrder.quantity}`}
                itemPrice={selectedOrder.total_price != null ? `$${Number(selectedOrder.total_price).toFixed(2)}` : undefined}
                summary={summaryLines}
                trackingNumber={tracking.trackingNumber}
                trackingUrl={tracking.trackingUrl}
                trackingStatus={
                  tracking.trackingNumber
                    ? 'Your order is confirmed and in transit'
                    : selectedOrder.status === 'shipped'
                    ? 'Shipped — tracking info incoming'
                    : undefined
                }
                onTrackOrder={
                  tracking.trackingUrl
                    ? () => window.open(tracking.trackingUrl!, '_blank')
                    : tracking.trackingNumber
                    ? () => window.open(`https://tools.usps.com/go/TrackConfirmAction?tLabels=${tracking.trackingNumber}`, '_blank')
                    : undefined
                }
                onClose={() => setIsOrderModalOpen(false)}
              />
            </Modal>
          );
        })()}

        {/* Auto-Thumbnail Progress */}
        <AutoThumbnailProgress
          progress={autoThumbnailProgress}
          onStop={stopGeneration}
          onRetry={triggerAutoGeneration}
        />
      </div>
    </BeamsBackground>
  );
}
