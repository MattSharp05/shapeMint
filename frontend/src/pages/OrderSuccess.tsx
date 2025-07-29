import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderSuccessData | null>(null);
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found. Please try again.');
      setLoading(false);
      return;
    }

    if (!user) {
      setError('User not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    // Verify payment and create order
    const verifyPaymentAndCreateOrder = async () => {
      try {
        console.log('🔄 Verifying payment and creating order...');
        
        // First, verify the payment with Stripe
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId }
        });

        if (paymentError) {
          console.error('❌ Payment verification failed:', paymentError);
          setError('Payment verification failed. Please contact support.');
          setLoading(false);
          return;
        }

        if (!paymentData.success) {
          console.error('❌ Payment verification unsuccessful:', paymentData);
          setError('Payment verification unsuccessful. Please try again.');
          setLoading(false);
          return;
        }

        console.log('✅ Payment verified successfully:', paymentData);

        // Extract order data from payment metadata
        const metadata = paymentData.metadata;
        const orderData = {
          email: metadata.email,
          phone: metadata.phone,
          name: metadata.name,
          orderNumber: metadata.orderNumber,
          filename: metadata.filename,
          fileURL: metadata.fileURL,
          bill_to_street_1: metadata.billCity, // Simplified for now
          bill_to_city: metadata.billCity,
          bill_to_state: metadata.billState,
          bill_to_zip: metadata.billZip,
          bill_to_country_as_iso: 'US', // Default
          bill_to_is_US_residential: 'true', // Default
          ship_to_name: metadata.name, // Simplified for now
          ship_to_street_1: metadata.shipCity, // Simplified for now
          ship_to_city: metadata.shipCity,
          ship_to_state: metadata.shipState,
          ship_to_zip: metadata.shipZip,
          ship_to_country_as_iso: 'US', // Default
          ship_to_is_US_residential: 'true', // Default
          order_item_name: metadata.filename,
          order_quantity: metadata.quantity,
          order_image_url: '', // Not available from metadata
          order_sku: '', // Not available from metadata
          order_item_color: metadata.color,
          profile: metadata.material
        };

        // Create the order with Slant3D
        const { data: orderResponse, error: orderError } = await supabase.functions.invoke('slant3d-order', {
          body: { 
            orderData,
            paymentInfo: {
              userId: user.id,
              stripeSessionId: sessionId
            }
          }
        });

        if (orderError) {
          console.error('❌ Order creation failed:', orderError);
          setError('Order creation failed. Please contact support.');
          setLoading(false);
          return;
        }

        if (orderResponse.error) {
          console.error('❌ Order creation unsuccessful:', orderResponse);
          setError(orderResponse.message || 'Order creation failed. Please try again.');
          setLoading(false);
          return;
        }

        console.log('✅ Order created successfully:', orderResponse);
        setOrderData(orderResponse.data);
        setLoading(false);

      } catch (err: any) {
        console.error('❌ Error in payment verification and order creation:', err);
        setError('An unexpected error occurred. Please contact support.');
        setLoading(false);
      }
    };

    verifyPaymentAndCreateOrder();
  }, [sessionId, user]);

  if (loading) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
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