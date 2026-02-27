import { useState } from 'react';
import { Check, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../UI/Button';

interface ImageVariationPickerProps {
  images: string[];
  onSelect: (image: string) => void;
  onRegenerate: () => void;
  loading: boolean;
}

export function ImageVariationPicker({
  images,
  onSelect,
  onRegenerate,
  loading,
}: ImageVariationPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleConfirm = () => {
    if (selectedIndex !== null && images[selectedIndex]) {
      onSelect(images[selectedIndex]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Generating Variations...
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-gray-100 animate-pulse flex items-center justify-center"
            >
              <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 text-center">
          This may take 15-30 seconds...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Choose Your Variation
      </h3>
      <p className="text-sm text-gray-600">
        Select the image that best matches your vision. This will be used to generate your 3D model.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {images.map((url, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`relative aspect-square rounded-lg overflow-hidden border-3 transition-all ${
              selectedIndex === index
                ? 'border-brand-primary ring-2 ring-brand-primary ring-offset-2'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <img
              src={url}
              alt={`Variation ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {selectedIndex === index && (
              <div className="absolute top-2 right-2 bg-brand-primary text-white rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs py-1 text-center">
              Option {index + 1}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleConfirm}
          disabled={selectedIndex === null}
          className="flex-1"
          size="lg"
        >
          Use This Image
        </Button>
        <Button
          variant="outline"
          onClick={onRegenerate}
          icon={RefreshCw}
        >
          Regenerate
        </Button>
      </div>
    </div>
  );
}
