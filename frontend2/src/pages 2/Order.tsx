import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CreditCard, MapPin, Check } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { ModelViewer } from '../components/3D/ModelViewer';
import { Modal } from '../components/UI/Modal';
import { supabase } from '../lib/supabase';

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
    id: 'slant',
    name: 'Slant',
    rating: 4.8,
    deliveryTime: '3-5 business days',
    location: 'Remote'
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

// Add this helper function to map color names to Slant3D API values
const mapColorToSlantAPI = (color: string): string => {
  const colorMap: { [key: string]: string } = {
    'White': 'white',
    'Black': 'black',
    'Red': 'red',
    'Blue': 'blue',
    'Green': 'green',
    'Yellow': 'yellow',
    'Orange': 'orange',
    'Purple': 'purple',
    'Gray': 'gray',
    'Grey': 'grey',
    'Clear': 'white', // Map clear to white as fallback
    'Gold': 'gold',
    'Pink': 'pink'
  };
  return colorMap[color] || 'white'; // Default to white if not found
};

export function Order() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modelData, modelUrl } = location.state || {};

  const [step, setStep] = useState(1);
  const [selectedMaterial, setSelectedMaterial] = useState('pla');
  const [selectedColor, setSelectedColor] = useState('White');
  const [quantity, setQuantity] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState('slant');
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
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteSuccess, setQuoteSuccess] = useState<{ totalPrice?: number, printingCost?: number, shippingCost?: number } | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Declare these after the above state
  const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
  const selectedVendorData = vendors.find(v => v.id === selectedVendor);
  const subtotal = selectedMaterialData ? selectedMaterialData.price * quantity : 0;
  const shipping = 8.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  const isMarketplaceItem = modelData?.isMarketplaceItem;

  // Slant quote form state
  const [slantForm, setSlantForm] = useState({
    name: 'Matthew Sharp',
    email: 'm5sharp@icloud.com',
    phone: '8324682144',
    orderNumber: `ORDER_${Date.now()}`,
    filename: 'test',
    fileURL: '',
    quantity: '1',
    color: 'white',
    profile: 'PLA Plastic',
    bill_to_street_1: '3600 E Fletcher Ave',
    bill_to_street_2: '',
    bill_to_street_3: '',
    bill_to_city: 'Tampa',
    bill_to_state: 'FL',
    bill_to_zip: '33613',
    bill_to_country_as_iso: 'US',
    bill_to_is_US_residential: 'true',
    ship_to_name: 'Matthew Sharp',
    ship_to_street_1: '3600 E Fletcher Ave',
    ship_to_street_2: '',
    ship_to_street_3: '',
    ship_to_city: 'Tampa',
    ship_to_state: 'FL',
    ship_to_zip: '33613',
    ship_to_country_as_iso: 'US',
    ship_to_is_US_residential: 'true',
    order_item_name: 'test',
    order_quantity: '1',
    order_image_url: '',
    order_sku: '',
    order_item_color: 'white'
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

  // Helper for required label
  const requiredLabel = (label: string) => <span>{label} <span className="text-red-500">*</span></span>;

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
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all flex justify-between items-center ${
                        selectedVendor === vendor.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
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
                      {vendor.id === 'slant' && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setIsQuoteModalOpen(true);
                          }}
                          className="ml-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg shadow hover:from-purple-600 hover:to-indigo-600 transition-colors"
                        >
                          Get Quote
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Shipping & Quote Information
                </h3>
                <form className="space-y-6">
                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Name" value={slantForm.name} onChange={e => setSlantForm(f => ({...f, name: e.target.value}))} required />
                    <Input label="Email" value={slantForm.email} onChange={e => setSlantForm(f => ({...f, email: e.target.value}))} required />
                    <Input label="Phone" value={slantForm.phone} onChange={e => setSlantForm(f => ({...f, phone: e.target.value}))} required />
                    <Input label="Order Number" value={slantForm.orderNumber} onChange={e => setSlantForm(f => ({...f, orderNumber: e.target.value}))} required />
                  </div>
                  {/* Order Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="File Name" value={slantForm.filename} onChange={e => setSlantForm(f => ({...f, filename: e.target.value}))} required />
                    <Input label="File URL" value={slantForm.fileURL} onChange={e => setSlantForm(f => ({...f, fileURL: e.target.value}))} required />
                    <Input label="Quantity" value={slantForm.quantity} onChange={e => setSlantForm(f => ({...f, quantity: e.target.value}))} required />
                    <Input label="Color" value={slantForm.color} onChange={e => setSlantForm(f => ({...f, color: e.target.value}))} required />
                    <Input label="Profile" value={slantForm.profile} onChange={e => setSlantForm(f => ({...f, profile: e.target.value}))} />
                  </div>
                  {/* Billing Address */}
                  <div className="pt-2 font-semibold text-gray-700">Billing Address</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Street 1" value={slantForm.bill_to_street_1} onChange={e => setSlantForm(f => ({...f, bill_to_street_1: e.target.value}))} required />
                    <Input label="Street 2" value={slantForm.bill_to_street_2} onChange={e => setSlantForm(f => ({...f, bill_to_street_2: e.target.value}))} />
                    <Input label="Street 3" value={slantForm.bill_to_street_3} onChange={e => setSlantForm(f => ({...f, bill_to_street_3: e.target.value}))} />
                    <Input label="City" value={slantForm.bill_to_city} onChange={e => setSlantForm(f => ({...f, bill_to_city: e.target.value}))} required />
                    <Input label="State" value={slantForm.bill_to_state} onChange={e => setSlantForm(f => ({...f, bill_to_state: e.target.value}))} required />
                    <Input label="Zip" value={slantForm.bill_to_zip} onChange={e => setSlantForm(f => ({...f, bill_to_zip: e.target.value}))} required />
                    <Input label="Country (ISO)" value={slantForm.bill_to_country_as_iso} onChange={e => setSlantForm(f => ({...f, bill_to_country_as_iso: e.target.value}))} required />
                    <Input label="US Residential?" value={slantForm.bill_to_is_US_residential} onChange={e => setSlantForm(f => ({...f, bill_to_is_US_residential: e.target.value}))} required />
                  </div>
                  {/* Same as Billing Checkbox */}
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={e => {
                        setSameAsBilling(e.target.checked);
                        if (e.target.checked) {
                          setSlantForm(f => ({
                            ...f,
                            ship_to_name: f.name,
                            ship_to_street_1: f.bill_to_street_1,
                            ship_to_street_2: f.bill_to_street_2,
                            ship_to_street_3: f.bill_to_street_3,
                            ship_to_city: f.bill_to_city,
                            ship_to_state: f.bill_to_state,
                            ship_to_zip: f.bill_to_zip,
                            ship_to_country_as_iso: f.bill_to_country_as_iso,
                            ship_to_is_US_residential: f.bill_to_is_US_residential
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">Shipping address same as billing</label>
                  </div>
                  {/* Shipping Address */}
                  {!sameAsBilling && (
                    <>
                      <div className="pt-2 font-semibold text-gray-700">Shipping Address</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Name" value={slantForm.ship_to_name} onChange={e => setSlantForm(f => ({...f, ship_to_name: e.target.value}))} required />
                        <Input label="Street 1" value={slantForm.ship_to_street_1} onChange={e => setSlantForm(f => ({...f, ship_to_street_1: e.target.value}))} required />
                        <Input label="Street 2" value={slantForm.ship_to_street_2} onChange={e => setSlantForm(f => ({...f, ship_to_street_2: e.target.value}))} />
                        <Input label="Street 3" value={slantForm.ship_to_street_3} onChange={e => setSlantForm(f => ({...f, ship_to_street_3: e.target.value}))} />
                        <Input label="City" value={slantForm.ship_to_city} onChange={e => setSlantForm(f => ({...f, ship_to_city: e.target.value}))} required />
                        <Input label="State" value={slantForm.ship_to_state} onChange={e => setSlantForm(f => ({...f, ship_to_state: e.target.value}))} required />
                        <Input label="Zip" value={slantForm.ship_to_zip} onChange={e => setSlantForm(f => ({...f, ship_to_zip: e.target.value}))} required />
                        <Input label="Country (ISO)" value={slantForm.ship_to_country_as_iso} onChange={e => setSlantForm(f => ({...f, ship_to_country_as_iso: e.target.value}))} required />
                        <Input label="US Residential?" value={slantForm.ship_to_is_US_residential} onChange={e => setSlantForm(f => ({...f, ship_to_is_US_residential: e.target.value}))} required />
                      </div>
                    </>
                  )}
                  {/* Order Details */}
                  <div className="pt-2 font-semibold text-gray-700">Order Details</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Order Item Name" value={slantForm.order_item_name} onChange={e => setSlantForm(f => ({...f, order_item_name: e.target.value}))} required />
                    <Input label="Order Quantity" value={slantForm.order_quantity} onChange={e => setSlantForm(f => ({...f, order_quantity: e.target.value}))} required />
                    <Input label="Order Image URL" value={slantForm.order_image_url} onChange={e => setSlantForm(f => ({...f, order_image_url: e.target.value}))} />
                    <Input label="Order SKU" value={slantForm.order_sku} onChange={e => setSlantForm(f => ({...f, order_sku: e.target.value}))} />
                    <Input label="Order Item Color" value={slantForm.order_item_color} onChange={e => setSlantForm(f => ({...f, order_item_color: e.target.value}))} required />
                    <Input label="Profile" value={slantForm.profile} onChange={e => setSlantForm(f => ({...f, profile: e.target.value}))} />
                  </div>
                  {/* Submit button can be added here for quote or order */}
                </form>
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
              {!quoteSuccess ? (
                <div className="text-gray-500 text-sm mb-4">
                  Fill out shipping information to see your order summary.
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-semibold">${quoteSuccess.totalPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Printing:</span>
                    <span>${quoteSuccess.printingCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>${quoteSuccess.shippingCost}</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                className="mt-6 w-full px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg shadow hover:from-purple-600 hover:to-indigo-600 transition-colors disabled:opacity-60"
                disabled={isQuoteLoading}
                onClick={async () => {
                  setIsQuoteLoading(true);
                  setQuoteError('');
                  setQuoteSuccess(null);
                  try {
                    const orderData = {
                      email: slantForm.email,
                      phone: slantForm.phone,
                      name: slantForm.name,
                      orderNumber: slantForm.orderNumber,
                      filename: slantForm.filename,
                      fileURL: slantForm.fileURL,
                      bill_to_street_1: slantForm.bill_to_street_1,
                      bill_to_street_2: slantForm.bill_to_street_2,
                      bill_to_street_3: slantForm.bill_to_street_3,
                      bill_to_city: slantForm.bill_to_city,
                      bill_to_state: slantForm.bill_to_state,
                      bill_to_zip: slantForm.bill_to_zip,
                      bill_to_country_as_iso: slantForm.bill_to_country_as_iso,
                      bill_to_is_US_residential: slantForm.bill_to_is_US_residential,
                      ship_to_name: slantForm.ship_to_name,
                      ship_to_street_1: slantForm.ship_to_street_1,
                      ship_to_street_2: slantForm.ship_to_street_2,
                      ship_to_street_3: slantForm.ship_to_street_3,
                      ship_to_city: slantForm.ship_to_city,
                      ship_to_state: slantForm.ship_to_state,
                      ship_to_zip: slantForm.ship_to_zip,
                      ship_to_country_as_iso: slantForm.ship_to_country_as_iso,
                      ship_to_is_US_residential: slantForm.ship_to_is_US_residential,
                      order_item_name: slantForm.order_item_name,
                      order_quantity: slantForm.order_quantity,
                      order_image_url: slantForm.order_image_url,
                      order_sku: slantForm.order_sku,
                      order_item_color: mapColorToSlantAPI(slantForm.order_item_color),
                      profile: 'PLA'
                    };
                    const { data, error } = await supabase.functions.invoke('slant3d-quote', {
                      body: { orderData }
                    });
                    if (error) {
                      setQuoteError(`Connection error: ${error.message}`);
                      return;
                    }
                    if (data.error) {
                      setQuoteError(data.message);
                      return;
                    }
                    setQuoteSuccess(data.data);
                  } catch (err) {
                    setQuoteError(`Network error: ${(err as any).message}`);
                  } finally {
                    setIsQuoteLoading(false);
                  }
                }}
              >
                {isQuoteLoading ? 'Getting Quote...' : 'Get Quote'}
              </button>
              {quoteError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {quoteError}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      <Modal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} title="Get a Quote from Slant">
        {/* Error Display */}
        {quoteError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Quote Error</h3>
                <p className="mt-1 text-sm text-red-700">{quoteError}</p>
              </div>
            </div>
          </div>
        )}
        {/* Success Display */}
        {quoteSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Quote Received!</h3>
                <div className="mt-1 text-sm text-green-700">
                  <p><strong>Total:</strong> ${quoteSuccess.totalPrice}</p>
                  <p><strong>Printing:</strong> ${quoteSuccess.printingCost}</p>
                  <p><strong>Shipping:</strong> ${quoteSuccess.shippingCost}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <form
          className="space-y-4 max-h-[70vh] overflow-y-auto px-1"
          onSubmit={async (e) => {
            e.preventDefault();
            setIsQuoteLoading(true);
            setQuoteError('');
            setQuoteSuccess(null);
            try {
              const orderData = {
                email: slantForm.email,
                phone: slantForm.phone,
                name: slantForm.name,
                orderNumber: slantForm.orderNumber,
                filename: slantForm.filename,
                fileURL: slantForm.fileURL,
                bill_to_street_1: slantForm.bill_to_street_1,
                bill_to_street_2: slantForm.bill_to_street_2,
                bill_to_street_3: slantForm.bill_to_street_3,
                bill_to_city: slantForm.bill_to_city,
                bill_to_state: slantForm.bill_to_state,
                bill_to_zip: slantForm.bill_to_zip,
                bill_to_country_as_iso: slantForm.bill_to_country_as_iso,
                bill_to_is_US_residential: slantForm.bill_to_is_US_residential,
                ship_to_name: slantForm.ship_to_name,
                ship_to_street_1: slantForm.ship_to_street_1,
                ship_to_street_2: slantForm.ship_to_street_2,
                ship_to_street_3: slantForm.ship_to_street_3,
                ship_to_city: slantForm.ship_to_city,
                ship_to_state: slantForm.ship_to_state,
                ship_to_zip: slantForm.ship_to_zip,
                ship_to_country_as_iso: slantForm.ship_to_country_as_iso,
                ship_to_is_US_residential: slantForm.ship_to_is_US_residential,
                order_item_name: slantForm.order_item_name,
                order_quantity: slantForm.order_quantity,
                order_image_url: slantForm.order_image_url,
                order_sku: slantForm.order_sku,
                order_item_color: mapColorToSlantAPI(slantForm.order_item_color),
                profile: 'PLA'
              };
              console.log('📤 Sending order data:', orderData);
              const { data, error } = await supabase.functions.invoke('slant3d-quote', {
                body: { orderData }
              });
              if (error) {
                console.error('❌ Supabase error:', error);
                setQuoteError(`Connection error: ${error.message}`);
                return;
              }
              if (data.error) {
                console.error('❌ API error:', data);
                setQuoteError(data.message);
                return;
              }
              console.log('✅ Quote received:', data);
              setQuoteSuccess(data.data);
            } catch (err) {
              console.error('❌ Network error:', err);
              setQuoteError(`Network error: ${(err as any).message}`);
            } finally {
              setIsQuoteLoading(false);
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={requiredLabel('Name')} value={slantForm.name} onChange={e => setSlantForm(f => ({...f, name: e.target.value}))} required />
            <Input label={requiredLabel('Email')} value={slantForm.email} onChange={e => setSlantForm(f => ({...f, email: e.target.value}))} required />
            <Input label={requiredLabel('Phone')} value={slantForm.phone} onChange={e => setSlantForm(f => ({...f, phone: e.target.value}))} required />
            <Input label={requiredLabel('Order Number')} value={slantForm.orderNumber} onChange={e => setSlantForm(f => ({...f, orderNumber: e.target.value}))} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={requiredLabel('File Name')} value={slantForm.filename} onChange={e => setSlantForm(f => ({...f, filename: e.target.value}))} required />
            <Input label={requiredLabel('File URL')} value={slantForm.fileURL} onChange={e => setSlantForm(f => ({...f, fileURL: e.target.value}))} required />
            <Input label={requiredLabel('Quantity')} value={slantForm.quantity} onChange={e => setSlantForm(f => ({...f, quantity: e.target.value}))} required />
            <Input label={requiredLabel('Color')} value={slantForm.color} onChange={e => setSlantForm(f => ({...f, color: e.target.value}))} required />
            <Input label="Profile" value={slantForm.profile} onChange={e => setSlantForm(f => ({...f, profile: e.target.value}))} />
          </div>
          <div className="pt-2 font-semibold text-gray-700">Billing Address</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={requiredLabel('Street 1')} value={slantForm.bill_to_street_1} onChange={e => setSlantForm(f => ({...f, bill_to_street_1: e.target.value}))} required />
            <Input label="Street 2" value={slantForm.bill_to_street_2} onChange={e => setSlantForm(f => ({...f, bill_to_street_2: e.target.value}))} />
            <Input label="Street 3" value={slantForm.bill_to_street_3} onChange={e => setSlantForm(f => ({...f, bill_to_street_3: e.target.value}))} />
            <Input label={requiredLabel('City')} value={slantForm.bill_to_city} onChange={e => setSlantForm(f => ({...f, bill_to_city: e.target.value}))} required />
            <Input label={requiredLabel('State')} value={slantForm.bill_to_state} onChange={e => setSlantForm(f => ({...f, bill_to_state: e.target.value}))} required />
            <Input label={requiredLabel('Zip')} value={slantForm.bill_to_zip} onChange={e => setSlantForm(f => ({...f, bill_to_zip: e.target.value}))} required />
            <Input label={requiredLabel('Country (ISO)')} value={slantForm.bill_to_country_as_iso} onChange={e => setSlantForm(f => ({...f, bill_to_country_as_iso: e.target.value}))} required />
            <Input label={requiredLabel('US Residential?')} value={slantForm.bill_to_is_US_residential} onChange={e => setSlantForm(f => ({...f, bill_to_is_US_residential: e.target.value}))} required />
          </div>
          <div className="pt-2 font-semibold text-gray-700">Shipping Address</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={requiredLabel('Name')} value={slantForm.ship_to_name} onChange={e => setSlantForm(f => ({...f, ship_to_name: e.target.value}))} required />
            <Input label={requiredLabel('Street 1')} value={slantForm.ship_to_street_1} onChange={e => setSlantForm(f => ({...f, ship_to_street_1: e.target.value}))} required />
            <Input label="Street 2" value={slantForm.ship_to_street_2} onChange={e => setSlantForm(f => ({...f, ship_to_street_2: e.target.value}))} />
            <Input label="Street 3" value={slantForm.ship_to_street_3} onChange={e => setSlantForm(f => ({...f, ship_to_street_3: e.target.value}))} />
            <Input label={requiredLabel('City')} value={slantForm.ship_to_city} onChange={e => setSlantForm(f => ({...f, ship_to_city: e.target.value}))} required />
            <Input label={requiredLabel('State')} value={slantForm.ship_to_state} onChange={e => setSlantForm(f => ({...f, ship_to_state: e.target.value}))} required />
            <Input label={requiredLabel('Zip')} value={slantForm.ship_to_zip} onChange={e => setSlantForm(f => ({...f, ship_to_zip: e.target.value}))} required />
            <Input label={requiredLabel('Country (ISO)')} value={slantForm.ship_to_country_as_iso} onChange={e => setSlantForm(f => ({...f, ship_to_country_as_iso: e.target.value}))} required />
            <Input label={requiredLabel('US Residential?')} value={slantForm.ship_to_is_US_residential} onChange={e => setSlantForm(f => ({...f, ship_to_is_US_residential: e.target.value}))} required />
          </div>
          <div className="pt-2 font-semibold text-gray-700">Order Details</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={requiredLabel('Order Item Name')} value={slantForm.order_item_name} onChange={e => setSlantForm(f => ({...f, order_item_name: e.target.value}))} required />
            <Input label={requiredLabel('Order Quantity')} value={slantForm.order_quantity} onChange={e => setSlantForm(f => ({...f, order_quantity: e.target.value}))} required />
            <Input label="Order Image URL" value={slantForm.order_image_url} onChange={e => setSlantForm(f => ({...f, order_image_url: e.target.value}))} />
            <Input label="Order SKU" value={slantForm.order_sku} onChange={e => setSlantForm(f => ({...f, order_sku: e.target.value}))} />
            <Input label={requiredLabel('Order Item Color')} value={slantForm.order_item_color} onChange={e => setSlantForm(f => ({...f, order_item_color: e.target.value}))} required />
            <Input label="Profile" value={slantForm.profile} onChange={e => setSlantForm(f => ({...f, profile: e.target.value}))} />
          </div>
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg shadow hover:from-purple-600 hover:to-indigo-600 transition-colors disabled:opacity-60"
              disabled={isQuoteLoading}
            >
              {isQuoteLoading ? 'Getting Quote...' : 'Get Quote'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}