import React from 'react';
import { MessageSquare, Mail, Volume2, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import CursorGlow from '../common/CursorGlow';

const Hero: React.FC = () => {
  const theme = useTimeTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const features = [
    { icon: MessageSquare, title: 'Smart Chatbot',          description: 'Domain-specific AI chatbot with keyword similarity matching' },
    { icon: Mail,          title: 'Email Auto-Responder',  description: 'Intelligent email responses powered by AI' },
    { icon: Volume2,       title: 'Text-to-Speech',        description: 'Natural voice synthesis for better accessibility' },
    { icon: Globe,         title: 'User Attention Tracker', description: 'Know where your users click, hover & scroll on your site' },
  ];

  return (
    <section className={`
      relative w-full overflow-hidden
      flex flex-col items-center justify-center
      min-h-[calc(100vh-4rem)] py-20
      transition-colors duration-500
      ${isDark ? 'bg-gray-950' : 'gradient-bg'}
    `}>
      <CursorGlow />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero text */}
        <div className="text-center mb-16 fade-in">
          <div className={`
            inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6
            ${isDark ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}
          `}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            AI-Powered Business Tools
          </div>

          <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span className="shimmer-text">Sophisticate</span> Your Website with{' '}
            <span className={isDark
              ? 'bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent'
            }>AI Services</span>
          </h1>

          <p className={`text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            One embed snippet. Chatbot, voice dictation, email responder and
            traffic tracking — all ready for your commercial website.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-3.5 rounded-xl text-white font-semibold text-sm bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5"
            >
              Get Started Free →
            </button>
            <button
              onClick={() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })}
              className={`px-8 py-3.5 rounded-xl font-semibold text-sm border transition-all hover:-translate-y-0.5
                ${isDark ? 'border-white/20 text-white hover:bg-white/8' : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 shadow-sm'}`}
            >
              View Pricing
            </button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 slide-up">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`
                group rounded-2xl p-6 text-center
                transition-all duration-300 hover:-translate-y-1 cursor-default
                ${isDark
                  ? 'bg-gray-900/60 border border-gray-800 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                  : 'bg-white shadow-md hover:shadow-xl border border-gray-100'
                }
              `}
            >
              <div className="flex justify-center mb-4">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center
                  transition-transform duration-300 group-hover:scale-110
                  ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-50'}
                `}>
                  <feature.icon className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                </div>
              </div>
              <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {feature.title}
              </h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;