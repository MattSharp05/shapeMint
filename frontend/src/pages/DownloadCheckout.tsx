import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CreditCard, Check, FileText } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { ModelViewer } from '../components/3D/ModelViewer';
// import { stripeService } from '../services/stripe';
import { useAuth } from '../hooks/useAuth';

export function DownloadCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modelData, modelUrl, price, isGenerated } = location.state || {};
  
  // ✅ Debug logging
  console.log('💾 DownloadCheckout page loaded');
  console.log('💾 location.state:', location.state);
  console.log('💾 modelData:', modelData);
  console.log('💾 modelUrl:', modelUrl);
  console.log('💾 price:', price);
  console.log('💾 isGenerated:', isGenerated);
  
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
  const { user } = useAuth();

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

  // ✅ Ensure price is valid and provide fallback
  const validPrice = typeof price === 'number' && !isNaN(price) && price > 0 ? price : 12.99;
  const tax = validPrice * 0.08;
  const total = validPrice + tax;

  const handleCheckout = async () => {
    setProcessing(true);
    
    try {
      // ✅ Add validation checks
      console.log('🔍 Checkout validation:');
      console.log('  - total:', total);
      console.log('  - price:', price);
      console.log('  - tax:', tax);
      console.log('  - email:', paymentInfo.email);
      console.log('  - user:', user);
      console.log('  - modelData:', modelData);
      console.log('  - modelUrl:', modelUrl);

      // Validate required fields
      if (!paymentInfo.email) {
        alert('Please enter your email address');
        setProcessing(false);
        return;
      }

      if (!total || isNaN(total) || total <= 0) {
        alert('Invalid price. Please refresh the page and try again.');
        setProcessing(false);
        return;
      }

      if (!modelData || !modelUrl) {
        alert('Model data is missing. Please go back and select a model.');
        setProcessing(false);
        return;
      }

      console.log('✅ All validation checks passed, creating checkout session...');

      // STRIPE INTEGRATION DISABLED
      /*
      await stripeService.redirectToCheckout({
        amount: total,
        paymentType: 'download',
        metadata: {
          userId: user?.id || 'anonymous',
          email: paymentInfo.email,
          modelName: isGenerated ? (modelData.prompt || 'Generated Model') : (modelData.designTitle || 'Model'),
          modelUrl: modelUrl,
          isGenerated: isGenerated || false,
          modelId: modelData.designId || modelData.id || 'unknown'
        }
      });
      */
      
      // TODO: Implement direct download or alternative payment method
      console.log('🔄 Download checkout - Stripe disabled');
      alert('Download functionality temporarily disabled. Please contact support.');
    } catch (error: any) {
      console.error('🚨 Checkout error details:', error);
      console.error('🚨 Error type:', typeof error);
      console.error('🚨 Error message:', error?.message);
      console.error('🚨 Error stack:', error?.stack);
      
      let errorMessage = 'Failed to start checkout. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('amount')) {
          errorMessage = 'Invalid amount. Please refresh the page.';
        } else if (error.message.includes('email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('metadata')) {
          errorMessage = 'Missing product information. Please go back and select a model.';
        } else {
          errorMessage = `Checkout failed: ${error.message}`;
        }
      }
      
      alert(errorMessage);
      setProcessing(false);
    }
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
                Customer Information
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
              </div>

              <Button
                onClick={handleCheckout}
                loading={processing}
                className="w-full mt-6"
                size="lg"
                icon={CreditCard}
                disabled={!paymentInfo.email}
              >
                {processing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
              </Button>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Payment processing temporarily unavailable
              </p>
            </Card>
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
                  <span>${validPrice.toFixed(2)}</span>
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