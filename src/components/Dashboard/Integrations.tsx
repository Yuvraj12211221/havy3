import React, { useState, useEffect } from 'react';
import { Copy, Check, Code, ShieldCheck, Zap, Lock, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTimeTheme } from '../../hooks/useTimeTheme';

const Integrations: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const [chatbotKey, setChatbotKey] = useState('');
  const [businessId, setBusinessId] = useState('');  // ← business.id (not user.id)
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const theme = useTimeTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (user) {
      supabase
        .from('businesses')
        .select('id, chatbot_key')   // ← also fetch id
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setChatbotKey(data?.chatbot_key || '');
          setBusinessId(data?.id || '');  // ← store business.id
          setLoading(false);
        });
    }
  }, [user]);

  const getUniversalSnippet = () => {
    const origin = window.location.origin;
    const supa = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const anon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    return `<script>window.HAVY_CONFIG={businessId:'${businessId}',chatbotKey:'${chatbotKey}',supabaseUrl:'${supa}',supabaseAnonKey:'${anon}'};</script>\n<script src="${origin}/havy-universal.js" defer></script>`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getUniversalSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Universal Integration</h1>
          <p className={isDark ? 'text-white/50' : 'text-gray-500'}>Loading your integration details…</p>
        </div>
        <div className={`rounded-2xl p-12 flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-100'}`}>
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── LOCKED: No business account yet ────────────────────────
  if (!chatbotKey) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Universal Integration</h1>
          <p className={isDark ? 'text-white/50' : 'text-gray-500'}>A single embed snippet to unlock all HAVY features on your website.</p>
        </div>

        <div
          style={{
            borderRadius: 20,
            padding: '48px 32px',
            textAlign: 'center',
            background: isDark
              ? 'linear-gradient(145deg, rgba(99,102,241,0.08), rgba(15,15,40,0.6))'
              : 'linear-gradient(145deg, #f0f4ff, #ffffff)',
            border: `1.5px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)'}`,
            boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.3)' : '0 8px 40px rgba(99,102,241,0.08)',
          }}
        >
          {/* Lock icon with glow */}
          <div style={{
            width: 80, height: 80, borderRadius: 20, margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 40px rgba(99,102,241,0.4)',
          }}>
            <Lock size={36} color="white" />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px', color: isDark ? '#fff' : '#0f172a', letterSpacing: '-0.02em' }}>
            Set Up Your Business Profile First
          </h2>
          <p style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b', maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.7 }}>
            The integration snippet is unlocked once you create a business account. Your unique <strong>Chatbot Key</strong> will be embedded automatically in the snippet.
          </p>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            maxWidth: 360, margin: '0 auto 32px', textAlign: 'left',
          }}>
            {[
              { icon: Building2, text: 'Go to Business Profile in the sidebar' },
              { icon: Code,      text: 'Fill in your business details and save' },
              { icon: ShieldCheck, text: 'Your Chatbot Key is generated automatically' },
              { icon: Zap,       text: 'Return here to copy your integration snippet' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={15} color={isDark ? '#a5b4fc' : '#6366f1'} />
                </div>
                <span style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#475569' }}>{text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/dashboard/business')}
            style={{
              padding: '13px 28px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.4)'; }}
          >
            <Building2 size={16} /> Set Up Business Profile <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── UNLOCKED: Show snippet ──────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Universal Integration</h1>
          <p className={isDark ? 'text-white/50' : 'text-gray-600'}>A single embed snippet to unlock all HAVY features on your website.</p>
        </div>
        {/* Key badge */}
        <div style={{
          padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: 'rgba(16,185,129,0.1)', color: '#10b981',
          border: '1px solid rgba(16,185,129,0.25)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          Business Account Active
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

        <div className="bg-gray-900 rounded-xl p-5 mb-5">
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
              Simply set the configuration flags to <code className="font-mono bg-blue-100 px-1 rounded text-blue-800">true</code> or <code className="font-mono bg-blue-100 px-1 rounded text-blue-800">false</code> in the snippet above to activate or deactivate specific modules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;