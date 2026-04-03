import React from 'react';
import { CheckCircle2, Zap, Database, MessageSquare, Headphones, Globe, BarChart3, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useTimeTheme } from '../../hooks/useTimeTheme';

const PlanBenefitsDisplay: React.FC = () => {
  const navigate = useNavigate();
  const { planId, benefits, loading } = useSubscription();
  const theme = useTimeTheme();
  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div className={`rounded-lg p-6 ${
        isDark ? 'bg-gray-800' : 'bg-gray-50'
      }`}>
        <div className="flex items-center justify-center h-32">
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Loading plan information...
          </p>
        </div>
      </div>
    );
  }

  if (!benefits) {
    return (
      <div className={`rounded-lg p-6 ${
        isDark ? 'bg-gray-800' : 'bg-gray-50'
      }`}>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          Unable to load plan information. Please refresh the page.
        </p>
      </div>
    );
  }

  const benefitItems = [
    {
      icon: MessageSquare,
      label: 'Chatbots',
      value: benefits.maxChatbots,
      unit: `chatbot${benefits.maxChatbots !== 1 ? 's' : ''}`,
    },
    {
      icon: Database,
      label: 'FAQ Documents',
      value: benefits.maxFaqDocuments,
      unit: 'documents',
    },
    {
      icon: Zap,
      label: 'API Calls',
      value: benefits.maxApiCalls,
      unit: '/month',
    },
    {
      icon: Headphones,
      label: 'TTS Characters',
      value: benefits.maxTtsCharacters,
      unit: '/month',
    },
    {
      icon: Database,
      label: 'Storage',
      value: benefits.storageGB,
      unit: 'GB',
    },
  ];

  const featureFlags = [
    { icon: BarChart3, label: 'Analytics', enabled: benefits.hasAnalytics },
    { icon: Shield, label: 'Priority Support', enabled: benefits.hasPrioritySupport },
    { icon: Globe, label: 'Custom Branding', enabled: benefits.hasCustomBranding },
    { icon: Globe, label: 'Custom Domain', enabled: benefits.hasCustomDomain },
  ];

  const planDisplayName = planId.charAt(0).toUpperCase() + planId.slice(1);

  return (
    <div className={`rounded-lg p-6 space-y-6 ${
      isDark ? 'bg-gray-800' : 'bg-gray-50'
    }`}>
      {/* Plan Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Current Plan
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {planDisplayName} Plan
          </p>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
          planId === 'free'
            ? isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            : planId === 'starter'
            ? isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'
            : planId === 'professional'
            ? isDark ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-700'
            : isDark ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-700'
        }`}>
          {planDisplayName}
        </div>
      </div>

      {/* Usage Quotas */}
      <div className="space-y-3">
        <h4 className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Resource Limits
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {benefitItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`p-3 rounded-lg ${
                  isDark ? 'bg-gray-700' : 'bg-white'
                } border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 mt-1 flex-shrink-0 ${
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.label}
                    </p>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {typeof item.value === 'number' && item.value >= 1000
                        ? `${(item.value / 1000).toFixed(0)}k`
                        : item.value}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      {item.unit}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="space-y-3 pt-4 border-t" style={{borderColor: isDark ? '#4B5563' : '#E5E7EB'}}>
        <h4 className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Features
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {featureFlags.map((feature) => {
            return (
              <div
                key={feature.label}
                className="flex items-center gap-2"
              >
                <CheckCircle2
                  className={`w-4 h-4 flex-shrink-0 ${
                    feature.enabled
                      ? isDark ? 'text-green-400' : 'text-green-600'
                      : isDark ? 'text-gray-600' : 'text-gray-300'
                  }`}
                />
                <span className={`text-sm ${
                  feature.enabled
                    ? isDark ? 'text-gray-300' : 'text-gray-700'
                    : isDark ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  {feature.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade CTA - show for all plans except enterprise */}
      {planId !== 'enterprise' && (
        <div className={`p-4 rounded-lg ${
          isDark ? 'bg-blue-900/20' : 'bg-blue-50'
        } border ${isDark ? 'border-blue-800' : 'border-blue-200'} flex items-center justify-between`}>
          <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            {planId === 'free'
              ? 'Upgrade to unlock more features and higher limits.'
              : 'Upgrade to a higher plan for advanced features.'}
          </p>
          <button
            onClick={() => navigate('/pricing-select')}
            className={`ml-4 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {planId === 'free' ? 'Upgrade Now' : 'Upgrade Plan'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PlanBenefitsDisplay;
