import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CreditCard, MapPin, Check } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { ModelViewer } from '../components/3D/ModelViewer';

const materials = [
  { 
    id: 'pla', 
    name: 'PLA Plastic', 
    description: 'Biodegradable, easy to print, good for prototypes',
    price: 24.99,
    colors: ['White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple']
  },
  { 
    id: 'abs', 
    name: 'ABS Plastic', 
    description: 'Durable, impact resistant, good for functional parts',
    price: 29.50,
    colors: ['White', 'Black', 'Red', 'Blue', 'Green', 'Gray']
  },
  { 
    id: 'petg', 
    name: 'PETG', 
    description: 'Chemical resistant, food safe, crystal clear',
    price: 34.75,
    colors: ['Clear', 'White', 'Black', 'Blue', 'Green']
  },
  { 
    id: 'tpu', 
    name: 'TPU (Flexible)', 
    description: 'Flexible, rubber-like, good for phone cases',
    price: 39.99,
    colors: ['Black', 'White', 'Red', 'Blue', 'Clear']
  }
];

const vendors = [
  {
    id: 'printcraft',
    name: 'PrintCraft Pro',
    rating: 4.8,
    deliveryTime: '3-5 business days',
    location: 'California, USA'
  },
  {
    id: '3dsolutions',
    name: '3D Solutions',
    rating: 4.6,
    deliveryTime: '2-4 business days',
    location: 'Texas, USA'
  },
  {
    id: 'precision',
    name: 'Precision Print',
    rating: 4.9,
    deliveryTime: '4-7 business days',
    location: 'New York, USA'
  }
];

export function Order() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modelData, modelUrl } = location.state || {};
  
  const [step, setStep] = useState(1);
  const [selectedMaterial, setSelectedMaterial] = useState('pla');
  const [selectedColor, setSelectedColor] = useState('White');
  const [quantity, setQuantity] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState('printcraft');
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  });

  if (!modelData || !modelUrl) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Model Selected</h2>
          <p className="text-gray-600 mb-6">Please generate a model first before placing an order.</p>
          <Button onClick={() => navigate('/generate')}>
            Go to Generate
          </Button>
        </Card>
      </div>
    );
  }

  const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
  const selectedVendorData = vendors.find(v => v.id === selectedVendor);
  const subtotal = selectedMaterialData ? selectedMaterialData.price * quantity : 0;
  const shipping = 8.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const isMarketplaceItem = modelData.isMarketplaceItem;

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePlaceOrder = () => {
    // Simulate order placement
    alert('Order placed successfully! You will receive a confirmation email shortly.');
    navigate('/dashboard');
  };

  const getColorStyle = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'White': '#f3f4f6',
      'Black': '#1f2937',
      'Red': '#ef4444',
      'Blue': '#3b82f6',
      'Green': '#10b981',
      'Yellow': '#f59e0b',
      'Orange': '#f97316',
      'Purple': '#8b5cf6',
      'Gray': '#6b7280',
      'Clear': '#e5e7eb'
    };
    return { backgroundColor: colorMap[color] || '#f3f4f6' };
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => navigate(isMarketplaceItem ? '/marketplace' : '/generate')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {isMarketplaceItem ? 'Marketplace' : 'Generate'}</span>
          </button>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Order Your 3D Print
          </h1>
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mb-8">
            {[
              { num: 1, label: 'Material & Options' },
              { num: 2, label: 'Vendor Selection' },
              { num: 3, label: 'Shipping Info' },
              { num: 4, label: 'Payment' }
            ].map((stepItem) => (
              <div key={stepItem.num} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepItem.num 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > stepItem.num ? <Check className="h-4 w-4" /> : stepItem.num}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">{stepItem.label}</span>
                {stepItem.num < 4 && <div className="w-8 h-px bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Steps */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Material & Options
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Material
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {materials.map((material) => (
                        <div
                          key={material.id}
                          onClick={() => setSelectedMaterial(material.id)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedMaterial === material.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{material.name}</h4>
                            <span className="text-lg font-bold text-purple-600">${material.price}</span>
                          </div>
                          <p className="text-sm text-gray-600">{material.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Color
                    </label>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                      {selectedMaterialData?.colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`w-12 h-12 rounded-lg border-2 transition-all ${
                            selectedColor === color
                              ? 'border-purple-500 ring-2 ring-purple-200'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={getColorStyle(color)}
                          title={color}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Selected: {selectedColor}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </Card>
            )}

            {step === 2 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Select Manufacturing Partner
                </h3>
                
                <div className="space-y-4">
                  {vendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      onClick={() => setSelectedVendor(vendor.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedVendor === vendor.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">{vendor.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{vendor.location}</span>
                            </div>
                            <span>⭐ {vendor.rating}</span>
                            <span>🚚 {vendor.deliveryTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Shipping Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={shippingInfo.firstName}
                    onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={shippingInfo.lastName}
                    onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={shippingInfo.email}
                    onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                    required
                    className="md:col-span-2"
                  />
                  <Input
                    label="Phone"
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                    required
                    className="md:col-span-2"
                  />
                  <Input
                    label="Address"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                    required
                    className="md:col-span-2"
                  />
                  <Input
                    label="City"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                    required
                  />
                  <Input
                    label="State"
                    value={shippingInfo.state}
                    onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                    required
                  />
                  <Input
                    label="ZIP Code"
                    value={shippingInfo.zipCode}
                    onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
                    required
                  />
                  <Input
                    label="Country"
                    value={shippingInfo.country}
                    onChange={(e) => setShippingInfo({...shippingInfo, country: e.target.value})}
                    required
                  />
                </div>
              </Card>
            )}

            {step === 4 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Payment Information
                </h3>
                
                <div className="space-y-4">
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
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                Back
              </Button>
              
              {step < 4 ? (
                <Button onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handlePlaceOrder}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  Place Order
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                3D Model Preview
              </h3>
              <ModelViewer 
                modelUrl={modelUrl}
                className="h-48 w-full mb-4"
              />
              <div className="text-sm text-gray-600">
                {isMarketplaceItem ? (
                  <>
                    <p><strong>Design:</strong> {modelData.designTitle}</p>
                    <p><strong>Creator:</strong> {modelData.creator}</p>
                    <p><strong>Description:</strong> {modelData.designDescription}</p>
                  </>
                ) : (
                  <>
                    <p><strong>Prompt:</strong> {modelData.prompt || 'Image upload'}</p>
                    <p><strong>Style:</strong> {modelData.settings?.style}</p>
                    <p><strong>Quality:</strong> {modelData.settings?.quality}</p>
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
                  <span>Material:</span>
                  <span>{selectedMaterialData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Color:</span>
                  <span>{selectedColor}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span>{quantity}</span>
                </div>
                {step >= 2 && (
                  <div className="flex justify-between">
                    <span>Vendor:</span>
                    <span>{selectedVendorData?.name}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-3 space-y-2">
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
                  <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-2">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}