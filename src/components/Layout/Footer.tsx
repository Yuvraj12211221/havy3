import React from 'react';
import { Bot, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Bot className="w-8 h-8 text-blue-400" />
              <span className="text-xl font-bold">HAVY AI Services</span>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              Empower your business with cutting-edge AI solutions. From intelligent chatbots to automated responses, we help you scale your customer engagement effortlessly.
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="w-4 h-4" />
                <span>havyaiservices67@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="w-4 h-4" />
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-gray-300">
              <li>AI Chatbot</li>
              <li>Email Auto-Responder</li>
              <li>Text-to-Speech</li>
              <li>Speech Translation</li>
              <li>Analytics Dashboard</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-gray-300">
              <li>About Us</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Support</li>
              <li>Documentation</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2026 HAVY AI Services. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;