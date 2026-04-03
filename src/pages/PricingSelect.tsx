import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, Lock } from 'lucide-react';
import { useDictationCapture } from '../hooks/useDictationCapture';
import { useTimeTheme } from '../hooks/useTimeTheme';
import { useSubscription } from '../contexts/SubscriptionContext';


const PricingSelect: React.FC = () => {
  useDictationCapture();
  const theme = useTimeTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { planId: currentPlanId } = useSubscription();

  // Plan hierarchy order
  const planHierarchy = ['free', 'starter', 'professional', 'enterprise'];
  const currentPlanIndex = planHierarchy.indexOf(currentPlanId || 'free');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'forever',
      description: 'Get started with basic AI capabilities',
      features: [
        '1,000 Chatbot Interactions/month',
        '50 FAQ Generations (Basic Smart Scraper)',
        '500 Speech-to-Text uses/month',
        '1,000 Text-to-Speech conversions/month',
        '500 Email Auto-Responses/month',
        'Standard User Analytics (Always Free)',
        '1 domain integration'
      ]
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      period: 'month',
      description: 'Perfect for small businesses scaling up',
      features: [
        '5,000 Chatbot Interactions/month',
        '200 FAQ Generations (Deep Website Scraper)',
        '2,000 Speech-to-Text uses/month',
        '5,000 Text-to-Speech conversions (Premium Indian Voices)',
        '2,000 Email Auto-Responses/month',
        'Advanced User Analytics & Timeline',
        '2 domain integrations'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 99,
      period: 'month',
      description: 'Ideal for growing teams and agencies',
      features: [
        '10,000 Chatbot Interactions/month',
        '500 FAQ Generations (Max Depth Scraper)',
        '5,000 Speech-to-Text uses/month',
        '10,000 Text-to-Speech conversions (All Premium Voices)',
        '5,000 Custom Email Auto-Responses/month',
        'Comprehensive User Analytics & Insights',
        '5 domain integrations'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 299,
      period: 'month',
      description: 'For organizations with custom AI needs',
      features: [
        'Unlimited Chatbot Interactions',
        'Unlimited FAQ Generations & Real-time Scraper',
        'Unlimited Speech-to-Text',
        'Unlimited Text-to-Speech (Custom Voice Cloning)',
        'Unlimited Email Auto-Responses',
        'Enterprise User Analytics & SSO',
        'Unlimited domain integrations',
        'Custom AI Model Fine-tuning',
        '24/7 Dedicated Support'
      ]
    }
  ];

  const handlePlanSelect = (plan: { id: string; price: number }) => {
    const planIndex = planHierarchy.indexOf(plan.id);
    
    // Prevent downgrading to lower plans
    if (planIndex < currentPlanIndex) {
      return;
    }
    
    if (plan.id === 'free' || plan.id === currentPlanId) {
      navigate('/dashboard');
      return;
    }
    navigate(`/payment?plan=${plan.id}&amount=${plan.price}`);
  };

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500 ${isDark ? 'bg-black' : 'gradient-bg'}`}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Choose Your Plan
          </h1>
          <p className={`text-xl max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Select the perfect plan for your business needs. You can upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const planIndex = planHierarchy.indexOf(plan.id);
            const isCurrentPlan = plan.id === currentPlanId;
            const cannotDowngrade = planIndex < currentPlanIndex;

            return (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 transition-colors duration-300 ${plan.popular
                  ? `border-2 border-blue-500 shadow-2xl scale-105 ${isDark ? 'bg-gray-900 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white'}`
                  : `border shadow-lg ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'}`
                } ${cannotDowngrade ? 'opacity-60' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Recommended
                  </div>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute top-4 right-4">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{plan.description}</p>
                <div className="flex items-center justify-center">
                  <span className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>${plan.price}</span>
                  <span className={`ml-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
                    <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanSelect(plan)}
                disabled={cannotDowngrade}
                className={`w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-semibold transition-colors duration-200 ${
                  isCurrentPlan
                    ? `${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-700'} cursor-default`
                    : cannotDowngrade
                    ? `${isDark ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`
                    : plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                {cannotDowngrade && <Lock className="w-5 h-5" />}
                {!cannotDowngrade && <CreditCard className="w-5 h-5" />}
                <span>
                  {isCurrentPlan
                    ? 'Your Current Plan'
                    : cannotDowngrade
                    ? 'Upgrade Required'
                    : plan.id === 'free'
                    ? 'Get Started'
                    : 'Upgrade to ' + plan.name}
                </span>
              </button>
            </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            All plans include a 14-day free trial. No setup fees. Cancel anytime. You can only upgrade to higher plans.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingSelect;