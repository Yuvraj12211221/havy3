-- FIESTA SUBSCRIPTION & BILLING SYSTEM MIGRATION
-- Database upgrade for subscription management, plan benefits, and usage tracking
-- Version: 1.0.0
-- Created: March 27, 2026
-- All prices in INR only

-- ============================================================================
-- 1. CREATE SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active ON subscriptions(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_cashfree_order_id ON subscriptions(cashfree_order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);

-- Enable RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_user_read ON subscriptions;
CREATE POLICY subscriptions_user_read ON subscriptions FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS subscriptions_user_insert ON subscriptions;
CREATE POLICY subscriptions_user_insert ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS subscriptions_user_update ON subscriptions;
CREATE POLICY subscriptions_user_update ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- 2. CREATE PRICING TABLE (INR ONLY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id VARCHAR(50) NOT NULL UNIQUE CHECK (plan_id IN ('free', 'starter', 'professional', 'enterprise')),
  plan_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Pricing in INR only
  price_inr NUMERIC(10, 2) NOT NULL DEFAULT 0,
  billing_period VARCHAR(20) DEFAULT 'month', -- 'month', 'year', 'lifetime'
  
  -- Limits (from pricing page)
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

-- Seed pricing data (INR only) - Matches pricing page exactly
INSERT INTO pricing (plan_id, plan_name, description, price_inr, max_chatbots, max_faq_documents, max_api_calls, max_tts_characters, max_stt_uses, max_email_responses, display_order, is_popular)
VALUES
  ('free', 'Free', 'Get started with basic AI capabilities', 0, 1, 50, 1000, 1000, 500, 500, 1, FALSE),
  ('starter', 'Starter', 'Perfect for small businesses scaling up', 2499, 3, 200, 5000, 5000, 2000, 2000, 2, FALSE),
  ('professional', 'Professional', 'Ideal for growing teams and agencies', 7999, 10, 500, 50000, 50000, 5000, 5000, 3, TRUE),
  ('enterprise', 'Enterprise', 'For organizations with custom AI needs', 24999, 999, 9999, 999999, 999999, 999999, 999999, 4, FALSE)
ON CONFLICT (plan_id) DO UPDATE SET
  price_inr = EXCLUDED.price_inr,
  updated_at = NOW();

-- ============================================================================
-- 3. CREATE USAGE TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Usage type and amount
  usage_type VARCHAR(50) NOT NULL CHECK (usage_type IN (
    'api_call',
    'tts_character',
    'stt_use',
    'chatbot_created',
    'faq_document_created',
    'email_response_sent'
  )),
  
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  
  -- Metadata
  resource_id VARCHAR(255),
  description TEXT,
  metadata JSONB,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  tracked_date DATE DEFAULT CURRENT_DATE,
  
  -- For billing cycle tracking
  billing_month DATE DEFAULT DATE_TRUNC('month', NOW())::DATE
);

-- Indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_subscription_id ON usage_tracking(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_usage_type ON usage_tracking(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tracked_date ON usage_tracking(tracked_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_billing_month ON usage_tracking(billing_month);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_type ON usage_tracking(user_id, usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, billing_month);

-- Enable RLS for usage tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usage_tracking_user_read ON usage_tracking;
CREATE POLICY usage_tracking_user_read ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS usage_tracking_user_insert ON usage_tracking;
CREATE POLICY usage_tracking_user_insert ON usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 4. CREATE MONTHLY USAGE SUMMARY TABLE
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
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, billing_month)
);

-- Indexes for monthly summary
CREATE INDEX IF NOT EXISTS idx_usage_monthly_user_id ON usage_monthly_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_monthly_billing_month ON usage_monthly_summary(billing_month);
CREATE INDEX IF NOT EXISTS idx_usage_monthly_subscription_id ON usage_monthly_summary(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_monthly_user_month ON usage_monthly_summary(user_id, billing_month);

-- ============================================================================
-- 5. CREATE PRICE HISTORY TABLE
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
-- 6. CREATE SUBSCRIPTION CHANGE LOG
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
CREATE INDEX IF NOT EXISTS idx_subscription_log_user_id ON subscription_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_log_subscription_id ON subscription_change_log(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_log_change_type ON subscription_change_log(change_type);
CREATE INDEX IF NOT EXISTS idx_subscription_log_created_at ON subscription_change_log(created_at);

-- ============================================================================
-- 7. CREATE FUNCTION TO UPDATE USAGE SUMMARY
-- ============================================================================
CREATE OR REPLACE FUNCTION update_usage_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usage_monthly_summary (
    user_id,
    subscription_id,
    billing_month,
    plan_id,
    api_calls_limit,
    tts_characters_limit,
    stt_uses_limit,
    email_responses_limit,
    chatbots_limit,
    faq_limit
  )
  SELECT
    NEW.user_id,
    NEW.subscription_id,
    NEW.billing_month,
    s.plan_id,
    COALESCE((s.benefits ->> 'maxApiCalls')::INT, 0),
    COALESCE((s.benefits ->> 'maxTtsCharacters')::NUMERIC, 0),
    COALESCE((s.benefits ->> 'maxSttUses')::INT, 0),
    COALESCE((s.benefits ->> 'maxEmailResponses')::INT, 0),
    COALESCE((s.benefits ->> 'maxChatbots')::INT, 0),
    COALESCE((s.benefits ->> 'maxFaqDocuments')::INT, 0)
  FROM subscriptions s
  WHERE s.id = NEW.subscription_id
  ON CONFLICT (user_id, billing_month) DO UPDATE SET
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for usage tracking
DROP TRIGGER IF EXISTS trigger_update_usage_summary ON usage_tracking;
CREATE TRIGGER trigger_update_usage_summary
AFTER INSERT ON usage_tracking
FOR EACH ROW
EXECUTE FUNCTION update_usage_summary();

-- ============================================================================
-- 8. CREATE FUNCTION TO CALCULATE USAGE PERCENTAGES
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_usage_percentage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update API calls percentage
  IF NEW.api_calls_limit > 0 THEN
    NEW.api_calls_percentage = (NEW.api_calls_used::NUMERIC / NEW.api_calls_limit::NUMERIC * 100)::NUMERIC(5, 2);
  END IF;
  
  -- Update TTS percentage
  IF NEW.tts_characters_limit > 0 THEN
    NEW.tts_characters_percentage = (NEW.tts_characters_used / NEW.tts_characters_limit * 100)::NUMERIC(5, 2);
  END IF;
  
  -- Update STT percentage
  IF NEW.stt_uses_limit > 0 THEN
    NEW.stt_uses_percentage = (NEW.stt_uses_used::NUMERIC / NEW.stt_uses_limit::NUMERIC * 100)::NUMERIC(5, 2);
  END IF;
  
  -- Update Email percentage
  IF NEW.email_responses_limit > 0 THEN
    NEW.email_responses_percentage = (NEW.email_responses_sent::NUMERIC / NEW.email_responses_limit::NUMERIC * 100)::NUMERIC(5, 2);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for percentage calculation
DROP TRIGGER IF EXISTS trigger_calculate_usage_percentage ON usage_monthly_summary;
CREATE TRIGGER trigger_calculate_usage_percentage
BEFORE INSERT OR UPDATE ON usage_monthly_summary
FOR EACH ROW
EXECUTE FUNCTION calculate_usage_percentage();

-- ============================================================================
-- 9. CREATE FUNCTION TO SYNC SUBSCRIPTIONS WITH PRICING
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_subscription_with_pricing()
RETURNS TRIGGER AS $$
DECLARE
  pricing_record RECORD;
BEGIN
  -- Get current pricing for the plan
  SELECT * INTO pricing_record FROM pricing WHERE plan_id = NEW.plan_id LIMIT 1;
  
  IF pricing_record IS NOT NULL THEN
    -- Update subscription benefits from current pricing
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
-- 10. CREATE FUNCTION TO LOG SUBSCRIPTION CHANGES
-- ============================================================================
CREATE OR REPLACE FUNCTION log_subscription_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_type_val VARCHAR(50);
BEGIN
  -- Determine change type
  IF TG_OP = 'INSERT' THEN
    change_type_val := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
      IF (SELECT COALESCE(price_inr, 0) FROM pricing WHERE plan_id = NEW.plan_id LIMIT 1) > 
         (SELECT COALESCE(price_inr, 0) FROM pricing WHERE plan_id = OLD.plan_id LIMIT 1) THEN
        change_type_val := 'upgraded';
      ELSE
        change_type_val := 'downgraded';
      END IF;
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'cancelled' THEN
        change_type_val := 'cancelled';
      ELSIF NEW.status = 'suspended' THEN
        change_type_val := 'suspended';
      ELSIF (OLD.status IN ('cancelled', 'suspended')) AND NEW.status = 'active' THEN
        change_type_val := 'reactivated';
      ELSE
        change_type_val := 'renewed';
      END IF;
    END IF;
  END IF;
  
  -- Log the change only if there's something to log
  IF change_type_val IS NOT NULL THEN
    INSERT INTO subscription_change_log (
      user_id,
      subscription_id,
      change_type,
      from_plan,
      to_plan,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.id,
      change_type_val,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.plan_id ELSE NULL END,
      NEW.plan_id,
      jsonb_build_object(
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for logging changes
DROP TRIGGER IF EXISTS trigger_log_subscription_changes ON subscriptions;
CREATE TRIGGER trigger_log_subscription_changes
AFTER INSERT OR UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION log_subscription_changes();

-- ============================================================================
-- 11. CREATE DASHBOARD STATISTICS VIEW
-- ============================================================================
CREATE OR REPLACE VIEW dashboard_user_stats AS
SELECT
  u.id as user_id,
  u.email,
  s.id as subscription_id,
  s.plan_id,
  p.plan_name,
  p.price_inr,
  s.status,
  s.activated_at,
  
  -- API Calls Usage
  COALESCE(ums.api_calls_used, 0) as api_calls_used,
  COALESCE(ums.api_calls_limit, 0) as api_calls_limit,
  COALESCE(ums.api_calls_percentage, 0) as api_calls_percentage,
  
  -- TTS Characters Usage
  COALESCE(ums.tts_characters_used, 0) as tts_characters_used,
  COALESCE(ums.tts_characters_limit, 0) as tts_characters_limit,
  COALESCE(ums.tts_characters_percentage, 0) as tts_characters_percentage,
  
  -- STT Usage
  COALESCE(ums.stt_uses_used, 0) as stt_uses_used,
  COALESCE(ums.stt_uses_limit, 0) as stt_uses_limit,
  COALESCE(ums.stt_uses_percentage, 0) as stt_uses_percentage,
  
  -- Email Responses Usage
  COALESCE(ums.email_responses_sent, 0) as email_responses_sent,
  COALESCE(ums.email_responses_limit, 0) as email_responses_limit,
  COALESCE(ums.email_responses_percentage, 0) as email_responses_percentage,
  
  -- Chatbot Usage
  COALESCE(ums.chatbots_created, 0) as chatbots_created,
  COALESCE(ums.chatbots_limit, 0) as chatbots_limit,
  
  -- FAQ Usage
  COALESCE(ums.faq_created, 0) as faq_created,
  COALESCE(ums.faq_limit, 0) as faq_limit,
  
  ums.billing_month,
  u.created_at as user_created_at
FROM auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN pricing p ON s.plan_id = p.plan_id
LEFT JOIN usage_monthly_summary ums ON s.id = ums.subscription_id AND ums.billing_month = CURRENT_DATE;

-- ============================================================================
-- 12. CREATE FUNCTION TO GET USER PLAN WITH FALLBACK
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_plan(user_id_param UUID)
RETURNS TABLE(
  plan_id VARCHAR,
  plan_name VARCHAR,
  price_inr NUMERIC,
  max_chatbots INT,
  max_faq_documents INT,
  max_api_calls INT,
  max_tts_characters INT,
  max_stt_uses INT,
  max_email_responses INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.plan_id, 'free') as plan_id,
    COALESCE(p.plan_name, 'Free') as plan_name,
    COALESCE(p.price_inr, 0) as price_inr,
    COALESCE(p.max_chatbots, 1) as max_chatbots,
    COALESCE(p.max_faq_documents, 50) as max_faq_documents,
    COALESCE(p.max_api_calls, 1000) as max_api_calls,
    COALESCE(p.max_tts_characters, 1000) as max_tts_characters,
    COALESCE(p.max_stt_uses, 500) as max_stt_uses,
    COALESCE(p.max_email_responses, 500) as max_email_responses
  FROM subscriptions s
  FULL OUTER JOIN pricing p ON s.plan_id = p.plan_id
  WHERE (s.user_id = user_id_param AND s.status = 'active')
     OR p.plan_id = 'free'
  ORDER BY s.status = 'active' DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 13. CREATE FUNCTION FOR CONCURRENT USAGE TRACKING
-- ============================================================================
CREATE OR REPLACE FUNCTION track_usage(
  user_id_param UUID,
  usage_type_param VARCHAR,
  amount_param NUMERIC,
  resource_id_param VARCHAR DEFAULT NULL,
  metadata_param JSONB DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  usage_id UUID;
  sub_id UUID;
BEGIN
  -- Get active subscription
  SELECT id INTO sub_id FROM subscriptions
  WHERE user_id = user_id_param AND status = 'active'
  LIMIT 1;
  
  -- If no active subscription, use free plan
  IF sub_id IS NULL THEN
    SELECT id INTO sub_id FROM subscriptions
    WHERE user_id = user_id_param AND plan_id = 'free'
    LIMIT 1;
  END IF;
  
  -- Insert usage record
  INSERT INTO usage_tracking (
    user_id,
    subscription_id,
    usage_type,
    amount,
    resource_id,
    metadata,
    tracked_date,
    billing_month
  ) VALUES (
    user_id_param,
    sub_id,
    usage_type_param,
    amount_param,
    resource_id_param,
    metadata_param,
    CURRENT_DATE,
    DATE_TRUNC('month', CURRENT_TIMESTAMP)::DATE
  )
  RETURNING id INTO usage_id;
  
  RETURN usage_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 14. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing(is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_plan_id ON pricing(plan_id);

-- ============================================================================
-- 15. GRANT PERMISSIONS
-- ============================================================================
-- Grant permissions to authenticated users
GRANT SELECT ON pricing TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT INSERT, UPDATE ON subscriptions TO authenticated;
GRANT SELECT ON usage_tracking TO authenticated;
GRANT INSERT ON usage_tracking TO authenticated;
GRANT SELECT ON usage_monthly_summary TO authenticated;
GRANT SELECT ON subscription_change_log TO authenticated;
GRANT SELECT ON dashboard_user_stats TO authenticated;

-- Grant service role permissions for API
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON usage_tracking TO service_role;
GRANT ALL ON usage_monthly_summary TO service_role;
GRANT ALL ON subscription_change_log TO service_role;
GRANT ALL ON pricing TO service_role;
GRANT ALL ON price_history TO service_role;

-- ============================================================================
-- 16. MIGRATE EXISTING DATA (ONE-TIME)
-- ============================================================================
-- Assign free plan to all existing users who don't have a subscription
INSERT INTO subscriptions (user_id, plan_id, status, benefits, activated_at)
SELECT 
  u.id,
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
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Clean up pricing table - remove unsupported columns
ALTER TABLE pricing DROP COLUMN IF EXISTS storage_gb;
ALTER TABLE pricing DROP COLUMN IF EXISTS max_domain_integrations;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Run this script to migrate your database
-- All prices are in INR only
-- Usage tracking is concurrent-safe
-- Dashboard will automatically pull from usage_monthly_summary view
-- Services offered: Chatbots, FAQ documents, API calls, TTS, STT, Email responses
-- No storage or domain integrations tracking
