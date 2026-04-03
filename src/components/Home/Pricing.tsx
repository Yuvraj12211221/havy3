import React from 'react';
import { Check, Star } from 'lucide-react';
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
      navigate('/signin');
      return;
    }

    // ✅ FREE PLAN → skip payment
    if (plan.price === 0) {
      navigate('/dashboard');
      return;
    }

    // ✅ PAID PLAN → go to payment with required params
    navigate(
      `/payment?planId=${plan.id}&amount=${plan.price}&userId=${user.id}&email=${user.email}`
    );
  };

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
      ],
      popular: false
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 2499,
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
      ],
      popular: false
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 7999,
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
      price: 24999,
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
      ],
      popular: false
    }
  ];

  return (
    <section className={`py-20 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Choose Your Perfect Plan
          </h2>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-8 ${plan.popular
                  ? 'border-2 border-blue-500 scale-105'
                  : 'border'
                }`}
            >
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="mb-4">{plan.description}</p>

              <div className="mb-6">
                ₹{plan.price} / {plan.period}
              </div>

              <ul className="mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check size={16} /> {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg"
              >
                {plan.price === 0 ? 'Start Free' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;