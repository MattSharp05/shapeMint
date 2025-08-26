import { Check, AlertCircle } from 'lucide-react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Vendor } from '../../types/order';

interface VendorSelectionProps {
  vendors: Vendor[];
  selectedVendorId?: string;
  onVendorSelect: (vendorId: string) => void;
  onNext: () => void;
}

export function VendorSelection({ vendors, selectedVendorId, onVendorSelect, onNext }: VendorSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Printing Vendor</h2>
        <p className="text-gray-600">Select a vendor to see available materials and get your quote</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {vendors.map((vendor) => (
          <Card
            key={vendor.id}
            className={`cursor-pointer transition-all duration-200 ${
              vendor.enabled
                ? selectedVendorId === vendor.id
                  ? 'ring-2 ring-blue-500 border-blue-500'
                  : 'hover:border-gray-300 hover:shadow-md'
                : 'opacity-50 cursor-not-allowed bg-gray-50'
            }`}
            onClick={() => vendor.enabled && onVendorSelect(vendor.id)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-gray-900">{vendor.name}</h3>
                    {selectedVendorId === vendor.id && vendor.enabled && (
                      <Check className="w-5 h-5 text-blue-500" />
                    )}
                    {!vendor.enabled && (
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  {vendor.description && (
                    <p className="text-gray-600 text-sm mb-3">{vendor.description}</p>
                  )}
                  
                  {!vendor.enabled && (
                    <div className="text-xs text-gray-500 italic">
                      Not available yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!selectedVendorId}
          className="px-6 py-2"
        >
          Next: Select Material
        </Button>
      </div>
    </div>
  );
}
