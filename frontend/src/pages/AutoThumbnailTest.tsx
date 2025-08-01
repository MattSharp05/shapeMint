import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAutoThumbnail } from '../hooks/useAutoThumbnail';
import { AutoThumbnailProgress } from '../components/UI/AutoThumbnailProgress';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { Camera, RotateCcw } from 'lucide-react';

export function AutoThumbnailTest() {
  const { user } = useAuth();
  const [manualTrigger, setManualTrigger] = useState(false);
  
  const {
    progress,
    isGenerating,
    triggerAutoGeneration,
    stopGeneration,
    completionPercentage
  } = useAutoThumbnail({ 
    triggerOnMount: manualTrigger 
  });

  const handleManualTrigger = async () => {
    setManualTrigger(false);
    await triggerAutoGeneration();
  };

  if (!user) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please log in to test auto-thumbnail generation
          </h1>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Auto-Thumbnail Generation Test
          </h1>
          <p className="text-xl text-gray-600">
            Test the automatic thumbnail generation system for your models
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Test Controls
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={handleManualTrigger}
                  disabled={isGenerating}
                  icon={Camera}
                  className="w-full"
                >
                  {isGenerating ? 'Generating...' : 'Start Auto-Generation'}
                </Button>
                
                <Button
                  onClick={stopGeneration}
                  disabled={!isGenerating}
                  variant="outline"
                  icon={RotateCcw}
                  className="w-full"
                >
                  Stop Generation
                </Button>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Status</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">User:</span>
                    <span className="ml-2 font-medium">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2 font-medium">
                      {isGenerating ? 'Processing' : 'Idle'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Models to Process:</span>
                    <span className="ml-2 font-medium">{progress.total}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Completion:</span>
                    <span className="ml-2 font-medium">{completionPercentage}%</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Progress Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Generation Progress
            </h2>
            
            <div className="space-y-4">
              {progress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progress</span>
                    <span>{progress.processed} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {progress.current && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-700">
                      Processing: {progress.current}
                    </span>
                  </div>
                </div>
              )}

              {progress.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-sm text-red-700">
                    Error: {progress.error}
                  </span>
                </div>
              )}

              {!isGenerating && progress.total === 0 && !progress.error && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-sm text-gray-700">
                    ℹ️ All your models already have thumbnails!
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Debug Information */}
        <Card className="p-6 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Debug Information
          </h2>
          
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm overflow-auto">
            <pre>{JSON.stringify(progress, null, 2)}</pre>
          </div>
        </Card>
      </div>

      {/* Progress Component */}
      <AutoThumbnailProgress
        progress={progress}
        onStop={stopGeneration}
        onRetry={triggerAutoGeneration}
      />
    </div>
  );
}
