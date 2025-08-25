-- Stripe Payment System Database Schema Updates
-- Run this in Supabase SQL Editor to enable enhanced payment tracking

-- Update orders table to support Stripe payments
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'download';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS model_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS model_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS model_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Ensure status column has proper values
ALTER TABLE orders ALTER COLUMN status TYPE TEXT;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded'));

-- Create payment_events table for audit trail
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'payment_created', 'payment_processing', 'payment_succeeded', 
    'payment_failed', 'payment_cancelled', 'payment_refunded'
  )),
  stripe_event_id TEXT UNIQUE,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_stripe_event_id ON payment_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at);

-- Add RLS policies for payment_events
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payment events
CREATE POLICY "Users can view own payment events" ON payment_events
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Only service role can insert payment events (from webhooks)
CREATE POLICY "Service role can insert payment events" ON payment_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Add helpful comments
COMMENT ON TABLE payment_events IS 'Audit trail for all payment-related events from Stripe webhooks';
COMMENT ON COLUMN orders.stripe_session_id IS 'Stripe checkout session ID for tracking';
COMMENT ON COLUMN orders.stripe_payment_intent_id IS 'Stripe payment intent ID for verification';
COMMENT ON COLUMN orders.payment_method IS 'Payment method used (card, bank_transfer, etc.)';
COMMENT ON COLUMN orders.order_type IS 'Type of order: download, print, or subscription';
COMMENT ON COLUMN orders.metadata IS 'Additional order metadata from Stripe and frontend';

-- Grant necessary permissions
GRANT SELECT ON payment_events TO authenticated;
GRANT ALL ON payment_events TO service_role;
