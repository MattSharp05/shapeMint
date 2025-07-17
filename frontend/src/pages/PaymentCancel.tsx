// frontend/src/pages/PaymentCancel.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';

export function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="p-8 text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Cancelled
          </h1>
          
          <p className="text-gray-600 mb-8">
            Your payment was cancelled. No charges were made to your account.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button 
                onClick={() => navigate(-1)}
                variant="outline"
                className="w-full"
                icon={ArrowLeft}
              >
                Go Back
              </Button>
              <Button 
                onClick={() => navigate('/marketplace')}
                className="w-full"
                icon={RefreshCw}
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}