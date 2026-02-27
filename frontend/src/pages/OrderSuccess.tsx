import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, Truck, ExternalLink } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';

interface OrderSuccessData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  filename: string;
  quantity: string;
  color: string;
  material: string;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  trackingInfo?: {
    status: string;
    trackingNumbers: string[];
  };
  message: string;
}

export function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderSuccessData | null>(null);
  
  const sessionId = searchParams.get('session_id');
  const vendor = searchParams.get('vendor');
  const directOrderData = location.state?.orderData;
  const isDirectOrder = location.state?.isDirectOrder;

  useEffect(() => {
    // Handle direct order data from navigation state (Shapeways, Slant3D, Treatstock)
    if (isDirectOrder && directOrderData) {
      console.log('✅ Using direct order data:', directOrderData);
      setOrderData(directOrderData);
      setLoading(false);
      return;
    }

    // Handle Craftcloud Stripe redirect — look up the order from the DB
    if (vendor === 'craftcloud' && user) {
      console.log('🔄 Craftcloud payment redirect — looking up order from DB');
      const fetchOrder = async () => {
        try {
          // Query for the most recent Craftcloud order for this user
          const { data: order, error: dbError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', user.id)
            .eq('vendor', 'craftcloud')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (dbError) {
            console.error('DB query error:', dbError.message, dbError.code, dbError.details);
          }

          if (dbError || !order) {
            console.error('Could not find Craftcloud order:', dbError);
            setError('Could not find your order. The order may not have been saved correctly. Please check your dashboard or contact support.');
            setLoading(false);
            return;
          }

          console.log('✅ Found Craftcloud order:', order.id, 'status:', order.status);

          // Update order status from pending_payment to submitted
          const { error: updateErr } = await supabase
            .from('orders')
            .update({ status: 'submitted', updated_at: new Date().toISOString() })
            .eq('id', order.id)
            .eq('status', 'pending_payment');

          if (updateErr) {
            console.warn('Failed to update order status:', updateErr.message);
            // Non-blocking — order exists, just status update failed
          }

          setError(null);
          setOrderData({
            orderId: order.order_number || order.vendor_order_id || order.id,
            customerName: order.customer_name || `${order.shipping_address?.firstName || ''} ${order.shipping_address?.lastName || ''}`.trim(),
            customerEmail: order.customer_email || order.shipping_address?.email || '',
            filename: 'model',
            quantity: String(order.quantity || 1),
            color: '',
            material: order.material_id || '',
            shippingAddress: {
              name: order.customer_name || '',
              street: order.shipping_address?.address1 || '',
              city: order.shipping_address?.city || '',
              state: order.shipping_address?.state || '',
              zip: order.shipping_address?.zipCode || order.shipping_zip || '',
            },
            message: `Order placed successfully via Craftcloud. Total: $${order.total_price?.toFixed(2) || '0.00'} ${order.currency || 'USD'}`,
          });
          setLoading(false);
        } catch (e) {
          console.error('Error fetching Craftcloud order:', e);
          setError('Could not load order details. Please check your dashboard.');
          setLoading(false);
        }
      };
      fetchOrder();
      return;
    }

    // Handle legacy Stripe flow (disabled)
    if (!sessionId && !vendor) {
      setError('No order data found. Please try again.');
      setLoading(false);
      return;
    }

    if (!user) {
      setError('User not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    // LEGACY STRIPE FLOW DISABLED
    console.log('🔄 Legacy Stripe flow disabled - orders are now created directly');
    setError('Legacy payment flow is no longer supported. Please create a new order.');
    setLoading(false);
  }, [sessionId, vendor, user, isDirectOrder, directOrderData]);

  if (loading) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Your Order</h2>
          <p className="text-gray-600">Please wait while we verify your payment and create your order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <Package className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/marketplace')} className="w-full">
                Back to Marketplace
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No order data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8">
          <div className="text-center">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            {/* Success Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h2>
            
            <p className="text-gray-600 mb-8">
              Your payment has been processed and your order is now in the manufacturing queue.
            </p>
            
            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
              
              <div className="space-y-4">
                {/* Order ID */}
                <div className="flex items-center space-x-3">
                  <Package className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-medium text-gray-900">{orderData.orderId}</p>
                  </div>
                </div>
                
                {/* Customer Info */}
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 text-gray-400"></div>
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium text-gray-900">{orderData.customerName}</p>
                    <p className="text-sm text-gray-600">{orderData.customerEmail}</p>
                  </div>
                </div>
                
                {/* Item Details */}
                <div className="flex items-center space-x-3">
                  <Package className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Item Details</p>
                    <p className="font-medium text-gray-900">{orderData.filename}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>Qty: {orderData.quantity}</span>
                      <span>{orderData.color}</span>
                      <span>{orderData.material}</span>
                    </div>
                  </div>
                </div>
                
                {/* Shipping Address */}
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 text-gray-400"></div>
                  <div>
                    <p className="text-sm text-gray-500">Shipping To</p>
                    <p className="font-medium text-gray-900">{orderData.shippingAddress.name}</p>
                    <p className="text-sm text-gray-600">
                      {orderData.shippingAddress.street}<br />
                      {orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.zip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tracking Information */}
            {orderData.trackingInfo && (
              <div className={`rounded-lg p-4 mb-6 text-left ${
                orderData.trackingInfo.trackingNumbers.length > 0 ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <h4 className={`font-semibold mb-2 ${
                  orderData.trackingInfo.trackingNumbers.length > 0 ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  Shipping & Tracking
                </h4>
                
                <div className={`text-sm space-y-2 ${
                  orderData.trackingInfo.trackingNumbers.length > 0 ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  <div>
                    <strong>Status:</strong> {orderData.trackingInfo.status || 'Processing'}
                  </div>
                  
                  {orderData.trackingInfo.trackingNumbers.length > 0 ? (
                    <div>
                      <strong>Tracking Numbers:</strong>
                      <div className="mt-1 space-y-1">
                        {orderData.trackingInfo.trackingNumbers.map((trackingNumber, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <code className="bg-white px-2 py-1 rounded text-xs border">
                              {trackingNumber}
                            </code>
                            <a 
                              href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs underline"
                            >
                              Track with USPS
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p>🚚 Your order is being prepared for shipment.</p>
                      <p>Tracking numbers will be emailed to you once shipped.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Next Steps */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-semibold text-blue-900 mb-2">What's Next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• You'll receive a confirmation email shortly</li>
                <li>• Your order will be processed and manufactured</li>
                <li>• You'll get tracking information once it ships</li>
                <li>• Typical delivery time is 3-5 business days</li>
              </ul>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                View Orders
              </Button>
              <Button
                onClick={() => navigate('/marketplace')}
                className="flex-1"
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 