import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface GenerationProgressProps {
  progress: number;
  status: 'pending' | 'generating' | 'repairing' | 'completed' | 'failed';
  estimatedTime?: string;
}

const LOADING_PHRASES = [
  'Generating your 3D model...',
  'Building geometry from your description...',
  'Sculpting shape and form...',
  'Refining mesh topology...',
  'Adding surface detail...',
  'Applying textures and materials...',
  'Optimizing for print quality...',
  'Your creation is taking shape...',
  'Almost there...',
];

export function GenerationProgress({ progress, status, estimatedTime }: GenerationProgressProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (status !== 'generating' && status !== 'repairing') return;
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % LOADING_PHRASES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === 'pending' || status === 'completed') return null;

  const isActive = status === 'generating' || status === 'repairing';
  const isFailed = status === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/90 backdrop-blur-sm">
      <div className="max-w-sm w-full mx-4 text-center animate-fade-in">
        {isFailed ? (
          <>
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Generation Failed</h3>
            <p className="text-sm text-white/40">Something went wrong. Please try again.</p>
          </>
        ) : (
          <>
            {/* Progress ring */}
            <div className="relative mx-auto w-24 h-24 mb-6">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="#EDAE49" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - Math.max(progress, 3) / 100)}`}
                  className="transition-all duration-700 ease-out"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(237, 174, 73, 0.4))' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-semibold text-white">{Math.round(progress)}%</span>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-1">
              {status === 'repairing' ? 'Preparing for Print' : 'Creating Your Model'}
            </h3>

            <p className="text-sm text-white/30 h-5 transition-opacity duration-500 mb-6">
              {estimatedTime || LOADING_PHRASES[phraseIndex]}
            </p>

            {/* Thin progress bar */}
            <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
              <div
                className="bg-brand-accent h-1 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(progress, 3)}%` }}
              />
            </div>

            <p className="text-xs text-white/40 mt-4">
              Usually takes 1-3 minutes
            </p>
          </>
        )}
      </div>
    </div>
  );
}
