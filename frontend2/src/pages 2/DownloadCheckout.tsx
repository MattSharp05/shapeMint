import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CreditCard, Check, FileText } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { ModelViewer } from '../components/3D/ModelViewer';

export function DownloadCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modelData, modelUrl, price, isGenerated } = location.state || {};
  
  const [paymentInfo, setPaymentInfo] = useState({
    email: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    billingAddress: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [processing, setProcessing] = useState(false);

  if (!modelData || !modelUrl) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Model Selected</h2>
          <p className="text-gray-600 mb-6">Please select a model to download.</p>
          <Button onClick={() => navigate(isGenerated ? '/generate' : '/marketplace')}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const tax = price * 0.08;
  const total = price + tax;

  const handlePurchase = async () => {
    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      alert('Purchase successful! Your download will begin shortly.');
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => navigate(isGenerated ? '/generate' : '/marketplace')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {isGenerated ? 'Generate' : 'Marketplace'}</span>
          </button>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Download 3D Model
          </h1>
          <p className="text-xl text-gray-600">
            Complete your purchase to download the 3D model files
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Payment Information
              </h3>
              
              <div className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="your@email.com"
                  value={paymentInfo.email}
                  onChange={(e) => setPaymentInfo({...paymentInfo, email: e.target.value})}
                  required
                />
                
                <Input
                  label="Card Number"
                  placeholder="1234 5678 9012 3456"
                  value={paymentInfo.cardNumber}
                  onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})}
                  required
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Expiry Date"
                    placeholder="MM/YY"
                    value={paymentInfo.expiryDate}
                    onChange={(e) => setPaymentInfo({...paymentInfo, expiryDate: e.target.value})}
                    required
                  />
                  <Input
                    label="CVV"
                    placeholder="123"
                    value={paymentInfo.cvv}
                    onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value})}
                    required
                  />
                </div>
                
                <Input
                  label="Name on Card"
                  value={paymentInfo.nameOnCard}
                  onChange={(e) => setPaymentInfo({...paymentInfo, nameOnCard: e.target.value})}
                  required
                />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Billing Address
              </h3>
              
              <div className="space-y-4">
                <Input
                  label="Address"
                  value={paymentInfo.billingAddress}
                  onChange={(e) => setPaymentInfo({...paymentInfo, billingAddress: e.target.value})}
                  required
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    value={paymentInfo.city}
                    onChange={(e) => setPaymentInfo({...paymentInfo, city: e.target.value})}
                    required
                  />
                  <Input
                    label="State"
                    value={paymentInfo.state}
                    onChange={(e) => setPaymentInfo({...paymentInfo, state: e.target.value})}
                    required
                  />
                </div>
                
                <Input
                  label="ZIP Code"
                  value={paymentInfo.zipCode}
                  onChange={(e) => setPaymentInfo({...paymentInfo, zipCode: e.target.value})}
                  required
                />
              </div>
            </Card>

            <Button 
              onClick={handlePurchase}
              loading={processing}
              className="w-full"
              size="lg"
              icon={Download}
            >
              {processing ? 'Processing...' : `Complete Purchase - $${total.toFixed(2)}`}
            </Button>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                3D Model Preview
              </h3>
              <ModelViewer 
                modelUrl={modelUrl}
                className="h-64 w-full mb-4"
              />
              <div className="text-sm text-gray-600">
                {isGenerated ? (
                  <>
                    <p><strong>Generated from:</strong> {modelData.prompt || 'Image upload'}</p>
                    <p><strong>Style:</strong> {modelData.settings?.style}</p>
                    <p><strong>Quality:</strong> {modelData.settings?.quality}</p>
                  </>
                ) : (
                  <>
                    <p><strong>Design:</strong> {modelData.designTitle}</p>
                    <p><strong>Creator:</strong> {modelData.creator}</p>
                    <p><strong>Description:</strong> {modelData.designDescription}</p>
                  </>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Digital Download:</span>
                  <span>${price.toFixed(2)}</span>
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

            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                What You'll Get
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  High-quality STL file for 3D printing
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  OBJ file for 3D modeling software
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Full commercial usage rights
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Lifetime download access
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Print-ready optimization
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}