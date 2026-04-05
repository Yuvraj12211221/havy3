import React from 'react';
import { Check, Star, Zap, Shield, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import { useAuth } from '../../contexts/AuthContext';

const Pricing: React.FC = () => {
  const theme = useTimeTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSelectPlan = (plan: any) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (plan.price === 0) {
      navigate('/dashboard');
      return;
    }
    navigate(`/payment?planId=${plan.id}&amount=${plan.price}&userId=${user.id}&email=${user.email}`);
  };

  const plans = [
    {
      id: 'free', name: 'Free', price: 0, period: 'forever',
      description: 'Try HAVY with no commitment',
      icon: Shield, iconColor: '#6b7280',
      gradient: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
      darkGradient: 'linear-gradient(135deg, rgba(107,114,128,0.15), rgba(107,114,128,0.05))',
      accentColor: '#6b7280',
      features: [
        '1,000 Chatbot Interactions/month',
        '50 FAQ Generations',
        '500 Speech-to-Text uses/month',
        '1,000 TTS conversions/month',
        '500 Email Auto-Responses/month',
        'Standard Analytics (Always Free)',
        '1 domain integration',
      ],
      popular: false, cta: 'Start Free',
    },
    {
      id: 'starter', name: 'Starter', price: 2499, period: 'month',
      description: 'Perfect for small businesses scaling up',
      icon: Zap, iconColor: '#3b82f6',
      gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
      darkGradient: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
      accentColor: '#3b82f6',
      features: [
        '5,000 Chatbot Interactions/month',
        '200 FAQ Generations (Deep Scraper)',
        '2,000 Speech-to-Text uses/month',
        '5,000 TTS conversions (Premium Voices)',
        '2,000 Email Auto-Responses/month',
        'Advanced Analytics & Timeline',
        '2 domain integrations',
      ],
      popular: false, cta: 'Get Started',
    },
    {
      id: 'professional', name: 'Professional', price: 7999, period: 'month',
      description: 'Ideal for growing teams and agencies',
      icon: Star, iconColor: '#7c3aed',
      gradient: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
      darkGradient: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.07))',
      accentColor: '#7c3aed',
      features: [
        '10,000 Chatbot Interactions/month',
        '500 FAQ Generations (Max Depth)',
        '5,000 Speech-to-Text uses/month',
        '10,000 TTS conversions (All Voices)',
        '5,000 Custom Email Responses/month',
        'Comprehensive Analytics & Insights',
        '5 domain integrations',
      ],
      popular: true, cta: 'Get Started',
    },
    {
      id: 'enterprise', name: 'Enterprise', price: 24999, period: 'month',
      description: 'For organizations with custom AI needs',
      icon: Crown, iconColor: '#ea580c',
      gradient: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
      darkGradient: 'linear-gradient(135deg, rgba(234,88,12,0.18), rgba(234,88,12,0.06))',
      accentColor: '#ea580c',
      features: [
        'Unlimited Chatbot Interactions',
        'Unlimited FAQ Generations & Real-time',
        'Unlimited Speech-to-Text',
        'Unlimited TTS (Custom Voice Cloning)',
        'Unlimited Email Auto-Responses',
        'Enterprise Analytics & SSO',
        'Unlimited domains + Custom AI Fine-tuning',
        '24/7 Dedicated Support',
      ],
      popular: false, cta: 'Contact Us',
    },
  ];

  return (
    <section id="pricing-section" className={`w-full py-20 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-14">
          <div className={`
            inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-5
            ${isDark ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`} />
            Simple, Transparent Pricing
          </div>
          <h2 className={`text-3xl sm:text-4xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Choose Your Perfect Plan
          </h2>
          <p className={`text-base max-w-xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            All prices in INR. No hidden fees. Cancel anytime.
          </p>
        </div>

        {/* Plan Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`
                  relative flex flex-col rounded-2xl overflow-hidden
                  transition-all duration-300 hover:-translate-y-1
                  ${plan.popular
                    ? isDark
                      ? 'ring-2 ring-violet-500 shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                      : 'ring-2 ring-violet-500 shadow-[0_8px_40px_rgba(124,58,237,0.2)]'
                    : isDark
                      ? 'ring-1 ring-white/10 hover:ring-white/20'
                      : 'ring-1 ring-gray-200 shadow-sm hover:shadow-md'
                  }
                  ${isDark ? 'bg-gray-900' : 'bg-white'}
                `}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 text-center py-1.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600">
                    ⚡ MOST POPULAR
                  </div>
                )}

                {/* Card header */}
                <div
                  className={`${plan.popular ? 'pt-8' : 'pt-6'} px-6 pb-5`}
                  style={{ background: isDark ? plan.darkGradient : plan.gradient }}
                >
                  {/* Icon + name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: plan.accentColor + '20', border: `1.5px solid ${plan.accentColor}30` }}>
                      <Icon size={20} style={{ color: plan.accentColor }} />
                    </div>
                    <div>
                      <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/{plan.period}</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 px-6 py-5">
                  <ul className="space-y-2.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: plan.accentColor }} />
                        <span className={`text-xs leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="px-6 pb-6">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
                    style={plan.popular ? {
                      background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                      color: '#fff',
                      boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                    } : {
                      background: isDark ? 'rgba(255,255,255,0.08)' : plan.accentColor + '15',
                      color: isDark ? '#fff' : plan.accentColor,
                      border: `1.5px solid ${plan.accentColor}30`,
                    }}
                  >
                    {!user && plan.price > 0 ? 'Sign In to Purchase' : plan.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className={`text-center text-xs mt-10 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          All plans include UAE, standard email support and access to HAVY dashboard.
          Paid plans are billed monthly and can be cancelled at any time.
        </p>
      </div>
    </section>
  );
};

export default Pricing;