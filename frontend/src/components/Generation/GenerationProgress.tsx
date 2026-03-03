import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface GenerationProgressProps {
  progress: number;
  status: 'pending' | 'generating' | 'repairing' | 'completed' | 'failed';
  estimatedTime?: string;
}

const LOADING_PHRASES = [
  'Warming up the 3D printer...',
  'Teaching pixels to think in three dimensions...',
  'Sculpting your idea into reality...',
  'Convincing polygons to cooperate...',
  'Adding the third dimension...',
  'Generating mesh topology...',
  'Optimizing geometry...',
  'Building your model layer by layer...',
  'Almost there, applying the finishing touches...',
  'Making it look awesome...',
  'Running the shape calculator...',
  'Assembling vertices and faces...',
  'Smoothing out the edges...',
  'Your creation is taking shape...',
];

export function GenerationProgress({ progress, status, estimatedTime }: GenerationProgressProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Rotate through fun phrases
  useEffect(() => {
    if (status !== 'generating' && status !== 'repairing') return;
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % LOADING_PHRASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [status]);

  // Don't show modal for pending or completed
  if (status === 'pending' || status === 'completed') return null;

  const isActive = status === 'generating' || status === 'repairing';
  const isFailed = status === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center">
        {/* Icon */}
        <div className="mb-6">
          {isFailed ? (
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
          ) : (
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
              <div
                className="absolute inset-0 rounded-full border-4 border-brand-primary border-t-transparent animate-spin"
                style={{ animationDuration: '1.5s' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-brand-primary">{Math.round(progress)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Status text */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {isFailed
            ? 'Generation Failed'
            : status === 'repairing'
            ? 'Preparing for 3D Printing'
            : 'Creating Your 3D Model'}
        </h3>

        {/* Fun rotating phrase */}
        {isActive && (
          <p className="text-gray-500 text-sm mb-6 h-5 transition-opacity duration-500">
            {LOADING_PHRASES[phraseIndex]}
          </p>
        )}

        {isFailed && (
          <p className="text-gray-500 text-sm mb-6">
            Something went wrong. Please try again.
          </p>
        )}

        {/* Progress bar */}
        {isActive && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-primary to-blue-500 h-3 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(progress, 5)}%` }}
              />
            </div>
            {estimatedTime && (
              <p className="text-xs text-gray-400 mt-2">{estimatedTime}</p>
            )}
          </div>
        )}

        {/* Don't refresh warning */}
        {isActive && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-4">
            <p className="text-amber-700 text-sm font-medium">
              Please don't refresh the page
            </p>
            <p className="text-amber-600 text-xs mt-1">
              This usually takes 1-3 minutes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
