import { useState } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { ShippingInfo, US_STATES } from '../../types/order';

interface ShippingFormProps {
  shippingInfo: Partial<ShippingInfo>;
  onShippingInfoChange: (info: Partial<ShippingInfo>) => void;
  onBack: () => void;
  onGetQuote: () => void;
  isQuoteLoading?: boolean;
  quoteError?: string;
  quoteData?: { quoteId: string; priceTotal: number; currency: string; reused?: boolean; expiresAt?: string; itemTotal?: number; surcharge?: number };
  onPlaceOrder?: () => void;
  isOrderLoading?: boolean;
  orderError?: string;
}

export function ShippingForm({
  shippingInfo,
  onShippingInfoChange,
  onBack,
  onGetQuote,
  isQuoteLoading = false,
  quoteError,
  quoteData,
  onPlaceOrder,
  isOrderLoading = false,
  orderError,
}: ShippingFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof ShippingInfo, value: string) => {
    onShippingInfoChange({ ...shippingInfo, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!shippingInfo.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!shippingInfo.lastName?.trim()) newErrors.lastName = 'Last name is required';
  if (!shippingInfo.address1?.trim()) newErrors.address1 = 'Address is required';
  if (!shippingInfo.email?.trim()) newErrors.email = 'Email is required';
    if (!shippingInfo.city?.trim()) newErrors.city = 'City is required';
    if (!shippingInfo.state?.trim()) newErrors.state = 'State is required';
    if (!shippingInfo.postalCode?.trim()) newErrors.postalCode = 'Postal code is required';
    if (!shippingInfo.phone?.trim()) newErrors.phone = 'Phone number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGetQuote = () => {
    if (validateForm()) {
      onGetQuote();
    }
  };

  const isFormValid = () => {
  return shippingInfo.firstName && shippingInfo.lastName && shippingInfo.address1 && 
       shippingInfo.city && shippingInfo.state && shippingInfo.postalCode && shippingInfo.phone && shippingInfo.email;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Shipping Information</h2>
        <p className="text-gray-600">Enter your shipping details to get an accurate quote</p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              label="First Name *"
              value={shippingInfo.firstName || ''}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="Enter first name"
              error={errors.firstName}
            />
          </div>

          <div>
            <Input
              label="Last Name *"
              value={shippingInfo.lastName || ''}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Enter last name"
              error={errors.lastName}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Middle Name"
              value={shippingInfo.middleName || ''}
              onChange={(e) => handleInputChange('middleName', e.target.value)}
              placeholder="Enter middle name (optional)"
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Company"
              value={shippingInfo.company || ''}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Enter company name (optional)"
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Email *"
              value={shippingInfo.email || ''}
              onChange={(e) => handleInputChange('email' as any, e.target.value)}
              placeholder="Enter email"
              error={errors.email}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Address Line 1 *"
              value={shippingInfo.address1 || ''}
              onChange={(e) => handleInputChange('address1', e.target.value)}
              placeholder="Enter street address"
              error={errors.address1}
            />
          </div>

          <div>
            <Input
              label="Address Line 2"
              value={shippingInfo.address2 || ''}
              onChange={(e) => handleInputChange('address2', e.target.value)}
              placeholder="Apt, suite, etc. (optional)"
            />
          </div>

          <div>
            <Input
              label="Address Line 3"
              value={shippingInfo.address3 || ''}
              onChange={(e) => handleInputChange('address3', e.target.value)}
              placeholder="Additional address info (optional)"
            />
          </div>

          <div>
            <Input
              label="City *"
              value={shippingInfo.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="Enter city"
              error={errors.city}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State *
            </label>
            <select
              value={shippingInfo.state || ''}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.state ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select state</option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
            {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
          </div>

          <div>
            <Input
              label="Postal Code *"
              value={shippingInfo.postalCode || ''}
              onChange={(e) => handleInputChange('postalCode', e.target.value)}
              placeholder="Enter ZIP code"
              error={errors.postalCode}
            />
          </div>

          <div>
            <Input
              label="Country"
              value="United States"
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Phone Number *"
              value={shippingInfo.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter phone number"
              type="tel"
              error={errors.phone}
            />
          </div>
        </div>
      </Card>

      <div className="mt-3 text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
        <strong>Note:</strong> A minimum order surcharge applies to items subtotal. If your items subtotal is less than $25.00, a surcharge will be added to bring the items subtotal up to $25.00 (shipping is added after).
      </div>

      {/* Error Messages */}
      {quoteError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-600">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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

      {orderError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-600">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Order Error</h3>
              <p className="mt-1 text-sm text-red-700">{orderError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quote Success */}
      {quoteData && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="text-green-600">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">Quote Ready</h3>
              <div className="mt-1">
                <p className="text-sm text-green-700">
                  Total Price: <span className="font-semibold">${quoteData.priceTotal.toFixed(2)} {quoteData.currency}</span>
                </p>
                {quoteData.reused && (
                  <p className="text-xs text-green-600 mt-1">(Using recent quote)</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between space-x-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="px-6 py-2"
        >
          Back
        </Button>
        
        <div className="flex space-x-3">
          <Button
            onClick={handleGetQuote}
            disabled={!isFormValid() || isQuoteLoading}
            className="px-6 py-2"
            variant="outline"
          >
            {isQuoteLoading ? 'Getting Quote...' : 'Get Quote'}
          </Button>
          
          {quoteData && onPlaceOrder && (
            <Button
              onClick={onPlaceOrder}
              disabled={isOrderLoading}
              className="px-6 py-2"
            >
              {isOrderLoading ? 'Placing Order...' : 'Place Order'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
