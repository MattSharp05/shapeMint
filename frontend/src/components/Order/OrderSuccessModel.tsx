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
  };
}

export function OrderSuccessModal({ isOpen, onClose, orderData }: OrderSuccessModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center">
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
            onClick={onClose}
            className="flex-1"
          >
            Continue Shopping
          </Button>
          <Button
            onClick={() => {
              // Navigate to dashboard or orders page
              window.location.href = '/dashboard?tab=orders';
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