// frontend/src/components/Payment/CheckoutButton.tsx
import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Button } from '../UI/Button';
// import { stripeService } from '../../services/stripe';  
import { useAuth } from '../../hooks/useAuth';

interface CheckoutButtonProps {
  amount: number;
  paymentType: 'download' | 'manufacturing';
  metadata: any;
  children?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
}

export function CheckoutButton({ 
  amount, 
  paymentType, 
  metadata, 
  children, 
  className = '',
  size = 'md',
  variant = 'primary',
  disabled = false
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      // STRIPE INTEGRATION DISABLED
      /*
      await stripeService.redirectToCheckout({
        amount,
        paymentType,
        metadata: {
          userId: user?.id,
          ...metadata
        }
      });
      */
      
      // TODO: Implement alternative payment method
      console.log('🔄 Checkout - Stripe disabled');
      alert('Payment processing temporarily unavailable. Please contact support.');
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      loading={loading}
      className={className}
      size={size}
      variant={variant}
      icon={CreditCard}
      disabled={disabled || loading}
    >
      {loading ? 'Redirecting...' : (children || `Pay $${amount.toFixed(2)}`)}
    </Button>
  );
}