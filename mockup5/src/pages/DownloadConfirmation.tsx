import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Download, FileText, Shield, Clock, Home, ArrowRight, Mail } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { ModelViewer } from '../components/3D/ModelViewer';

export function DownloadConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { purchaseData } = location.state || {};
  const [downloadStarted, setDownloadStarted] = useState(false);

  // If no purchase data, redirect to home
  if (!purchaseData) {
    return (
      <div className="pt-16 min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Purchase Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find your purchase details.</p>
          <Button onClick={() => navigate('/')}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const {
    purchaseId,
    modelData,
    modelUrl,
    price,
    tax,
    total,
    isGenerated,
    purchaseDate
  } = purchaseData;

  // Auto-start download after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDownload();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDownload = () => {
    setDownloadStarted(true);
    // In a real app, this would trigger the actual file download
    // For now, we'll simulate it
    console.log('Starting download...');
  };

  const fileFormats = ['STL', 'OBJ', '3MF'];
  const fileSize = '2.4 MB';

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Purchase Successful!
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Your digital files are ready for download
          </p>
          <p className="text-lg text-gray-500">
            Purchase ID: <span className="font-mono font-medium">#{purchaseId}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Download Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Download Status */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Your Download
                </h3>
                {downloadStarted ? (
                  <span className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Download Started
                  </span>
                ) : (
                  <span className="flex items-center text-blue-600 text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    Starting in 3 seconds...
                  </span>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Download className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {isGenerated ? 'Generated 3D Model' : modelData.designTitle}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium">File Formats:</span>
                        <div className="flex space-x-2 mt-1">
                          {fileFormats.map(format => (
                            <span key={format} className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {format}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">File Size:</span>
                        <p className="mt-1">{fileSize}</p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleDownload}
                      className="w-full"
                      icon={Download}
                      disabled={downloadStarted}
                    >
                      {downloadStarted ? 'Download Started' : 'Download Now'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Download didn't start? */}
              <div className="text-center py-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  Download didn't start automatically?
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownload}
                >
                  Click here to download
                </Button>
              </div>
            </Card>

            {/* Purchase Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Purchase Details
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {isGenerated ? 'AI Generated Model' : modelData.designTitle}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {isGenerated ? (
                        <>Generated from: "{modelData.prompt}"</>
                      ) : (
                        <>Created by: {modelData.creator}</>
                      )}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-purple-600">
                    ${price.toFixed(2)}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Digital Download:</span>
                      <span>${price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-2">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 text-sm text-gray-600">
                  <p><strong>Purchase Date:</strong> {purchaseDate}</p>
                  <p><strong>License:</strong> Commercial use allowed</p>
                </div>
              </div>
            </Card>

            {/* What's Included */}
            <Card className="p-6 bg-green-50 border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-600" />
                What's Included
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    High-quality STL file
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    OBJ file for 3D software
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    3MF file (if applicable)
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-700">
                    <Shield className="h-4 w-4 text-green-500 mr-2" />
                    Commercial usage rights
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Lifetime download access
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Print-ready optimization
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* 3D Model Preview */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Model
              </h3>
              <ModelViewer 
                modelUrl={modelUrl}
                className="h-48 w-full mb-4"
              />
              <div className="text-sm text-gray-600">
                {isGenerated ? (
                  <>
                    <p><strong>Style:</strong> {modelData.settings?.style}</p>
                    <p><strong>Quality:</strong> {modelData.settings?.quality}</p>
                    <p><strong>Size:</strong> {modelData.settings?.size}</p>
                  </>
                ) : (
                  <>
                    <p><strong>Category:</strong> {modelData.category}</p>
                    <p><strong>Description:</strong> {modelData.designDescription}</p>
                  </>
                )}
              </div>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              <Link to="/dashboard">
                <Button className="w-full" icon={ArrowRight}>
                  View in Dashboard
                </Button>
              </Link>
              <Link to={isGenerated ? "/generate" : "/marketplace"}>
                <Button variant="outline" className="w-full" icon={Home}>
                  {isGenerated ? 'Generate More' : 'Browse Marketplace'}
                </Button>
              </Link>
            </div>

            {/* Email Confirmation */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-center space-x-2 mb-3">
                <Mail className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">Email Confirmation</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                A confirmation email with download links has been sent to your email address.
              </p>
              <p className="text-xs text-gray-500">
                Check your spam folder if you don't see it within a few minutes.
              </p>
            </Card>

            {/* Support */}
            <Card className="p-6 text-center">
              <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
              <p className="text-sm text-gray-600 mb-4">
                Having trouble with your download or need technical support?
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}