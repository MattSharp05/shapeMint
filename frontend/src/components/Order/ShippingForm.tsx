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
}

export function ShippingForm({
  shippingInfo,
  onShippingInfoChange,
  onBack,
  onGetQuote,
  isQuoteLoading = false,
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
           shippingInfo.city && shippingInfo.state && shippingInfo.postalCode && shippingInfo.phone;
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

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="px-6 py-2"
        >
          Back
        </Button>
        <Button
          onClick={handleGetQuote}
          disabled={!isFormValid() || isQuoteLoading}
          className="px-6 py-2"
        >
          {isQuoteLoading ? 'Getting Quote...' : 'Get Quote'}
        </Button>
      </div>

      {!isFormValid() && (
        <div className="text-center">
          <p className="text-sm text-gray-500 italic">
            Phase 2: Vendor quote integration coming soon
          </p>
        </div>
      )}
    </div>
  );
}
