import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import DownloadReportButton from '../common/DownloadReportButton';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed'];

type EmailsPerDayRow = { day: string; email_count: number };
type IntentRow = { intent_category: string; count: number };

export default function Analytics() {
  const [emailsPerDay, setEmailsPerDay] = useState<EmailsPerDayRow[]>([]);
  const [intentData, setIntentData] = useState<IntentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEmails, setTotalEmails] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);

    // Scope to this user's business
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: biz } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!biz) { setLoading(false); return; }

    const [{ data: daily }, { data: intents }] = await Promise.all([
      supabase
        .from('analytics_emails_per_day')
        .select('*')
        .eq('business_id', biz.id)
        .order('day', { ascending: true }),
      supabase
        .from('analytics_intent_distribution')
        .select('*')
        .eq('business_id', biz.id),
    ]);

    const rows = daily || [];
    setEmailsPerDay(rows);
    setTotalEmails(rows.reduce((s, r) => s + r.email_count, 0));
    setIntentData(intents || []);
    setLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-600 font-medium animate-pulse">Loading analytics...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8" id="analyticsExport">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">Email performance for your business</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm text-gray-500">Total Emails</h3>
          <p className="text-3xl font-bold">{totalEmails}</p>
        </div>
        <div className="card">
          <h3 className="text-sm text-gray-500">Intent Categories</h3>
          <p className="text-3xl font-bold">{intentData.length}</p>
        </div>
      </div>

      {/* Emails per day bar chart */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Emails Received per Day</h2>
        {emailsPerDay.length === 0 ? (
          <p className="text-gray-500 text-sm">No email data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={emailsPerDay}>
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="email_count" fill="#2563eb" name="Emails" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Intent distribution pie */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Intent Distribution</h2>
        {intentData.length === 0 ? (
          <p className="text-gray-500 text-sm">No intent data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={intentData}
                dataKey="count"
                nameKey="intent_category"
                outerRadius={110}
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {intentData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <DownloadReportButton targetId="analyticsExport" fileName="analytics-report.pdf" />
    </div>
  );
}
