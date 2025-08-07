// pages/ComfyUITest.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, Zap, Info, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { ModelViewer } from '../components/3D/ModelViewer';
import { comfyUITestService } from '../services/comfyUITestService';
import { useAuth } from '../hooks/useAuth';

export function ComfyUITest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');
  const [polling, setPolling] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Test ComfyUI server connection
  const testConnection = async () => {
    console.log('🔍 Testing ComfyUI connection...');
    try {
      const result = await comfyUITestService.testConnection();
      console.log('Connection test result:', result);
      setConnectionStatus(result);
    } catch (error: any) {
      console.error('Connection test error:', error);
      setConnectionStatus({
        success: false,
        error: error.message || 'Unknown error'
      });
    }
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Test generation
  const handleTestGeneration = async () => {
    if (!user) {
      setError('Please log in to test ComfyUI');
      return;
    }

    if (!prompt.trim() && !image) {
      setError('Please provide either a text prompt or upload an image');
      return;
    }

    console.log('🧪 Starting test with:', {
      user: user?.id,
      imageName: image?.name,
      imageSize: image?.size,
      prompt: prompt
    });

    setTesting(true);
    setError('');
    setTestResult(null);
    setPolling(false);
    setProgress(0);
    setStatusMessage('');
    setJobId('');
    
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      console.log('🧪 Starting ComfyUI test...');
      const startResult = await comfyUITestService.startGeneration({
        prompt: prompt.trim(),
        image: image || undefined
      });

      if (!startResult.success || !startResult.data) {
        setError(startResult.error || 'Failed to start generation');
        return;
      }

      setJobId(startResult.data.jobId);
      setPolling(true);
      setProgress(startResult.data.progress);
      setStatusMessage(startResult.data.message);
      
      // Start polling
      pollForResults(startResult.data.jobId);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const pollForResults = async (jobId: string) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await comfyUITestService.pollJobStatus(jobId);
        
        if (result.success && result.data) {
          if (result.data.status === 'completed') {
            setTestResult(result.data);
            setPolling(false);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (result.data.status === 'failed') {
            setError(result.error || 'Generation failed');
            setPolling(false);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (result.data.status === 'processing') {
            // Update progress and status message
            setProgress(result.data.progress);
            setStatusMessage(result.data.message || 'Processing...');
          }
        } else if (!result.success) {
          setError(result.error || 'Polling failed');
          setPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        setError('Failed to check job status');
        setPolling(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 30 minutes as fallback
    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setPolling(false);
      setError('Generation timeout - please try again or check your job status manually');
    }, 30 * 60 * 1000);
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/generate')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Generate</span>
          </button>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ComfyUI Test Environment
          </h1>
          <p className="text-xl text-gray-600">
            Test your ComfyUI workflow without affecting the main application
          </p>
        </div>

        {/* Connection Test */}
        <div className="mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                ComfyUI Server Connection
              </h3>
              <Button
                onClick={testConnection}
                variant="outline"
                size="sm"
                icon={Info}
                disabled={true}
              >
                Test Connection (CORS Issue)
              </Button>
            </div>
            
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  CORS Issue - Connection Test Disabled
                </span>
              </div>
              <p className="text-sm text-yellow-700">
                The connection test is temporarily disabled due to CORS restrictions. 
                You can still test the generation functionality below.
              </p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Form */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Test Parameters
              </h3>
              
              {/* Image Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Test Image (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                    id="test-image-upload"
                  />
                  <label htmlFor="test-image-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {image ? image.name : 'Click to upload test image (optional)'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Leave empty to use text prompt only
                    </p>
                  </label>
                </div>
                
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-contain rounded-lg border"
                    />
                  </div>
                )}
              </div>

              {/* Text Prompt */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Prompt
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the 3D model you want to generate..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required if no image is uploaded
                </p>
              </div>

              {/* Test Button */}
              <Button
                onClick={handleTestGeneration}
                loading={testing}
                className="w-full"
                size="lg"
                icon={Zap}
                disabled={testing}
              >
                {testing ? 'Testing ComfyUI...' : 'Run ComfyUI Test'}
              </Button>

              {/* Debug Info */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                <div>User logged in: {user ? '✅ Yes' : '❌ No'}</div>
                <div>Text prompt: {prompt.trim() ? '✅ Yes' : '❌ No'}</div>
                <div>Image uploaded: {image ? '✅ Yes' : '❌ No'}</div>
                <div>Button disabled: {testing ? '✅ Yes (loading)' : '❌ No'}</div>
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </Card>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {(testing || polling) && (
              <Card className="p-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 text-blue-500 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {testing ? 'Starting ComfyUI Job...' : 'Processing ComfyUI Workflow'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {testing 
                      ? 'Initializing workflow and uploading files...' 
                      : statusMessage || 'Processing your 3D model generation...'
                    }
                  </p>
                  
                  {polling && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {progress}% complete
                        {jobId && (
                          <span className="ml-2 text-xs text-gray-400">
                            (Job ID: {jobId.substring(0, 8)}...)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-2">
                    This may take 5-15 minutes depending on complexity and server load
                  </p>
                </div>
              </Card>
            )}

            {testResult && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Test Results
                </h3>
                
                {/* Model Preview */}
                {testResult.primaryModelUrl ? (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Generated Model</h4>
                    <div className="text-sm text-gray-500 mb-2">
                      Model URL: {testResult.primaryModelUrl}
                    </div>
                    <ModelViewer 
                      modelUrl={testResult.primaryModelUrl}
                      className="h-64 w-full"
                    />
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">No Model URL</h4>
                    <p className="text-sm text-yellow-700">
                      The generation completed but no primary model URL was returned.
                      Check the logs for more details.
                    </p>
                    {testResult.allFiles && testResult.allFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-yellow-700">Available files:</p>
                        <ul className="text-xs text-yellow-600 mt-1">
                          {testResult.allFiles.map((file: any, index: number) => (
                            <li key={index}>{file.originalFilename} - {file.publicUrl}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Test Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Execution Time:</span>
                      <div className="font-medium">{testResult.executionTime || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Files Generated:</span>
                      <div className="font-medium">{testResult.totalFiles || testResult.allFiles?.length || 0}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Workflow Nodes:</span>
                      <div className="font-medium">{testResult.workflowNodes || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Server:</span>
                      <div className="font-medium text-xs">{testResult.comfyuiServer || 'ComfyUI'}</div>
                    </div>
                  </div>

                  {/* Generated Files */}
                  {testResult.allFiles && testResult.allFiles.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Generated Files</h4>
                      <div className="space-y-2">
                        {testResult.allFiles.map((file: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <div className="text-sm font-medium">{file.originalFilename}</div>
                              <div className="text-xs text-gray-500">
                                {file.fileExtension.toUpperCase()} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                {file.isModel && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">3D Model</span>}
                                {file.isPreview && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">Preview</span>}
                              </div>
                            </div>
                            <a
                              href={file.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-800 text-sm"
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Stats */}
                  {(testResult.models?.length > 0 || testResult.previews?.length > 0) && (
                    <div className="grid grid-cols-2 gap-4 text-sm bg-blue-50 p-3 rounded-lg">
                      <div>
                        <span className="text-blue-600">3D Models:</span>
                        <div className="font-medium text-blue-900">{testResult.models?.length || 0}</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Preview Images:</span>
                        <div className="font-medium text-blue-900">{testResult.previews?.length || 0}</div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 