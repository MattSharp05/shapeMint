import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Box,
  ShoppingCart,
  Users,
  MessageSquare,
  Search,
  ChevronLeft,
  RefreshCw,
  ChevronRight,
  Download,
  Eye,
  X,
  Package,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/UI/Button';
import { BeamsBackground } from '../components/UI/BeamsBackground';
import { ModelViewer } from '../components/3D/ModelViewer';
import { Modal } from '../components/UI/Modal';
import { ContactSubmissions } from '../components/Admin/ContactSubmissions';
import { adminService, AdminModel, AdminOrder, AdminUser, PAGE_SIZE } from '../services/adminService';
import { downloadService } from '../services/downloadService';
import { supabase } from '../supabaseClient';

const ADMIN_PASSWORD = 'ShapeMintAdmin123';

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const VENDOR_LABELS: Record<string, string> = {
  craftcloud: 'CraftCloud',
  slant3d: 'Slant3D',
  shapeways: 'Shapeways',
  treatstock: 'Treatstock',
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-900/30 text-green-400',
  processing: 'bg-yellow-900/30 text-yellow-400',
  pending: 'bg-gray-900/30 text-gray-400',
  failed: 'bg-red-900/30 text-red-400',
  submitted: 'bg-blue-900/30 text-blue-400',
  in_production: 'bg-purple-900/30 text-purple-400',
  shipped: 'bg-green-900/30 text-green-400',
  delivered: 'bg-green-900/30 text-green-400',
  cancelled: 'bg-red-900/30 text-red-400',
};

function PasswordGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true');
      onAuthenticated();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <BeamsBackground className="pt-16 min-h-screen bg-brand-dark" intensity="medium">
      <div className="flex items-center justify-center min-h-[80vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-dark-card border border-white/10 rounded-2xl p-8 w-full max-w-sm"
        >
          <div className="text-center mb-6">
            <Lock className="h-10 w-10 text-brand-accent mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Admin Access</h1>
            <p className="text-white/40 text-sm mt-1">Enter password to continue</p>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Password"
              className="w-full px-4 py-3 bg-brand-dark border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-accent/50 mb-4"
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mb-3">Incorrect password</p>
            )}
            <Button type="submit" fullWidth>
              Enter
            </Button>
          </form>
        </motion.div>
      </div>
    </BeamsBackground>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-6">
      <span className="text-sm text-white/40">
        Page {page + 1} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ModelsTab({ onFilterUser }: { onFilterUser: (userId: string) => void }) {
  const [models, setModels] = useState<AdminModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewingModel, setViewingModel] = useState<AdminModel | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.fetchModels(page, {
        status: statusFilter,
        search: search || undefined,
      });
      setModels(result.data);
      setTotalCount(result.count);
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  const handleDownload = async (model: AdminModel, format: 'glb' | 'stl' | 'obj') => {
    const urlMap = { glb: model.glb_url, stl: model.stl_url, obj: model.obj_url };
    const url = urlMap[format];
    if (!url) return;
    setDownloading(`${model.id}-${format}`);
    try {
      const name = (model.prompt || model.name || 'model').replace(/[^a-zA-Z0-9]/g, '_');
      await downloadService.downloadFile(url, `${name}.${format}`);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              placeholder="Search by prompt..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-brand-dark border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-accent/50 text-sm"
            />
          </div>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-4 py-2.5 bg-brand-dark border border-white/10 rounded-xl text-white/70 text-sm focus:outline-none focus:border-brand-accent/50"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
        <span className="flex items-center text-sm text-white/40">
          {totalCount} total
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto mb-4" />
          <p className="text-white/40">Loading models...</p>
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No models found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/50 font-medium">Prompt</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">User</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Print Ready</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Date</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {model.thumbnail_url ? (
                        <img src={model.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-brand-dark-lighter" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-brand-dark-lighter flex items-center justify-center">
                          <Package className="h-5 w-5 text-white/15" />
                        </div>
                      )}
                      <span className="text-white max-w-[200px] truncate" title={model.prompt || model.name}>
                        {model.prompt || model.name || 'Untitled'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onFilterUser(model.user_id)}
                      className="text-white/60 hover:text-brand-accent transition-colors text-left"
                      title={model.user_email || model.user_id}
                    >
                      {model.user_email || model.user_id.slice(0, 8)}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[model.status] || STATUS_COLORS.pending}`}>
                      {model.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {model.print_ready != null && (
                      <span className={model.print_ready ? 'text-green-400' : 'text-white/30'}>
                        {model.print_ready ? 'Yes' : 'No'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-white/40">
                    {formatDateTime(model.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      {model.glb_url && (
                        <button
                          onClick={() => setViewingModel(model)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5"
                          title="View 3D model"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {model.glb_url && (
                        <button
                          onClick={() => handleDownload(model, 'glb')}
                          disabled={downloading === `${model.id}-glb`}
                          className="p-1.5 rounded-lg text-white/40 hover:text-brand-accent hover:bg-white/5 disabled:opacity-30"
                          title="Download GLB"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      {model.stl_url && (
                        <button
                          onClick={() => handleDownload(model, 'stl')}
                          disabled={downloading === `${model.id}-stl`}
                          className="px-2 py-1 rounded-lg text-xs text-white/40 hover:text-brand-accent hover:bg-white/5 disabled:opacity-30"
                          title="Download STL"
                        >
                          STL
                        </button>
                      )}
                      {model.obj_url && (
                        <button
                          onClick={() => handleDownload(model, 'obj')}
                          disabled={downloading === `${model.id}-obj`}
                          className="px-2 py-1 rounded-lg text-xs text-white/40 hover:text-brand-accent hover:bg-white/5 disabled:opacity-30"
                          title="Download OBJ"
                        >
                          OBJ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Model Viewer Modal */}
      {viewingModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setViewingModel(null)}>
          <div
            className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-white font-semibold truncate max-w-md">
                  {viewingModel.prompt || viewingModel.name || 'Untitled'}
                </h3>
                <p className="text-white/40 text-sm">{viewingModel.user_email}</p>
              </div>
              <div className="flex items-center gap-2">
                {viewingModel.glb_url && (
                  <button
                    onClick={() => handleDownload(viewingModel, 'glb')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-brand-accent border border-brand-accent/30 hover:bg-brand-accent/10"
                  >
                    <Download className="h-3.5 w-3.5" />
                    GLB
                  </button>
                )}
                {viewingModel.stl_url && (
                  <button
                    onClick={() => handleDownload(viewingModel, 'stl')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-white/60 border border-white/10 hover:bg-white/5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    STL
                  </button>
                )}
                <button
                  onClick={() => setViewingModel(null)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <ModelViewer
              modelUrl={viewingModel.glb_url}
              className="w-full h-[500px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab({ userFilter, onClearUserFilter }: { userFilter?: string; onClearUserFilter: () => void }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.fetchOrders(page, {
        status: statusFilter,
        vendor: vendorFilter,
        search: search || undefined,
      });
      let data = result.data;
      if (userFilter) {
        data = data.filter((o) => o.user_id === userFilter);
      }
      setOrders(data);
      setTotalCount(userFilter ? data.length : result.count);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, vendorFilter, search, userFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  return (
    <div>
      {/* User filter banner */}
      {userFilter && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-brand-accent/10 border border-brand-accent/20 rounded-xl">
          <span className="text-sm text-brand-accent">Filtering by user</span>
          <button onClick={onClearUserFilter} className="text-brand-accent hover:text-brand-accent-light">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              placeholder="Search by order number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-brand-dark border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-accent/50 text-sm"
            />
          </div>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-4 py-2.5 bg-brand-dark border border-white/10 rounded-xl text-white/70 text-sm focus:outline-none focus:border-brand-accent/50"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="in_production">In Production</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={vendorFilter}
          onChange={(e) => { setVendorFilter(e.target.value); setPage(0); }}
          className="px-4 py-2.5 bg-brand-dark border border-white/10 rounded-xl text-white/70 text-sm focus:outline-none focus:border-brand-accent/50"
        >
          <option value="all">All Vendors</option>
          <option value="craftcloud">CraftCloud</option>
          <option value="slant3d">Slant3D</option>
          <option value="shapeways">Shapeways</option>
          <option value="treatstock">Treatstock</option>
        </select>
        <span className="flex items-center text-sm text-white/40">
          {totalCount} total
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto mb-4" />
          <p className="text-white/40">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No orders found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/50 font-medium">Order #</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">User</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Vendor</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Qty</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Total</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Date</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr
                    className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <td className="py-3 px-4 text-white font-mono">
                      {order.order_number || order.vendor_order_id || order.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-white/60">
                      {order.user_email || order.user_id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-white/60">
                      {VENDOR_LABELS[order.vendor] || order.vendor}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/60">{order.quantity}</td>
                    <td className="py-3 px-4 text-white">
                      {order.total_price != null ? `$${Number(order.total_price).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-white/40">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  {expandedOrder === order.id && (
                    <tr className="border-b border-white/5">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="bg-brand-dark rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-white/40 mb-1">Shipping Address</p>
                            {order.shipping_address ? (
                              <div className="text-white/70">
                                <p>{order.shipping_address.firstName} {order.shipping_address.lastName || order.shipping_address.name}</p>
                                <p>{order.shipping_address.address1 || order.shipping_address.street1}</p>
                                <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zipCode || order.shipping_address.zip}</p>
                              </div>
                            ) : (
                              <p className="text-white/30">N/A</p>
                            )}
                          </div>
                          <div>
                            <p className="text-white/40 mb-1">Pricing</p>
                            <div className="text-white/70 space-y-1">
                              {order.item_subtotal != null && <p>Subtotal: ${Number(order.item_subtotal).toFixed(2)}</p>}
                              {order.shipping_price != null && <p>Shipping: ${Number(order.shipping_price).toFixed(2)}</p>}
                              {order.total_price != null && <p className="text-white font-medium">Total: ${Number(order.total_price).toFixed(2)} {order.currency || 'USD'}</p>}
                            </div>
                          </div>
                          <div>
                            <p className="text-white/40 mb-1">Dates</p>
                            <div className="text-white/70 space-y-1">
                              <p>Created: {formatDateTime(order.created_at)}</p>
                              {order.submitted_at && <p>Submitted: {formatDateTime(order.submitted_at)}</p>}
                              {order.shipped_at && <p>Shipped: {formatDateTime(order.shipped_at)}</p>}
                              {order.delivered_at && <p>Delivered: {formatDateTime(order.delivered_at)}</p>}
                            </div>
                          </div>
                          {order.vendor_order_id && (
                            <div className="md:col-span-3">
                              <p className="text-white/40 mb-1">Vendor Order ID</p>
                              <p className="text-white/70 font-mono">{order.vendor_order_id}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function UsersTab({ onFilterUser }: { onFilterUser: (userId: string) => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.fetchUsers(page, search || undefined);
      setUsers(result.data);
      setTotalCount(result.count);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  return (
    <div>
      {/* Search */}
      <div className="flex flex-wrap gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-brand-dark border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-accent/50 text-sm"
            />
          </div>
        </form>
        <span className="flex items-center text-sm text-white/40">
          {totalCount} total
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto mb-4" />
          <p className="text-white/40">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No users found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/50 font-medium">Email</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Name</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Models</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Orders</th>
                <th className="text-left py-3 px-4 text-white/50 font-medium">Joined</th>
                <th className="text-right py-3 px-4 text-white/50 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-white">{user.email}</td>
                  <td className="py-3 px-4 text-white/60">{user.full_name || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-white/60">
                      <Box className="h-3.5 w-3.5" />
                      {user.model_count}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-white/60">
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {user.order_count}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/40">
                    {user.created_at ? formatDateTime(user.created_at) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onFilterUser(user.id)}
                      className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-brand-accent hover:bg-white/5 border border-white/10"
                    >
                      View Activity
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('admin_auth') === 'true'
  );
  const [activeTab, setActiveTab] = useState('models');
  const [userFilter, setUserFilter] = useState<string | undefined>();
  const [backfillStatus, setBackfillStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const handleFilterUser = (userId: string) => {
    setUserFilter(userId);
    setActiveTab('orders');
  };

  const handleBackfillThumbnails = async () => {
    setBackfillStatus('running');
    setBackfillResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const resp = await fetch(`${supabaseUrl}/functions/v1/backfill-thumbnails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      const data = await resp.json();
      if (data.error) {
        setBackfillStatus('error');
        setBackfillResult(`Error: ${data.error}`);
      } else {
        const r = data.results;
        setBackfillStatus('done');
        setBackfillResult(
          `Migrated: ${r.migrated} | Expired (cleared): ${r.expired_regenerated} | Failed: ${r.failed} | Already OK: ${r.already_ok}`
        );
      }
    } catch (err: any) {
      setBackfillStatus('error');
      setBackfillResult(`Error: ${err.message}`);
    }
  };

  if (!authenticated) {
    return <PasswordGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  const tabs = [
    { id: 'models', label: 'Models', icon: Box },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'contact', label: 'Contact', icon: MessageSquare },
  ];

  return (
    <BeamsBackground className="pt-16 min-h-screen bg-brand-dark" intensity="medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-xl text-white/40">Manage models, orders, and users</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleBackfillThumbnails}
                disabled={backfillStatus === 'running'}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm border border-white/15 text-white/60 hover:text-white hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${backfillStatus === 'running' ? 'animate-spin' : ''}`} />
                {backfillStatus === 'running' ? 'Regenerating...' : 'Regenerate Thumbnails'}
              </button>
              {backfillResult && (
                <p className={`text-xs max-w-sm text-right ${backfillStatus === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                  {backfillResult}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-white/10 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id !== 'orders') setUserFilter(undefined);
                  }}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-brand-accent text-brand-accent'
                      : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-brand-dark-card border border-white/5 rounded-2xl p-6">
          {activeTab === 'models' && (
            <ModelsTab onFilterUser={handleFilterUser} />
          )}
          {activeTab === 'orders' && (
            <OrdersTab userFilter={userFilter} onClearUserFilter={() => setUserFilter(undefined)} />
          )}
          {activeTab === 'users' && (
            <UsersTab onFilterUser={handleFilterUser} />
          )}
          {activeTab === 'contact' && (
            <ContactSubmissions />
          )}
        </div>
      </div>
    </BeamsBackground>
  );
}
