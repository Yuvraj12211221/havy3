import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export type UpgradeReferralSource = 
  | 'limit_enforcement'
  | 'dashboard'
  | 'pricing_page'
  | 'feature_unavailable'
  | 'chatbot_limit'
  | 'faq_limit'
  | 'api_limit'
  | 'tts_limit'
  | 'analytics_feature'
  | 'custom_branding'
  | 'priority_support'
  | 'other';

// Track upgrade attempts with source information
export const trackUpgradeAttempt = async (
  source: UpgradeReferralSource,
  metadata?: Record<string, any>
) => {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;

    if (!userId) return;

    // Log upgrade attempt to Supabase
    await supabase.from('upgrade_tracking').insert({
      user_id: userId,
      source,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking upgrade attempt:', error);
  }
};

interface UpgradePromptProps {
  source: UpgradeReferralSource;
  title: string;
  description: string;
  highlightedPlan?: 'starter' | 'professional' | 'enterprise';
  showNow?: boolean;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  source,
  title,
  description,
  highlightedPlan = 'starter',
  showNow = true,
}) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !showNow) return null;

  const handleUpgradeClick = () => {
    // Track the upgrade attempt
    trackUpgradeAttempt(source, {
      highlightedPlan,
      timestamp: new Date().toISOString(),
    });

    // Navigate to pricing with referral source
    navigate(`/pricing-select?source=${source}&plan=${highlightedPlan}`);
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white space-y-4 shadow-lg">
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-blue-100 text-sm mt-1">{description}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleUpgradeClick}
          className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
        >
          Upgrade Now
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="px-4 py-2 text-blue-100 hover:text-white transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

// Hook to navigate to upgrade flow with referral tracking
export const useUpgradeFlow = () => {
  const navigate = useNavigate();

  const goToUpgrade = (source: UpgradeReferralSource, metadata?: Record<string, any>) => {
    trackUpgradeAttempt(source, metadata);
    navigate(`/pricing-select?source=${source}`);
  };

  return { goToUpgrade };
};

export default UpgradePrompt;
