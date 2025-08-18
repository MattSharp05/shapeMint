// Create this as a new component: components/Order/OrderSuccessModal.tsx

import React from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { CheckCircle, Package, User, MapPin, Palette, Hash } from 'lucide-react';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
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
    // Add tracking support
    trackingInfo?: {
      status: string;
      trackingNumbers: string[];
    };
    labelDownloadUrl?: string; // Add this
    message?: string;
  };
}

export function OrderSuccessModal({ isOpen, onClose, orderData }: OrderSuccessModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center max-h-[80vh] overflow-y-auto">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        {/* Success Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Order Placed Successfully!
        </h2>
        
        <p className="text-gray-600 mb-8">
          Your order is now in the manufacturing queue. You'll receive a confirmation email shortly.
        </p>
        
        {/* Order Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
          
          <div className="space-y-4">
            {/* Order ID */}
            <div className="flex items-center space-x-3">
              <Hash className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-medium text-gray-900">{orderData.orderId}</p>
              </div>
            </div>
            
            {/* Customer Info */}
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
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
                  <span className="flex items-center space-x-1">
                    <Palette className="w-3 h-3" />
                    <span>{orderData.color}</span>
                  </span>
                  <span>{orderData.material}</span>
                </div>
              </div>
            </div>
            
            {/* Shipping Address */}
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
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
        <div className={`rounded-lg p-4 mb-6 text-left ${
          orderData.trackingInfo && orderData.trackingInfo.trackingNumbers && orderData.trackingInfo.trackingNumbers.length > 0 
            ? 'bg-green-50' 
            : 'bg-yellow-50'
        }`}>
          <h4 className={`font-semibold mb-2 ${
            orderData.trackingInfo && orderData.trackingInfo.trackingNumbers && orderData.trackingInfo.trackingNumbers.length > 0 
              ? 'text-green-900' 
              : 'text-yellow-900'
          }`}>
            Shipping & Tracking
          </h4>
          
          <div className={`text-sm space-y-2 ${
            orderData.trackingInfo && orderData.trackingInfo.trackingNumbers && orderData.trackingInfo.trackingNumbers.length > 0 
              ? 'text-green-800' 
              : 'text-yellow-800'
          }`}>
            <div>
              <strong>Status:</strong> {orderData.trackingInfo?.status || 'Processing'}
            </div>
            
            {orderData.trackingInfo && orderData.trackingInfo.trackingNumbers && orderData.trackingInfo.trackingNumbers.length > 0 ? (
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
            
            {orderData.labelDownloadUrl && (
              <div>
                <a 
                  href={orderData.labelDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs underline"
                >
                  📄 Download Shipping Label
                </a>
              </div>
            )}
          </div>
        </div>
        
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
        <div className="flex space-x-3 pb-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Continue Shopping
          </Button>
          <Button
            onClick={() => {
              // Navigate to dashboard orders tab
              window.location.href = '/dashboard';
            }}
            className="flex-1"
          >
            View Orders
          </Button>
        </div>
      </div>
    </Modal>
  );
}