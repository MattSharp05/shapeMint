import { useState } from 'react';
import { Check, RefreshCw, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);

  // Count how many images have actually loaded
  const loadedImages = images.filter(Boolean);
  const loadedCount = loadedImages.length;
  const allLoaded = !loading && loadedCount >= 4;
  const hasAnyImages = loadedCount > 0;

  const handleConfirm = () => {
    if (selectedIndex !== null && images[selectedIndex]) {
      onSelect(images[selectedIndex]);
    }
  };

  const openCarousel = (index: number) => {
    if (images[index]) {
      setCarouselIndex(index);
    }
  };

  const closeCarousel = () => {
    setCarouselIndex(null);
  };

  const goToPrev = () => {
    if (carouselIndex === null) return;
    // Skip to previous loaded image
    let prev = carouselIndex === 0 ? 3 : carouselIndex - 1;
    for (let attempts = 0; attempts < 4; attempts++) {
      if (images[prev]) break;
      prev = prev === 0 ? 3 : prev - 1;
    }
    setCarouselIndex(prev);
  };

  const goToNext = () => {
    if (carouselIndex === null) return;
    // Skip to next loaded image
    let next = carouselIndex === 3 ? 0 : carouselIndex + 1;
    for (let attempts = 0; attempts < 4; attempts++) {
      if (images[next]) break;
      next = next === 3 ? 0 : next + 1;
    }
    setCarouselIndex(next);
  };

  const selectFromCarousel = () => {
    if (carouselIndex !== null) {
      setSelectedIndex(carouselIndex);
      setCarouselIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {loading && !hasAnyImages ? 'Generating Variations...' : 'Choose Your Variation'}
      </h3>
      {hasAnyImages && (
        <p className="text-sm text-gray-600">
          {loading
            ? `${loadedCount}/4 variations ready. Select the image that best matches your vision.`
            : 'Select the image that best matches your vision. Click to view full size.'}
        </p>
      )}

      {/* Grid view — always show 4 slots */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((index) => {
          const url = images[index];
          if (url) {
            return (
              <button
                key={index}
                onClick={() => openCarousel(index)}
                className={`relative aspect-square rounded-lg overflow-hidden border-3 transition-all ${
                  selectedIndex === index
                    ? 'border-brand-primary ring-2 ring-brand-primary ring-offset-2'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={url}
                  alt={`Variation ${index + 1}`}
                  className="w-full h-full object-cover animate-fadeIn"
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
            );
          }
          // Loading placeholder
          return (
            <div
              key={index}
              className="aspect-square rounded-lg bg-gray-100 animate-pulse flex items-center justify-center"
            >
              <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
            </div>
          );
        })}
      </div>

      {!loading && !hasAnyImages && (
        <p className="text-sm text-gray-500 text-center">
          This may take 15-30 seconds...
        </p>
      )}

      {/* Action buttons — show as soon as any image is loaded */}
      {hasAnyImages && (
        <div className="flex gap-3">
          <Button
            onClick={handleConfirm}
            disabled={selectedIndex === null || !images[selectedIndex]}
            className="flex-1"
            size="lg"
          >
            Confirm Selection
          </Button>
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={loading}
            icon={RefreshCw}
          >
            Regenerate
          </Button>
        </div>
      )}

      {/* Carousel overlay */}
      {carouselIndex !== null && images[carouselIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeCarousel}
        >
          <div
            className="relative max-w-2xl w-full mx-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeCarousel}
              className="absolute -top-12 right-0 p-2 text-white/60 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Image */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden">
              <img
                src={images[carouselIndex]}
                alt={`Variation ${carouselIndex + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Left arrow */}
              <button
                onClick={goToPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {/* Right arrow */}
              <button
                onClick={goToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              {/* Selected indicator */}
              {selectedIndex === carouselIndex && (
                <div className="absolute top-4 right-4 bg-brand-primary text-white rounded-full p-1.5">
                  <Check className="h-5 w-5" />
                </div>
              )}
            </div>

            {/* Dots indicator */}
            <div className="flex items-center gap-2 mt-4">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  onClick={() => images[idx] && setCarouselIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === carouselIndex
                      ? 'bg-white scale-125'
                      : idx === selectedIndex
                        ? 'bg-brand-primary'
                        : images[idx]
                          ? 'bg-white/30 hover:bg-white/50'
                          : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Caption + select button */}
            <div className="mt-4 flex items-center gap-4">
              <span className="text-white/60 text-sm">
                Option {carouselIndex + 1} of {loadedCount}
              </span>
              <button
                onClick={selectFromCarousel}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedIndex === carouselIndex
                    ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/40'
                    : 'bg-brand-primary text-white hover:bg-brand-primary/90'
                }`}
              >
                {selectedIndex === carouselIndex ? 'Selected' : 'Select This Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
