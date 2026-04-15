// Phase 6: InfoCollection is now a lightweight "review & confirm"
// screen. Shipping address is collected at checkout (not before 3D gen),
// and account creation for anonymous users happens via SaveAccountModal
// earlier in the flow. This component just lets the user review their
// selected variation + angle views and launch the 3D generation.

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../UI/Button';
import { FadeIn, FadeInUp } from '../Motion';
import { useAuth } from '../../hooks/useAuth';

// Minimal payload passed back up — downstream only needs the user id.
export interface CollectedInfo {
  userId: string;
  email: string;
}

interface InfoCollectionProps {
  selectedImage: string;
  prompt: string;
  onSubmit: (info: CollectedInfo) => void;
  /** Called when an anonymous user tries to submit. The parent should open the save-account modal. */
  onRequireAccount?: () => void;
  loading?: boolean;
  angleImages?: string[] | null;
  angleLabels?: string[];
}

export function InfoCollection({
  selectedImage,
  prompt,
  onSubmit,
  onRequireAccount,
  loading,
  angleImages,
  angleLabels,
}: InfoCollectionProps) {
  const { user } = useAuth();
  const [carouselIdx, setCarouselIdx] = useState(0);

  const allImages = angleImages && angleImages.length > 0
    ? [selectedImage, ...angleImages]
    : [selectedImage];
  const allLabels = angleImages && angleLabels
    ? ['Selected', ...angleLabels]
    : ['Selected'];

  const handleGenerate = () => {
    if (!user) return;
    if (user.isAnonymous) {
      onRequireAccount?.();
      return;
    }
    onSubmit({ userId: user.id, email: user.email });
  };

  return (
    <div className="pt-16 min-h-screen bg-brand-dark">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col lg:flex-row">
          {/* Left — Image carousel */}
          <FadeIn x={-20} duration={0.7} className="lg:w-[50%] bg-brand-dark-lighter lg:min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-[500px]">
              <div className="relative">
                <img
                  src={allImages[carouselIdx]}
                  alt={allLabels[carouselIdx] || 'Design preview'}
                  className="w-full rounded-2xl shadow-2xl"
                />
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCarouselIdx((carouselIdx - 1 + allImages.length) % allImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setCarouselIdx((carouselIdx + 1) % allImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1.5 rounded-full">
                      <span className="text-xs text-white font-medium">{allLabels[carouselIdx]}</span>
                    </div>
                  </>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === carouselIdx ? 'bg-brand-accent w-4' : 'bg-white/20'}`}
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-white/50 mt-4 text-center truncate">{prompt}</p>
            </div>
          </FadeIn>

          {/* Right — Confirm */}
          <div className="lg:w-[50%] lg:min-h-[calc(100vh-4rem)] lg:overflow-y-auto border-l border-white/5">
            <div className="p-6 lg:p-10 max-w-md mx-auto">
              <FadeIn delay={0.2} y={12}>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Ready to generate
                </h1>
                <p className="text-sm text-white/40 mb-8">
                  Review your design and your four angle views. We'll turn them into a 3D model —
                  you can order a physical print on the next step, with shipping details collected at checkout.
                </p>
              </FadeIn>

              <FadeInUp delay={0.3}>
                {user?.isAnonymous && (
                  <div className="mb-5 p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg text-sm text-amber-200">
                    Save a free account before generating so you can access your model later.
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  className="w-full"
                  size="lg"
                  loading={loading}
                >
                  {user?.isAnonymous ? 'Create account & generate' : 'Generate my 3D model'}
                </Button>

                <p className="text-xs text-white/40 text-center mt-4">
                  3D generation takes a few minutes. You can leave this page — we'll email you when it's ready.
                </p>
              </FadeInUp>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
