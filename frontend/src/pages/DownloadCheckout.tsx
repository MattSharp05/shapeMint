import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Check, FileText, AlertCircle } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { ModelViewer } from '../components/3D/ModelViewer';
import { useAuth } from '../hooks/useAuth';
import { downloadService } from '../services/downloadService';

// Email validation function
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function DownloadCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { modelData, modelUrl, price, isGenerated, stlUrl } = location.state || {};
  
  // ✅ Debug logging
  console.log('💾 DownloadCheckout page loaded');
  console.log('💾 location.state:', location.state);
  console.log('💾 modelData:', modelData);
  console.log('💾 modelUrl:', modelUrl);
  console.log('💾 stlUrl:', stlUrl);
  console.log('💾 price:', price);
  console.log('💾 isGenerated:', isGenerated);
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { user } = useAuth();

  // Email validation handler
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // Clear previous errors when user starts typing
    if (emailError) {
      setEmailError('');
    }
    
    // Real-time validation
    if (newEmail && !isValidEmail(newEmail)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  // Validate email on blur
  const handleEmailBlur = () => {
    if (!email.trim()) {
      setEmailError('Email address is required');
    } else if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  if (!modelData || !modelUrl) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Model Selected</h2>
          <p className="text-gray-600 mb-6">Please select a model to download.</p>
          <Button onClick={() => navigate(isGenerated ? '/generate' : '/marketplace')}>
            Go Back
          </Button>
        </Card>
      </div>
  );
  }

  const handleDownload = async () => {
    // Clear previous errors
    setErrorMessage('');
    setEmailError('');
    
    // Validate email
    if (!email.trim()) {
      setEmailError('Email address is required');
      return;
    }
    
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setDownloading(true);
    setDownloadStatus('downloading');

    try {
      console.log('🚀 Starting download process...');
      console.log('📧 Email:', email);
      console.log('📦 Model data:', modelData);
      console.log('🔗 Model URL:', modelUrl);
      console.log('🔗 STL URL:', stlUrl);

      // Prepare download data
      const downloadData = {
        modelUrl: modelUrl,
        stlUrl: stlUrl,
        objUrl: modelData.objUrl,
        glbUrl: modelData.glbUrl,
        designTitle: isGenerated ? modelData.prompt : modelData.designTitle
      };

      // Download the files
      await downloadService.downloadModelFiles(downloadData);
      
      setDownloadStatus('success');
      console.log('✅ Download completed successfully');
      
      // Show success message for a few seconds
      setTimeout(() => {
        navigate(isGenerated ? '/generate' : '/marketplace');
      }, 3000);
      
    } catch (error) {
      console.error('❌ Download failed:', error);
      setDownloadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Check if form is valid
  const isFormValid = email.trim() && isValidEmail(email) && !downloading;

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button
            onClick={() => navigate(isGenerated ? '/generate' : '/marketplace')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {isGenerated ? 'Generate' : 'Marketplace'}</span>
          </button>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Download 3D Model
          </h1>
          <p className="text-xl text-gray-600">
            Get your 3D model files instantly
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Download Form */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Download Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      emailError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {emailError}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    We'll send you a confirmation email with download links
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">{errorMessage}</span>
                </div>
              )}

              {downloadStatus === 'success' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">Download completed! Redirecting...</span>
                </div>
              )}

              <Button
                onClick={handleDownload}
                loading={downloading}
                className="w-full mt-6"
                size="lg"
                icon={Download}
                disabled={!isFormValid}
              >
                {downloading ? 'Downloading...' : 'Download Files'}
              </Button>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Free download - no payment required
              </p>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                3D Model Preview
              </h3>
              <ModelViewer 
                modelUrl={modelUrl}
                className="h-64 w-full mb-4"
              />
              <div className="text-sm text-gray-600">
                {isGenerated ? (
                  <>
                    <p><strong>Generated from:</strong> {modelData.prompt || 'Image upload'}</p>
                    <p><strong>Style:</strong> {modelData.settings?.style}</p>
                    <p><strong>Quality:</strong> {modelData.settings?.quality}</p>
                  </>
                ) : (
                  <>
                    <p><strong>Design:</strong> {modelData.designTitle}</p>
                    <p><strong>Creator:</strong> {modelData.creator}</p>
                    <p><strong>Description:</strong> {modelData.designDescription}</p>
                  </>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Download Summary
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Digital Download:</span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>$0.00</span>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total:</span>
                    <span className="text-green-600">FREE</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                What You'll Get
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  High-quality STL file for 3D printing
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  OBJ file for 3D modeling software
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  GLB file for 3D viewing
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Full commercial usage rights
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  Instant download access
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}