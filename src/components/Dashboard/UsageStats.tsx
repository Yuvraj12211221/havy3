// src/components/Dashboard/UsageStats.tsx
// Display usage statistics from database with real-time sync

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import { MessageSquare, FileText, Zap, Phone, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UsageStat {
  type: string;
  label: string;
  icon: React.ReactNode;
  totalUsed: number;
  limit: number;
  unit: string;
  showProgress: boolean;
}

const UsageStats: React.FC = () => {
  const { user } = useAuth();
  const { benefits } = useSubscription();
  const theme = useTimeTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [usageStats, setUsageStats] = useState<UsageStat[]>([]);

  // Refresh usage stats periodically (every 10 seconds for real-time feel)
  useEffect(() => {
    const loadUsageStats = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Query from dashboard_user_stats view - aggregated from database
        const { data: stats, error } = await supabase
          .from('dashboard_user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No data yet, show all zeros
            console.log('No stats for user yet');
          } else {
            console.error('Error loading dashboard stats:', error);
          }
          
          // Show template with zeros
          if (benefits) {
            const defaultStats: UsageStat[] = [
              {
                type: 'api_calls',
                label: 'Chatbot Interactions',
                icon: <MessageSquare className="w-5 h-5" />,
                totalUsed: 0,
                limit: benefits.maxApiCalls || 1000,
                unit: '/month',
                showProgress: true,
              },
              {
                type: 'tts_characters',
                label: 'TTS Characters',
                icon: <Zap className="w-5 h-5" />,
                totalUsed: 0,
                limit: benefits.maxTtsCharacters || 1000,
                unit: '/month',
                showProgress: true,
              },
              {
                type: 'stt_uses',
                label: 'Speech-to-Text Uses',
                icon: <Phone className="w-5 h-5" />,
                totalUsed: 0,
                limit: benefits.maxSttUses || 500,
                unit: '/month',
                showProgress: true,
              },
              {
                type: 'email_responses',
                label: 'Email Auto-Responses',
                icon: <Mail className="w-5 h-5" />,
                totalUsed: 0,
                limit: benefits.maxEmailResponses || 500,
                unit: '/month',
                showProgress: true,
              },
              {
                type: 'faq_created',
                label: 'FAQ Documents',
                icon: <FileText className="w-5 h-5" />,
                totalUsed: 0,
                limit: benefits.maxFaqDocuments || 50,
                unit: 'created',
                showProgress: true,
              },
              {
                type: 'chatbots_created',
                label: 'Chatbots Created',
                icon: <MessageSquare className="w-5 h-5" />,
                totalUsed: 0,
                limit: benefits.maxChatbots || 1,
                unit: 'created',
                showProgress: true,
              },

            ];
            setUsageStats(defaultStats);
          }
        } else if (stats) {
          // Build stats from database view
          const dbStats: UsageStat[] = [
            {
              type: 'api_calls',
              label: 'Chatbot Interactions',
              icon: <MessageSquare className="w-5 h-5" />,
              totalUsed: stats.api_calls_used || 0,
              limit: stats.api_calls_limit || 1000,
              unit: '/month',
              showProgress: true,
            },
            {
              type: 'tts_characters',
              label: 'TTS Characters',
              icon: <Zap className="w-5 h-5" />,
              totalUsed: stats.tts_characters_used || 0,
              limit: stats.tts_characters_limit || 1000,
              unit: '/month',
              showProgress: true,
            },
            {
              type: 'stt_uses',
              label: 'Speech-to-Text Uses',
              icon: <Phone className="w-5 h-5" />,
              totalUsed: stats.stt_uses_used || 0,
              limit: stats.stt_uses_limit || 500,
              unit: '/month',
              showProgress: true,
            },
            {
              type: 'email_responses',
              label: 'Email Auto-Responses',
              icon: <Mail className="w-5 h-5" />,
              totalUsed: stats.email_responses_sent || 0,
              limit: stats.email_responses_limit || 500,
              unit: '/month',
              showProgress: true,
            },
            {
              type: 'faq_created',
              label: 'FAQ Documents',
              icon: <FileText className="w-5 h-5" />,
              totalUsed: stats.faq_created || 0,
              limit: stats.faq_limit || 50,
              unit: 'created',
              showProgress: true,
            },
            {
              type: 'chatbots_created',
              label: 'Chatbots Created',
              icon: <MessageSquare className="w-5 h-5" />,
              totalUsed: stats.chatbots_created || 0,
              limit: stats.chatbots_limit || 1,
              unit: 'created',
              showProgress: true,
            },
          ];

          setUsageStats(dbStats);
        }
      } catch (err) {
        console.error('Error loading usage stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsageStats();

    // Set up polling for real-time updates (every 10 seconds)
    const interval = setInterval(loadUsageStats, 10000);

    return () => clearInterval(interval);
  }, [user, benefits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-6 space-y-6 ${
      isDark ? 'bg-gray-800' : 'bg-gray-50'
    }`}>
      <div>
        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Usage This Month
        </h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Real-time tracking from database
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {usageStats.map((stat) => {
          const percentage = stat.limit > 0 ? Math.min(100, Math.round((stat.totalUsed / stat.limit) * 100)) : 0;
          const isWarning = percentage >= 80;
          const isExceeded = stat.totalUsed >= stat.limit && stat.limit > 0;

          return (
            <div
              key={stat.type}
              className={`rounded-lg p-4 space-y-3 ${
                isDark ? 'bg-gray-700' : 'bg-white'
              } border ${
                isExceeded
                  ? isDark ? 'border-red-600' : 'border-red-300'
                  : isWarning
                  ? isDark ? 'border-yellow-600' : 'border-yellow-300'
                  : isDark ? 'border-gray-600' : 'border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`${
                    isExceeded
                      ? isDark ? 'text-red-400' : 'text-red-600'
                      : isWarning
                      ? isDark ? 'text-yellow-400' : 'text-yellow-600'
                      : isDark ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {stat.label}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {stat.unit}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${
                    isExceeded
                      ? isDark ? 'text-red-400' : 'text-red-600'
                      : isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {stat.totalUsed >= 1000 && stat.limit >= 1000
                      ? `${(stat.totalUsed / 1000).toFixed(1)}k`
                      : stat.totalUsed.toFixed(0)}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    / {stat.limit >= 1000 && stat.limit < Infinity ? `${(stat.limit / 1000).toFixed(0)}k` : (stat.limit === Infinity ? '∞' : stat.limit.toFixed(0))}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {stat.showProgress && (
                <>
                  <div className={`h-2 rounded-full overflow-hidden ${
                    isDark ? 'bg-gray-600' : 'bg-gray-300'
                  }`}>
                    <div
                      className={`h-full transition-all ${
                        isExceeded
                          ? isDark ? 'bg-red-500' : 'bg-red-600'
                          : isWarning
                          ? isDark ? 'bg-yellow-500' : 'bg-yellow-600'
                          : isDark ? 'bg-blue-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  {/* Status Text */}
                  <p className={`text-xs text-right ${
                    isExceeded
                      ? isDark ? 'text-red-400' : 'text-red-600'
                      : isWarning
                      ? isDark ? 'text-yellow-400' : 'text-yellow-600'
                      : isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {percentage}% used
                    {isExceeded && ' — Limit exceeded'}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className={`p-4 rounded-lg ${
        isDark ? 'bg-blue-900/20' : 'bg-blue-50'
      } border ${isDark ? 'border-blue-800' : 'border-blue-200'}`}>
        <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
          📊 <strong>Auto-refresh:</strong> Updates every 10 seconds from live database | Resets 1st of each month
        </p>
      </div>
    </div>
  );
};

export default UsageStats;
