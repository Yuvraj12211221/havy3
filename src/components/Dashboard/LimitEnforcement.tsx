import React, { useEffect } from 'react';
import { AlertTriangle, Zap, Lock } from 'lucide-react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { useTimeTheme } from '../../hooks/useTimeTheme';

interface LimitCheckProps {
  resourceType: 'chatbots' | 'faqDocuments' | 'apiCalls' | 'ttsCharacters';
  currentUsage: number;
  showAlertAt?: number; // percentage threshold (default 80%)
  onLimitReached?: () => void;
}

const LimitEnforcement: React.FC<LimitCheckProps> = ({
  resourceType,
  currentUsage,
  showAlertAt = 80,
  onLimitReached,
}) => {
  const { benefits, planId } = useSubscription();
  const navigate = useNavigate();
  const theme = useTimeTheme();
  const isDark = theme === 'dark';
  if (!benefits) return null;

  // Map resource types to benefit fields
  const limitMap = {
    chatbots: benefits.maxChatbots,
    faqDocuments: benefits.maxFaqDocuments,
    apiCalls: benefits.maxApiCalls,
    ttsCharacters: benefits.maxTtsCharacters,
  };

  const limit = limitMap[resourceType];
  const percentage = Math.round((currentUsage / limit) * 100);
  const isAtLimit = currentUsage >= limit;
  const shouldShowWarning = percentage >= showAlertAt;

  useEffect(() => {
    if (isAtLimit && onLimitReached) {
      onLimitReached();
    }
  }, [isAtLimit, onLimitReached]);

  if (!shouldShowWarning && !isAtLimit) return null;

  const resourceLabels = {
    chatbots: 'Chatbots',
    faqDocuments: 'FAQ Documents',
    apiCalls: 'API Calls',
    ttsCharacters: 'TTS Characters',
  };

  return (
    <div className={`rounded-lg p-4 space-y-3 ${
      isAtLimit
        ? isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
        : isDark ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'
    }`}>
      <div className="flex items-start gap-3">
        {isAtLimit ? (
          <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
            isDark ? 'text-red-400' : 'text-red-600'
          }`} />
        ) : (
          <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
            isDark ? 'text-yellow-400' : 'text-yellow-600'
          }`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${
            isAtLimit
              ? isDark ? 'text-red-300' : 'text-red-700'
              : isDark ? 'text-yellow-300' : 'text-yellow-700'
          }`}>
            {isAtLimit
              ? `${resourceLabels[resourceType]} Limit Reached`
              : `${resourceLabels[resourceType]} Usage High`}
          </p>
          <p className={`text-xs mt-1 ${
            isAtLimit
              ? isDark ? 'text-red-300/80' : 'text-red-600/80'
              : isDark ? 'text-yellow-300/80' : 'text-yellow-600/80'
          }`}>
            {isAtLimit
              ? `You've reached the limit of ${limit.toLocaleString()} ${resourceLabels[resourceType].toLowerCase()} on your ${planId} plan.`
              : `You're using ${percentage}% of your ${limit.toLocaleString()} ${resourceLabels[resourceType].toLowerCase()} limit.`}
          </p>
          
          {/* Progress Bar */}
          <div className={`mt-2 h-2 rounded-full overflow-hidden ${
            isDark ? 'bg-gray-700' : 'bg-gray-300'
          }`}>
            <div
              className={`h-full transition-all ${
                isAtLimit
                  ? isDark ? 'bg-red-500' : 'bg-red-600'
                  : isDark ? 'bg-yellow-500' : 'bg-yellow-600'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {currentUsage.toLocaleString()} / {limit.toLocaleString()}
          </p>

          {/* Upgrade Button */}
          {(isAtLimit || shouldShowWarning) && planId !== 'enterprise' && (
            <button
              onClick={() => navigate('/pricing-select')}
              className={`mt-3 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-2 transition-colors ${
                isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Zap className="w-3 h-3" />
              Upgrade Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook for checking limits easier
export const useLimitCheck = (resourceType: 'chatbots' | 'faqDocuments' | 'apiCalls' | 'ttsCharacters', currentUsage: number) => {
  const { benefits } = useSubscription();
  
  const limitMap = {
    chatbots: benefits?.maxChatbots ?? 0,
    faqDocuments: benefits?.maxFaqDocuments ?? 0,
    apiCalls: benefits?.maxApiCalls ?? 0,
    ttsCharacters: benefits?.maxTtsCharacters ?? 0,
  };

  const limit = limitMap[resourceType];
  const isAtLimit = currentUsage >= limit;
  const percentage = limit > 0 ? Math.round((currentUsage / limit) * 100) : 0;

  return {
    isAtLimit,
    percentage,
    limit,
    canCreate: !isAtLimit,
  };
};

export default LimitEnforcement;
