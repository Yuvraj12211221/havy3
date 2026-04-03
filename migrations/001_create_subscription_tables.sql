-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id VARCHAR NOT NULL DEFAULT 'free',
  status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
  benefits JSONB NOT NULL DEFAULT '{}',
  cashfree_order_id VARCHAR,
  payment_method VARCHAR,
  activated_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own subscription
CREATE POLICY "Users can read their own subscription"
ON subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Service role (backend) can do everything
CREATE POLICY "Service role can manage all subscriptions"
ON subscriptions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Policy 3: Users can update their own subscription (status only)
CREATE POLICY "Users can update their own subscription"
ON subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create upgrade_tracking table
CREATE TABLE IF NOT EXISTS upgrade_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source VARCHAR NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for upgrade_tracking
CREATE INDEX IF NOT EXISTS idx_upgrade_user ON upgrade_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_source ON upgrade_tracking(source);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_type VARCHAR NOT NULL,
  amount NUMERIC NOT NULL,
  metadata JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for usage_tracking
CREATE INDEX IF NOT EXISTS idx_usage_user_type ON usage_tracking(user_id, usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_tracking(recorded_at);
