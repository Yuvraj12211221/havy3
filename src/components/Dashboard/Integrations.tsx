import React, { useState, useEffect } from 'react';
import { Copy, Check, Code, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const Integrations: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const [chatbotKey, setChatbotKey] = useState('');
  
  useEffect(() => {
    if (user) {
      supabase.from('businesses').select('chatbot_key').eq('user_id', user.id).single()
        .then(({ data }) => setChatbotKey(data?.chatbot_key || ''));
    }
  }, [user]);

  const getUniversalSnippet = () => {
    const origin = window.location.origin;
    return `<!-- HAVY Universal AI Integration -->
<script>
  window.HAVY_CONFIG = {
    businessId: '${user?.id || 'YOUR_BUSINESS_ID'}',
    chatbotKey: '${chatbotKey || 'YOUR_CHATBOT_KEY'}',
    themeColor: '#6366f1',
    position: 'bottom-right',
    // Active features (Credit checks happen on backend)
    enableChatbot: true,
    enableUAT: true,
    enableTTS: true
  };
</script>
<script src="${origin}/havy-universal.js" defer></script>`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getUniversalSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Universal Integration</h1>
          <p className="text-gray-600">A single embed snippet to unlock all HAVY features on your website.</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Universal Web Snippet</h3>
              <p className="text-sm text-gray-500">Paste this exactly once into the <code className="bg-gray-100 px-1 py-0.5 rounded">&lt;head&gt;</code> of your website.</p>
            </div>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
          >
            {copied ? (
              <><Check className="w-4 h-4 text-green-600" /><span className="text-green-600 font-medium">Copied!</span></>
            ) : (
              <><Copy className="w-4 h-4" /><span className="font-medium">Copy Embed Code</span></>
            )}
          </button>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 mb-5 relative group">
          <pre className="text-green-400 text-sm overflow-x-auto whitespace-pre-wrap font-mono">
            <code>{getUniversalSnippet()}</code>
          </pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">Secure Access Checking</h4>
            </div>
            <p className="text-sm text-gray-600">
              This unified script automatically verifies your AI Credits via the dashboard before enabling Chatbot, FAQ Generator, TTS, or Email Autoresponder functionalities.
            </p>
          </div>
          <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Toggle Features</h4>
            </div>
            <p className="text-sm text-gray-600">
              Simply set the configuration flags to <code className="font-mono bg-blue-100 px-1 rounded text-blue-800">true</code> or <code className="font-mono bg-blue-100 px-1 rounded text-blue-800">false</code> in the snippet above to activate or deactivate specific modules without removing the code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;