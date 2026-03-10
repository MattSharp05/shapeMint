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
  quoteData?: { quoteId: string; priceTotal: number; currency: string; reused?: boolean; expiresAt?: string; itemTotal?: number; surcharge?: number; shippingTotal?: number };
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
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Shipping Information</h2>
        <p className="text-sm text-white/40">Enter your shipping details to get an accurate quote</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name *"
            value={shippingInfo.firstName || ''}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Enter first name"
            error={errors.firstName}
          />
          <Input
            label="Last Name *"
            value={shippingInfo.lastName || ''}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Enter last name"
            error={errors.lastName}
          />
        </div>

        <Input
          label="Email *"
          value={shippingInfo.email || ''}
          onChange={(e) => handleInputChange('email' as any, e.target.value)}
          placeholder="Enter email"
          error={errors.email}
        />

        <Input
          label="Address Line 1 *"
          value={shippingInfo.address1 || ''}
          onChange={(e) => handleInputChange('address1', e.target.value)}
          placeholder="Enter street address"
          error={errors.address1}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Address Line 2"
            value={shippingInfo.address2 || ''}
            onChange={(e) => handleInputChange('address2', e.target.value)}
            placeholder="Apt, suite, etc. (optional)"
          />
          <Input
            label="Company"
            value={shippingInfo.company || ''}
            onChange={(e) => handleInputChange('company', e.target.value)}
            placeholder="Company (optional)"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="City *"
            value={shippingInfo.city || ''}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder="Enter city"
            error={errors.city}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-white/70">
              State *
            </label>
            <select
              value={shippingInfo.state || ''}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 [&>option]:bg-brand-dark [&>option]:text-white ${
                errors.state ? 'border-red-500/50' : 'border-white/10'
              }`}
            >
              <option value="">Select state</option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
            {errors.state && <p className="text-red-400 text-xs mt-1">{errors.state}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Postal Code *"
            value={shippingInfo.postalCode || ''}
            onChange={(e) => handleInputChange('postalCode', e.target.value)}
            placeholder="Enter ZIP code"
            error={errors.postalCode}
          />
          <Input
            label="Country"
            value="United States"
            disabled
          />
        </div>

        <Input
          label="Phone Number *"
          value={shippingInfo.phone || ''}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          placeholder="Enter phone number"
          type="tel"
          error={errors.phone}
        />
      </div>

      {/* Error Messages */}
      {quoteError && (
        <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-400">Quote Error</h3>
          <p className="mt-1 text-sm text-red-400/80">{quoteError}</p>
        </div>
      )}

      {orderError && (
        <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-400">Order Error</h3>
          <p className="mt-1 text-sm text-red-400/80">{orderError}</p>
        </div>
      )}

      {/* Quote Success */}
      {quoteData && (
        <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-400 mb-2">Quote Ready</h3>
          <div className="text-sm text-white/60 space-y-1">
            {quoteData.itemTotal !== undefined && (
              <div className="flex justify-between">
                <span>Item Cost:</span>
                <span className="font-medium text-white">${quoteData.itemTotal.toFixed(2)} {quoteData.currency}</span>
              </div>
            )}
            {quoteData.surcharge !== undefined && quoteData.surcharge > 0 && (
              <div className="flex justify-between">
                <span>Surcharge:</span>
                <span className="font-medium text-white">${quoteData.surcharge.toFixed(2)} {quoteData.currency}</span>
              </div>
            )}
            {(quoteData.shippingTotal !== undefined && quoteData.shippingTotal !== null) && (
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="font-medium text-white">${quoteData.shippingTotal.toFixed(2)} {quoteData.currency}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-green-500/20">
              <span className="font-semibold text-white">Total Price:</span>
              <span className="font-semibold text-green-400">${quoteData.priceTotal.toFixed(2)} {quoteData.currency}</span>
            </div>
            {quoteData.reused && (
              <p className="text-xs text-white/30 mt-1">(Using recent quote)</p>
            )}
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
              {isOrderLoading ? 'Processing...' : 'Continue to Payment'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
