import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Package, Truck } from 'lucide-react';
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

    // Handle Craftcloud Stripe redirect
    if (vendor === 'craftcloud') {
      // If user is logged in, try to look up order details from DB
      if (user) {
        console.log('🔄 Craftcloud payment redirect — looking up order from DB');
        const fetchOrder = async () => {
          try {
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
              // DB lookup failed but payment succeeded — show generic success
              console.warn('Could not find Craftcloud order in DB, showing generic success');
              setOrderData({
                orderId: '',
                customerName: '',
                customerEmail: '',
                filename: 'model',
                quantity: '1',
                color: '',
                material: '',
                shippingAddress: { name: '', street: '', city: '', state: '', zip: '' },
                message: 'Order placed successfully via Craftcloud.',
              });
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
            // Still show success — payment went through even if DB lookup failed
            setOrderData({
              orderId: '',
              customerName: '',
              customerEmail: '',
              filename: 'model',
              quantity: '1',
              color: '',
              material: '',
              shippingAddress: { name: '', street: '', city: '', state: '', zip: '' },
              message: 'Order placed successfully via Craftcloud.',
            });
            setLoading(false);
          }
        };
        fetchOrder();
      } else {
        // Anonymous user returning from Stripe — show success without DB lookup
        console.log('✅ Anonymous Craftcloud payment redirect — showing success');
        setOrderData({
          orderId: '',
          customerName: '',
          customerEmail: '',
          filename: 'model',
          quantity: '1',
          color: '',
          material: '',
          shippingAddress: { name: '', street: '', city: '', state: '', zip: '' },
          message: 'Order placed successfully via Craftcloud.',
        });
        setLoading(false);
      }
      return;
    }

    // No order data found
    setError('No order data found. Please try again.');
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

  const hasDetails = orderData.orderId && orderData.customerName;

  return (
    <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="p-8 max-w-lg w-full mx-4">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Order Successful!
          </h2>

          <p className="text-gray-600 mb-6">
            Your payment has been processed and your 3D print is now being manufactured.
          </p>

          {/* Order details (if available) */}
          {hasDetails && (
            <div className="bg-gray-50 rounded-lg p-5 mb-6 text-left space-y-3">
              {orderData.orderId && (
                <div className="flex items-center space-x-3">
                  <Package className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-medium text-gray-900">{orderData.orderId}</p>
                  </div>
                </div>
              )}
              {orderData.customerName && (
                <div className="flex items-center space-x-3">
                  <Truck className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500">Shipping to</p>
                    <p className="font-medium text-gray-900">{orderData.customerName}</p>
                    {orderData.shippingAddress.street && (
                      <p className="text-sm text-gray-600">
                        {orderData.shippingAddress.street}, {orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.zip}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* What's next */}
          <div className="bg-blue-50 rounded-lg p-5 mb-6 text-left">
            <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1.5">
              <li>You'll receive a confirmation email with your order details</li>
              <li>Your model will be manufactured and shipped to your address</li>
              <li>You'll get shipping updates and tracking information via email</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/generate')}
              className="w-full"
            >
              Generate Another Model
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace')}
              className="w-full"
            >
              Browse Marketplace
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
} 