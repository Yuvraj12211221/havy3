import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, Lock, Star, Zap, Shield, Crown } from 'lucide-react';
import { useDictationCapture } from '../hooks/useDictationCapture';
import { useTimeTheme } from '../hooks/useTimeTheme';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';

const PricingSelect: React.FC = () => {
  useDictationCapture();
  const theme = useTimeTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { planId: currentPlanId } = useSubscription();
  const { user } = useAuth();

  const planHierarchy = ['free', 'starter', 'professional', 'enterprise'];
  const currentPlanIndex = planHierarchy.indexOf(currentPlanId || 'free');

  const plans = [
    {
      id: 'free', name: 'Free', price: 0, period: 'forever',
      description: 'Get started at no cost',
      Icon: Shield, accentColor: '#6b7280',
      gradient: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
      darkGradient: 'linear-gradient(135deg, rgba(107,114,128,0.12), rgba(107,114,128,0.04))',
      features: [
        '1,000 Chatbot Interactions/month',
        '50 FAQ Generations',
        '500 Speech-to-Text uses/month',
        '1,000 TTS conversions/month',
        '500 Email Auto-Responses/month',
        'Standard Analytics',
        '1 domain integration',
      ],
    },
    {
      id: 'starter', name: 'Starter', price: 2499, period: 'month',
      description: 'Perfect for small businesses',
      Icon: Zap, accentColor: '#3b82f6',
      gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
      darkGradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))',
      features: [
        '5,000 Chatbot Interactions/month',
        '200 FAQ Generations (Deep Scraper)',
        '2,000 Speech-to-Text uses/month',
        '5,000 TTS conversions',
        '2,000 Email Auto-Responses/month',
        'Advanced Analytics & Timeline',
        '2 domain integrations',
      ],
    },
    {
      id: 'professional', name: 'Professional', price: 7999, period: 'month',
      description: 'For growing teams & agencies',
      Icon: Star, accentColor: '#7c3aed',
      gradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
      darkGradient: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05))',
      popular: true,
      features: [
        '10,000 Chatbot Interactions/month',
        '500 FAQ Generations (Max Depth)',
        '5,000 Speech-to-Text uses/month',
        '10,000 TTS conversions (All Voices)',
        '5,000 Email Responses/month',
        'Comprehensive Analytics & Insights',
        '5 domain integrations',
      ],
    },
    {
      id: 'enterprise', name: 'Enterprise', price: 24999, period: 'month',
      description: 'Custom AI for large orgs',
      Icon: Crown, accentColor: '#ea580c',
      gradient: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
      darkGradient: 'linear-gradient(135deg, rgba(234,88,12,0.12), rgba(234,88,12,0.04))',
      features: [
        'Unlimited Chatbot Interactions',
        'Unlimited FAQ + Real-time Scraper',
        'Unlimited Speech-to-Text',
        'Unlimited TTS (Custom Voice Cloning)',
        'Unlimited Email Auto-Responses',
        'Enterprise Analytics & SSO',
        'Unlimited domains',
        'Custom AI Fine-tuning',
        '24/7 Dedicated Support',
      ],
    },
  ];

  const handlePlanSelect = (plan: { id: string; price: number }) => {
    const planIndex = planHierarchy.indexOf(plan.id);
    if (planIndex < currentPlanIndex) return;
    if (plan.id === 'free' || plan.id === currentPlanId) { navigate('/dashboard'); return; }
    navigate(`/payment?plan=${plan.id}&amount=${plan.price}`);
  };

  return (
    <div className={`min-h-screen py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-500 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <div className={`
            inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-5
            ${isDark ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`} />
            {currentPlanId && currentPlanId !== 'free' ? `Current Plan: ${currentPlanId.charAt(0).toUpperCase() + currentPlanId.slice(1)}` : 'Choose Your Plan'}
          </div>
          <h1 className={`text-3xl sm:text-4xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {currentPlanId && currentPlanId !== 'free' ? 'Upgrade Your Plan' : 'Start Your AI Journey'}
          </h1>
          <p className={`text-base max-w-xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Prices in INR. No hidden fees. Cancel anytime.
          </p>
        </div>

        {/* Plan Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const planIndex = planHierarchy.indexOf(plan.id);
            const isCurrentPlan = plan.id === currentPlanId;
            const cannotDowngrade = planIndex < currentPlanIndex;
            const { Icon } = plan;

            return (
              <div
                key={plan.id}
                className={`
                  relative flex flex-col rounded-2xl overflow-hidden
                  transition-all duration-300
                  ${cannotDowngrade ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'}
                  ${plan.popular
                    ? isDark
                      ? 'ring-2 ring-violet-500 shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                      : 'ring-2 ring-violet-500 shadow-[0_8px_40px_rgba(124,58,237,0.2)]'
                    : isDark ? 'ring-1 ring-white/10' : 'ring-1 ring-gray-200 shadow-sm'
                  }
                  ${isDark ? 'bg-gray-900' : 'bg-white'}
                `}
              >
                {plan.popular && (
                  <div className="text-center py-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600">
                    ⚡ MOST POPULAR
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white">
                      Current
                    </span>
                  </div>
                )}

                {/* Header area */}
                <div
                  className={`${plan.popular ? 'pt-5' : 'pt-6'} px-5 pb-5`}
                  style={{ background: isDark ? plan.darkGradient : plan.gradient }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: plan.accentColor + '20', border: `1.5px solid ${plan.accentColor}35` }}>
                      <Icon size={18} style={{ color: plan.accentColor }} />
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{plan.description}</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/{plan.period}</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 px-5 py-4">
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: plan.accentColor }} />
                        <span className={`text-xs leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  <button
                    onClick={() => !cannotDowngrade && handlePlanSelect(plan)}
                    disabled={cannotDowngrade || isCurrentPlan}
                    className={`
                      w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
                      transition-all duration-200
                      ${isCurrentPlan
                        ? isDark ? 'bg-gray-700 text-gray-400 cursor-default' : 'bg-gray-100 text-gray-500 cursor-default'
                        : cannotDowngrade
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : plan.popular
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:-translate-y-0.5 shadow-lg shadow-violet-500/30'
                            : isDark
                              ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:-translate-y-0.5'
                              : 'border text-gray-700 bg-white hover:bg-gray-50 hover:-translate-y-0.5'
                      }
                    `}
                    style={!isCurrentPlan && !cannotDowngrade && !plan.popular ? { borderColor: plan.accentColor + '40' } : {}}
                  >
                    {cannotDowngrade ? <Lock size={14} /> : <CreditCard size={14} />}
                    {isCurrentPlan
                      ? 'Your Current Plan'
                      : cannotDowngrade
                        ? 'Below Current Tier'
                        : plan.price === 0
                          ? 'Go to Dashboard'
                          : `Upgrade to ${plan.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className={`text-center text-xs mt-10 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          Logged in as: <span className="font-medium">{user?.email || '—'}</span> &nbsp;·&nbsp;
          You can only upgrade to higher plans.
        </p>
      </div>
    </div>
  );
};

export default PricingSelect;