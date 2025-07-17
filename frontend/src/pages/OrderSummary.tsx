import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Package, Truck, Calendar, CreditCard, Download, ArrowRight, Home } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { ModelViewer } from '../components/3D/ModelViewer';

export function OrderSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderData } = location.state || {};

  // If no order data, redirect to home
  if (!orderData) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Order Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find your order details.</p>
          <Button onClick={() => navigate('/')}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const {
    orderId,
    modelData,
    modelUrl,
    selectedMaterial,
    selectedColor,
    quantity,
    selectedVendor,
    shippingInfo,
    subtotal,
    shipping,
    tax,
    total,
    estimatedDelivery
  } = orderData;

  const orderSteps = [
    {
      id: 1,
      title: 'Order Confirmed',
      description: 'Your order has been received and confirmed',
      status: 'completed',
      icon: CheckCircle,
      date: new Date().toLocaleDateString()
    },
    {
      id: 2,
      title: 'Manufacturing',
      description: 'Your item is being 3D printed',
      status: 'pending',
      icon: Package,
      estimatedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      id: 3,
      title: 'Shipping',
      description: 'Your item is on its way',
      status: 'pending',
      icon: Truck,
      estimatedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()
    },
    {
      id: 4,
      title: 'Delivered',
      description: 'Your item has been delivered',
      status: 'pending',
      icon: Calendar,
      estimatedDate: estimatedDelivery
    }
  ];

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Order Confirmed!
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Thank you for your order. We'll send you updates as your item is manufactured.
          </p>
          <p className="text-lg text-gray-500">
            Order ID: <span className="font-mono font-medium">#{orderId}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Progress */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Order Progress
              </h3>
              
              <div className="space-y-6">
                {orderSteps.map((step, index) => (
                  <div key={step.id} className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      step.status === 'completed' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${
                          step.status === 'completed' ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {step.status === 'completed' ? step.date : `Est. ${step.estimatedDate}`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Order Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Order Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Item Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Design:</span>
                      <span className="font-medium">
                        {modelData.isMarketplaceItem ? modelData.designTitle : modelData.prompt}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Material:</span>
                      <span className="font-medium">{selectedMaterial}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Color:</span>
                      <span className="font-medium">{selectedColor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium">{quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vendor:</span>
                      <span className="font-medium">{selectedVendor}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Shipping Address</h4>
                  <div className="text-sm text-gray-600">
                    <p>{shippingInfo.firstName} {shippingInfo.lastName}</p>
                    <p>{shippingInfo.address}</p>
                    <p>{shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}</p>
                    <p>{shippingInfo.country}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Next Steps */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                What happens next?
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>You'll receive an email confirmation with your order details</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Manufacturing will begin within 24 hours</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>You'll get tracking information once your item ships</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Expected delivery: {estimatedDelivery}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* 3D Model Preview */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Design
              </h3>
              <ModelViewer 
                modelUrl={modelUrl}
                className="h-48 w-full mb-4"
              />
              <div className="text-sm text-gray-600">
                {modelData.isMarketplaceItem ? (
                  <>
                    <p><strong>Creator:</strong> {modelData.creator}</p>
                    <p><strong>Description:</strong> {modelData.designDescription}</p>
                  </>
                ) : (
                  <>
                    <p><strong>Generated from:</strong> {modelData.prompt}</p>
                    <p><strong>Style:</strong> {modelData.settings?.style}</p>
                  </>
                )}
              </div>
            </Card>

            {/* Order Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Link to="/dashboard">
                <Button className="w-full" icon={ArrowRight}>
                  View Order in Dashboard
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full" icon={Home}>
                  Continue Shopping
                </Button>
              </Link>
            </div>

            {/* Support */}
            <Card className="p-6 text-center">
              <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
              <p className="text-sm text-gray-600 mb-4">
                Our support team is here to help with any questions about your order.
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}