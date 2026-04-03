import { MessageSquare, Mail, Volume2, Globe } from 'lucide-react';
import { useTimeTheme } from "../../hooks/useTimeTheme";
import CursorGlow from '../common/CursorGlow';

const Hero: React.FC = () => {
  const theme = useTimeTheme();
  const isDark = theme === 'dark';
  const features = [
    {
      icon: MessageSquare,
      title: 'Smart Chatbot',
      description: 'Domain-specific AI chatbot with multilingual support'
    },
    {
      icon: Mail,
      title: 'Email Auto-Responder',
      description: 'Intelligent email responses powered by AI'
    },
    {
      icon: Volume2,
      title: 'Text-to-Speech',
      description: 'Natural voice synthesis for better accessibility'
    },
    {
      icon: Globe,
      title: 'User Attention Tracker',
      description: 'Know the interests of your users on your website'
    }
  ];

  return (
    <section className={`relative overflow-hidden min-h-[95vh] flex flex-col justify-center py-20 transition-colors duration-500 ${isDark ? 'bg-gray-950' : 'gradient-bg'}`}>
      <CursorGlow />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center fade-in">
          <div className="flex justify-center items-center space-x-1 mb-4">
            <div className="flex">
            </div>
          </div>

          <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <span className="shimmer-text">Sophisticate</span> Your Website with
            <span className={isDark ? "bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent" : "bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent"}> AI Services</span>
          </h1>

          <p className={`text-xl mb-12 max-w-3xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Get a little helping hand for your commercial website with chatbot, on-cursor dictation
            and traffic tracking features
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 slide-up">
          {features.map((feature, index) => (
            <div key={index} className={`rounded-xl p-6 text-center hover:scale-105 transition-all duration-300 ${isDark ? 'bg-gray-900/50 border border-gray-800 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] shadow-lg' : 'bg-white shadow-lg hover:shadow-xl'}`}>
              <div className="flex justify-center mb-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transform transition-transform ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <feature.icon className={`w-7 h-7 ${isDark ? 'text-yellow-500' : 'text-yellow-600'}`} />
                </div>
              </div>
              <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{feature.title}</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;