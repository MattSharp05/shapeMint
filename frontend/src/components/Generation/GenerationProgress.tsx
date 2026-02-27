import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card } from '../UI/Card';

interface GenerationProgressProps {
  progress: number;
  status: 'pending' | 'generating' | 'repairing' | 'completed' | 'failed';
  estimatedTime?: string;
}

export function GenerationProgress({ progress, status, estimatedTime }: GenerationProgressProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Initializing generation...';
      case 'generating':
        return 'Generating your 3D model...';
      case 'repairing':
        return 'Repairing mesh for 3D printing...';
      case 'completed':
        return 'Generation completed!';
      case 'failed':
        return 'Generation failed. Please try again.';
    }
  };

  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900">{getStatusText()}</h3>
          {estimatedTime && (status === 'generating' || status === 'repairing') && (
            <p className="text-sm text-gray-500 mt-1">
              Estimated time: {estimatedTime}
            </p>
          )}
        </div>

        {(status === 'generating' || status === 'repairing') && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-brand-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="text-sm text-gray-500">
          {progress}% complete
        </div>
      </div>
    </Card>
  );
}