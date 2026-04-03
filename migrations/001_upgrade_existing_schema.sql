-- ============================================================================
-- MIGRATION: Upgrade existing schema to support new subscription system
-- This migration preserves existing data and adds new tables
-- ============================================================================

-- Step 1: Backup existing subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions_backup AS SELECT * FROM subscriptions;

-- Step 2: Drop old subscriptions table and recreate with new schema
DROP TABLE IF EXISTS subscriptions CASCADE;

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL CHECK (plan_id IN ('free', 'starter', 'professional', 'enterprise')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'suspended')),
  
  -- Benefits snapshot at time of purchase
  benefits JSONB DEFAULT '{
    "maxChatbots": 1,
    "maxFaqDocuments": 50,
    "maxApiCalls": 1000,
    "maxTtsCharacters": 1000,
    "maxSttUses": 500,
    "maxEmailResponses": 500
  }',
  
  -- Payment tracking
  cashfree_order_id VARCHAR(255) UNIQUE,
  payment_method VARCHAR(100),
  last_payment_amount NUMERIC(10, 2),
  last_payment_date TIMESTAMP,
  
  -- Timestamps
  activated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE UNIQUE INDEX idx_subscriptions_user_active ON subscriptions(user_id) WHERE status = 'active';
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_cashfree_order_id ON subscriptions(cashfree_order_id);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);

-- Enable RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_user_read ON subscriptions FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY subscriptions_user_insert ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY subscriptions_user_update ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- Step 3: Create pricing table
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id VARCHAR(50) NOT NULL UNIQUE CHECK (plan_id IN ('free', 'starter', 'professional', 'enterprise')),
  plan_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Pricing in INR only
  price_inr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  billing_period VARCHAR(20) DEFAULT 'month',
  
  -- Limits
  max_chatbots INT NOT NULL DEFAULT 1,
  max_faq_documents INT NOT NULL DEFAULT 50,
  max_api_calls INT NOT NULL DEFAULT 1000,
  max_tts_characters INT NOT NULL DEFAULT 1000,
  max_stt_uses INT NOT NULL DEFAULT 500,
  max_email_responses INT NOT NULL DEFAULT 500,
  
  -- Metadata
  display_order INT,
  is_popular BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed pricing data
INSERT INTO pricing (plan_id, plan_name, description, price_inr, max_chatbots, max_faq_documents, max_api_calls, max_tts_characters, max_stt_uses, max_email_responses, display_order, is_popular)
VALUES
  ('free', 'Free', 'Get started with basic AI capabilities', 0, 1, 50, 1000, 1000, 500, 500, 1, FALSE),
  ('starter', 'Starter', 'Perfect for small businesses scaling up', 2499, 3, 200, 5000, 5000, 2000, 2000, 2, FALSE),
  ('professional', 'Professional', 'Ideal for growing teams and agencies', 7999, 10, 500, 50000, 50000, 5000, 5000, 3, TRUE),
  ('enterprise', 'Enterprise', 'For organizations with custom AI needs', 24999, 999, 9999, 999999, 999999, 999999, 999999, 4, FALSE)
ON CONFLICT (plan_id) DO NOTHING;

-- ============================================================================
-- Step 4: Create usage tracking table
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  usage_type VARCHAR(50) NOT NULL CHECK (usage_type IN (
    'api_call',
    'tts_character',
    'stt_use',
    'chatbot_created',
    'faq_document_created',
    'email_response_sent'
  )),
  
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  
  resource_id VARCHAR(255),
  description TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  tracked_date DATE DEFAULT CURRENT_DATE,
  billing_month DATE DEFAULT DATE_TRUNC('month', NOW())::DATE
);

-- Indexes for usage tracking
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_subscription_id ON usage_tracking(subscription_id);
CREATE INDEX idx_usage_tracking_usage_type ON usage_tracking(usage_type);
CREATE INDEX idx_usage_tracking_billing_month ON usage_tracking(billing_month);
CREATE INDEX idx_usage_tracking_user_month ON usage_tracking(user_id, billing_month);

-- Enable RLS for usage tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_tracking_user_read ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY usage_tracking_user_insert ON usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Step 5: Create monthly usage summary table
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_monthly_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  billing_month DATE NOT NULL,
  
  -- API Usage
  api_calls_used INT DEFAULT 0,
  api_calls_limit INT DEFAULT 0,
  api_calls_percentage NUMERIC(5, 2) DEFAULT 0,
  
  -- TTS Usage
  tts_characters_used NUMERIC(15, 2) DEFAULT 0,
  tts_characters_limit NUMERIC(15, 2) DEFAULT 0,
  tts_characters_percentage NUMERIC(5, 2) DEFAULT 0,
  
  -- STT Usage
  stt_uses_used INT DEFAULT 0,
  stt_uses_limit INT DEFAULT 0,
  stt_uses_percentage NUMERIC(5, 2) DEFAULT 0,
  
  -- Email Responses
  email_responses_sent INT DEFAULT 0,
  email_responses_limit INT DEFAULT 0,
  email_responses_percentage NUMERIC(5, 2) DEFAULT 0,
  
  -- Chatbot Usage
  chatbots_created INT DEFAULT 0,
  chatbots_limit INT DEFAULT 0,
  
  -- FAQ Usage
  faq_created INT DEFAULT 0,
  faq_limit INT DEFAULT 0,
  
  -- Billing info
  plan_id VARCHAR(50),
  plan_price_inr NUMERIC(10, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, billing_month)
);

