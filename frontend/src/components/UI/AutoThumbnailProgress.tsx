import { useState } from 'react';
import { Camera, Play, Square, AlertCircle, CheckCircle } from 'lucide-react';

interface AutoThumbnailProgress {
  total: number;
  processed: number;
  current: string | null;
  isGenerating: boolean;
  error: string | null;
}

interface AutoThumbnailProgressProps {
  progress: AutoThumbnailProgress;
  onStop?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function AutoThumbnailProgress({ 
  progress, 
  onStop, 
  onRetry, 
  className = '' 
}: AutoThumbnailProgressProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  const { total, processed, current, isGenerating, error } = progress;
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
  const isComplete = !isGenerating && processed > 0 && processed === total;
  const hasError = !isGenerating && error;

  // Don't show if there's nothing to process and no active generation
  if (!isGenerating && total === 0 && processed === 0 && !error) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className={`bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 ${
        isMinimized ? 'w-64' : 'w-80'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded ${
              isComplete ? 'bg-green-100' : 
              hasError ? 'bg-red-100' : 
              'bg-blue-100'
            }`}>
              {isComplete ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : hasError ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <Camera className={`h-4 w-4 text-blue-600 ${isGenerating ? 'animate-pulse' : ''}`} />
              )}
            </div>
            <h3 className="text-sm font-medium text-gray-900">
              Auto-Thumbnail Generation
            </h3>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={isMinimized ? 'Expand' : 'Minimize'}
              aria-label={isMinimized ? 'Expand' : 'Minimize'}
              {isMinimized ? (
                <Play className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Square className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            
            {isGenerating && onStop && (
              <button
                onClick={onStop}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Stop generation"
              >
                <Square className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-4 space-y-3">
            {/* Progress Bar */}
            {total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{processed} of {total} completed</span>
                  <span>{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isComplete ? 'bg-green-500' : 
                      hasError ? 'bg-red-500' : 
                      'bg-blue-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Current Status */}
            {isGenerating && current && (
              <div className="text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Processing: {current}</span>
                </div>
              </div>
            )}

            {/* Completion Message */}
            {isComplete && (
              <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                ✅ Successfully generated {processed} thumbnail{processed !== 1 ? 's' : ''}!
              </div>
            )}

            {/* Error Message */}
            {hasError && (
              <div className="space-y-2">
                <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
                  ❌ {error}
                </div>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <Play className="h-3 w-3" />
                    <span>Retry Generation</span>
                  </button>
                )}
              </div>
            )}

            {/* Info Message for No Models */}
            {!isGenerating && total === 0 && !error && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                ℹ️ All your models already have thumbnails!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
