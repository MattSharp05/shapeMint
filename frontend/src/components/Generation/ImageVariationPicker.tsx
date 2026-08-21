import { useEffect, useState } from 'react';
import { Check, RefreshCw, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '../UI/Button';

interface ImageVariationPickerProps {
  images: string[];
  onSelect: (image: string) => void;
  onRegenerate: () => void;
  loading: boolean;
  /** How many variation slots to render (default 4). */
  slotCount?: number;
}

export function ImageVariationPicker({
  images,
  onSelect,
  onRegenerate,
  loading,
  slotCount = 4,
}: ImageVariationPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);

  const slots = Array.from({ length: slotCount }, (_, i) => i);

  // Single-slot mode: auto-select the only image as soon as it loads so the
  // user can continue immediately without clicking the image first.
  useEffect(() => {
    if (slotCount === 1 && images[0]) setSelectedIndex(0);
  }, [slotCount, images]);

  // Count how many images have actually loaded
  const loadedImages = images.filter(Boolean);
  const loadedCount = loadedImages.length;
  const allLoaded = !loading && loadedCount >= slotCount;
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
    let prev = carouselIndex === 0 ? slotCount - 1 : carouselIndex - 1;
    for (let attempts = 0; attempts < slotCount; attempts++) {
      if (images[prev]) break;
      prev = prev === 0 ? slotCount - 1 : prev - 1;
    }
    setCarouselIndex(prev);
  };

  const goToNext = () => {
    if (carouselIndex === null) return;
    // Skip to next loaded image
    let next = carouselIndex === slotCount - 1 ? 0 : carouselIndex + 1;
    for (let attempts = 0; attempts < slotCount; attempts++) {
      if (images[next]) break;
      next = next === slotCount - 1 ? 0 : next + 1;
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
      <h3 className="text-lg font-semibold text-white">
        {loading && !hasAnyImages
          ? (slotCount === 1 ? 'Generating Your Design...' : 'Generating Variations...')
          : (slotCount === 1 ? 'Your Design' : 'Choose Your Variation')}
      </h3>
      {hasAnyImages && (
        <p className="text-sm text-white/60">
          {loading
            ? `${loadedCount}/${slotCount} variations ready. Select the image that best matches your vision.`
            : slotCount === 1
              ? 'Confirm this design to continue, or regenerate for a new one. Click to view full size.'
              : 'Select the image that best matches your vision. Click to view full size.'}
        </p>
      )}

      {/* Grid view — always show all slots */}
      <div className={slotCount === 1 ? 'grid grid-cols-1 max-w-sm mx-auto' : 'grid grid-cols-2 gap-4'}>
        {slots.map((index) => {
          const url = images[index];
          if (url) {
            return (
              <button
                key={index}
                onClick={() => openCarousel(index)}
                className={`relative aspect-square rounded-lg overflow-hidden border-3 transition-all ${
                  selectedIndex === index
                    ? 'border-brand-primary ring-2 ring-brand-primary ring-offset-2'
                    : 'border-white/20 hover:border-white/40'
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
              className="aspect-square rounded-lg bg-white/5 animate-pulse flex items-center justify-center"
            >
              <Loader2 className="h-8 w-8 text-white/30 animate-spin" />
            </div>
          );
        })}
      </div>

      {!loading && !hasAnyImages && (
        <p className="text-sm text-white/50 text-center">
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
            {slotCount === 1 ? 'Continue' : 'Confirm Selection'}
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

              {/* Arrows — only when there's more than one image to flip through */}
              {loadedCount > 1 && (
                <>
                  <button
                    onClick={goToPrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Selected indicator */}
              {selectedIndex === carouselIndex && (
                <div className="absolute top-4 right-4 bg-brand-primary text-white rounded-full p-1.5">
                  <Check className="h-5 w-5" />
                </div>
              )}
            </div>

            {/* Dots indicator — pointless with a single slot */}
            {slotCount > 1 && (
              <div className="flex items-center gap-2 mt-4">
                {slots.map((idx) => (
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
            )}

            {/* Caption + select button */}
            <div className="mt-4 flex items-center gap-4">
              {slotCount > 1 && (
                <span className="text-white/60 text-sm">
                  Option {carouselIndex + 1} of {loadedCount}
                </span>
              )}
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