-- Indexes for monthly summary
CREATE INDEX idx_usage_monthly_user_id ON usage_monthly_summary(user_id);
CREATE INDEX idx_usage_monthly_billing_month ON usage_monthly_summary(billing_month);
CREATE INDEX idx_usage_monthly_subscription_id ON usage_monthly_summary(subscription_id);

-- ============================================================================
-- Step 6: Create subscription change log
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
    'created',
    'upgraded',
    'downgraded',
    'renewed',
    'cancelled',
    'suspended',
    'reactivated'
  )),
  
  from_plan VARCHAR(50),
  to_plan VARCHAR(50),
  
  reason TEXT,
  metadata JSONB,
  
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for subscription log
CREATE INDEX idx_subscription_log_user_id ON subscription_change_log(user_id);
CREATE INDEX idx_subscription_log_subscription_id ON subscription_change_log(subscription_id);
CREATE INDEX idx_subscription_log_change_type ON subscription_change_log(change_type);

-- ============================================================================
-- Step 7: Create price history table
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id VARCHAR(50) NOT NULL,
  old_price_inr NUMERIC(10, 2),
  new_price_inr NUMERIC(10, 2),
  change_reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- Step 8: Migrate data from user_credits to subscriptions
-- ============================================================================
-- For each user in user_credits, create a free plan subscription
INSERT INTO subscriptions (user_id, plan_id, status, benefits, activated_at)
SELECT 
  uc.user_id,
  'free',
  'active',
  '{
    "maxChatbots": 1,
    "maxFaqDocuments": 50,
    "maxApiCalls": 1000,
    "maxTtsCharacters": 1000,
    "maxSttUses": 500,
    "maxEmailResponses": 500
  }',
  NOW()
FROM user_credits uc
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE user_id = uc.user_id AND status = 'active'
)
ON CONFLICT (user_id) WHERE status = 'active' DO NOTHING;

-- ============================================================================
-- Step 9: Migrate data from user_credits to usage_monthly_summary
-- ============================================================================
INSERT INTO usage_monthly_summary (
  user_id,
  subscription_id,
  billing_month,
  plan_id,
  api_calls_used,
  api_calls_limit,
  tts_characters_used,
  tts_characters_limit,
  stt_uses_used,
  stt_uses_limit,
  email_responses_sent,
  email_responses_limit,
  chatbots_created,
  chatbots_limit,
  faq_created,
  faq_limit
)
SELECT 
  uc.user_id,
  s.id,
  DATE_TRUNC('month', NOW())::DATE,
  'free',
  uc.used_chatbot,
  uc.limit_chatbot,
  uc.used_tts,
  uc.limit_tts,
  uc.used_stt,
  uc.limit_stt,
  uc.used_email,
  uc.limit_email,
  0,
  1,
  uc.used_faq_gen,
  uc.limit_faq_gen
FROM user_credits uc
JOIN subscriptions s ON uc.user_id = s.user_id AND s.status = 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM usage_monthly_summary 
  WHERE user_id = uc.user_id 
  AND billing_month = DATE_TRUNC('month', NOW())::DATE
)
ON CONFLICT (user_id, billing_month) DO NOTHING;

-- ============================================================================
-- Step 10: Create trigger functions
-- ============================================================================

-- Function to sync subscriptions with pricing
CREATE OR REPLACE FUNCTION sync_subscription_with_pricing()
RETURNS TRIGGER AS $$
DECLARE
  pricing_record RECORD;
BEGIN
  SELECT * INTO pricing_record FROM pricing WHERE plan_id = NEW.plan_id LIMIT 1;
  
  IF pricing_record IS NOT NULL THEN
    NEW.benefits = jsonb_build_object(
      'maxChatbots', pricing_record.max_chatbots,
      'maxFaqDocuments', pricing_record.max_faq_documents,
      'maxApiCalls', pricing_record.max_api_calls,
      'maxTtsCharacters', pricing_record.max_tts_characters,
      'maxSttUses', pricing_record.max_stt_uses,
      'maxEmailResponses', pricing_record.max_email_responses
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for pricing sync
DROP TRIGGER IF EXISTS trigger_sync_subscription_pricing ON subscriptions;
CREATE TRIGGER trigger_sync_subscription_pricing
BEFORE INSERT OR UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_with_pricing();

-- ============================================================================
-- Step 11: Grant permissions
-- ============================================================================
GRANT SELECT ON pricing TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT INSERT, UPDATE ON subscriptions TO authenticated;
GRANT SELECT ON usage_tracking TO authenticated;
GRANT INSERT ON usage_tracking TO authenticated;
GRANT SELECT ON usage_monthly_summary TO authenticated;
GRANT SELECT ON subscription_change_log TO authenticated;

GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON usage_tracking TO service_role;
GRANT ALL ON usage_monthly_summary TO service_role;
GRANT ALL ON subscription_change_log TO service_role;
GRANT ALL ON pricing TO service_role;
GRANT ALL ON price_history TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Old data is backed up in subscriptions_backup
-- All existing users have been migrated to free plan
-- New subscription system is ready to use
