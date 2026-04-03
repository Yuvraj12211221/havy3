import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy, Check, Code, Globe, RefreshCw, Trash2, AlertCircle,
  CheckCircle2, TrendingUp, MessageSquareX, BarChart2, Zap,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import DownloadReportButton from '../common/DownloadReportButton';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import { ThemedCard, ThemedStatCard } from '../common/ThemedCard';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const ChatbotConfig: React.FC = () => {
  const { user } = useAuth();
  const theme = useTimeTheme();
  const isDark = theme === 'dark';

  const [copied, setCopied] = useState(false);

  // Scraper state
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [crawlDepth, setCrawlDepth] = useState(1);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ pages: number; chunks: number } | null>(null);
  const [scrapeError, setScrapeError] = useState('');
  const [scrapedInfo, setScrapedInfo] = useState<{ count: number; lastAt: string } | null>(null);
  const [bizId, setBizId] = useState<string | null>(null);
  const [bizName, setBizName] = useState('');
  const [chatbotKey, setChatbotKey] = useState('');

  // FAQ / stats state
  const [faqStats, setFaqStats] = useState<any[]>([]);
  const [faqSummary, setFaqSummary] = useState({ total: 0, matched: 0 });
  const [lowConfidence, setLowConfidence] = useState<any[]>([]);
  const [deadQueries, setDeadQueries] = useState<any[]>([]);
  const [sourcePie, setSourcePie] = useState<any[]>([]);
  const [dailyChart, setDailyChart] = useState<any[]>([]);
  const [avgScore, setAvgScore] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    const { data: biz } = await supabase
      .from('businesses')
      .select('id, business_name, chatbot_key')
      .eq('user_id', user.id)
      .single();
    if (biz) {
      setBizId(biz.id);
      setBizName(biz.business_name || '');
      setChatbotKey(biz.chatbot_key || '');
      await Promise.all([loadFaqAnalytics(biz.id), loadScrapedInfo(biz.id)]);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ── Scraper ──────────────────────────────────────────────────── */
  const loadScrapedInfo = async (id: string) => {
    const { data, count } = await supabase
      .from('scraped_pages')
      .select('scraped_at', { count: 'exact' })
      .eq('business_id', id)
      .order('scraped_at', { ascending: false })
      .limit(1);
    setScrapedInfo(count && count > 0 && data?.[0]
      ? { count: count, lastAt: data[0].scraped_at } : null);
  };

  const handleScrape = async () => {
    if (!scrapeUrl.trim() || !bizId) return;
    setScraping(true); setScrapeResult(null); setScrapeError('');
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-site`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ url: scrapeUrl.trim(), business_id: bizId, crawl_depth: crawlDepth }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Scrape failed');
      setScrapeResult({ pages: json.pages_crawled, chunks: json.chunks_stored });
      await loadScrapedInfo(bizId);
    } catch (err: any) {
      setScrapeError(err.message);
    } finally { setScraping(false); }
  };

  const handleClearScrape = async () => {
    if (!bizId) return;
    await supabase.from('scraped_pages').delete().eq('business_id', bizId);
    setScrapedInfo(null); setScrapeResult(null);
  };

  /* ── FAQ + New Stats ─────────────────────────────────────────── */
  const loadFaqAnalytics = async (id: string) => {
    try {
      const { data } = await supabase
        .from('faq_logs')
        .select('question, matched, similarity_score, answer, created_at')
        .eq('business_id', id)
        .order('created_at', { ascending: true });

      if (!data) return;

      // Basic summary
      const counts: Record<string, number> = {};
      let matched = 0; let totalScore = 0; const lowConf: any[] = [];
      // Source breakdown
      let faqHits = 0, scrapedHits = 0, noAnswer = 0;
      // Dead queries
      const deadMap: Record<string, number> = {};
      // Daily chart (last 30 days)
      const dayMap: Record<string, number> = {};
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);

      data.forEach((row: any) => {
        counts[row.question] = (counts[row.question] || 0) + 1;
        totalScore += row.similarity_score || 0;
        if (row.matched) { matched++; faqHits++; }
        else if (row.answer) { scrapedHits++; }
        else { noAnswer++; deadMap[row.question] = (deadMap[row.question] || 0) + 1; }
        if ((row.similarity_score || 0) < 0.3) lowConf.push(row);
        // daily
        if (row.created_at && new Date(row.created_at) >= cutoff) {
          const day = row.created_at.slice(0, 10);
          dayMap[day] = (dayMap[day] || 0) + 1;
        }
      });

      setFaqSummary({ total: data.length, matched });
      setAvgScore(data.length > 0 ? Math.round((totalScore / data.length) * 100) / 100 : null);
      setFaqStats(
        Object.entries(counts)
          .map(([question, count]) => ({ question, count }))
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 5)
      );
      setLowConfidence(lowConf.slice(0, 5));
      setDeadQueries(
        Object.entries(deadMap)
          .map(([q, c]) => ({ question: q, count: c }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
      );
      setSourcePie([
        { name: 'FAQ Hit', value: faqHits },
        { name: 'Scraped Page', value: scrapedHits },
        { name: 'No Answer', value: noAnswer },
      ].filter(d => d.value > 0));
      setDailyChart(Object.entries(dayMap).map(([day, queries]) => ({ day: day.slice(5), queries })));
    } catch { /**/ }
  };


  const generateSnippet = () => {
    const origin = window.location.origin;
    return `<!-- HAVY Chatbot + UAT Widget -->
<script>
(function(){
  window.HAVYChatbotConfig = {
    chatbotKey: '${chatbotKey || 'YOUR_CHATBOT_KEY'}',
    businessName: '${bizName || 'Your Business'}',
    position: 'bottom-right',
    primaryColor: '#6366f1',
    havyOrigin: '${origin}',
    supabaseUrl: '${import.meta.env.VITE_SUPABASE_URL}',
    anonKey: '${import.meta.env.VITE_SUPABASE_ANON_KEY}',
  };
  window.HAVY_CLIENT_ID = '${bizId || 'YOUR_BUSINESS_ID'}';
  window.HAVY_SUPABASE_URL = '${import.meta.env.VITE_SUPABASE_URL}';
  window.HAVY_SUPABASE_ANON_KEY = '${import.meta.env.VITE_SUPABASE_ANON_KEY}';

  var s = document.createElement('script');
  s.src = '${origin}/chatbot-widget.js'; s.defer = true;
  document.head.appendChild(s);

  var u = document.createElement('script');
  u.src = '${origin}/uat.js'; u.defer = true;
  document.head.appendChild(u);
})();
</script>`;
  };

  const tipStyle = isDark
    ? { backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }
    : { backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#1e293b' };

  const matchRate = faqSummary.total
    ? Math.round((faqSummary.matched / faqSummary.total) * 100) : 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden -m-8">
      {/* Full-page background video */}
      <video
        key={isDark ? 'chatbot-night' : 'chatbot-day'}
        autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source src={isDark ? '/videos/UATnight.mp4' : '/videos/uat-bg-day.mp4'} type="video/mp4" />
      </video>

      {/* Overlay for readability */}
      <div className={`absolute inset-0 z-10 ${isDark ? 'bg-black/65' : 'bg-white/72'}`} />

      <div className="relative z-20 p-6 space-y-6" id="chatbotExport">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Chatbot Configuration</h1>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Analytics, scraping, appearance &amp; embed code</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className={`px-3 py-1.5 text-sm rounded-lg transition flex items-center gap-1.5 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <DownloadReportButton targetId="chatbotExport" fileName="chatbot-report.pdf" />
        </div>
      </div>

      {/* ── Chatbot Health KPIs ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ThemedStatCard label="Total Questions" value={faqSummary.total} sub="all time" />
        <ThemedStatCard label="FAQ Match Rate" value={`${matchRate}%`} sub={`${faqSummary.matched} matched`} accent />
        <ThemedStatCard label="Dead Queries" value={deadQueries.length} sub="no answer found" />
        <ThemedStatCard label="Avg Similarity" value={avgScore !== null ? avgScore.toFixed(2) : '—'} sub="FAQ score" />
      </div>

      {/* ── Source Breakdown + Daily Chart ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ThemedCard solid className="p-4 space-y-2">
          <h3 className={`font-semibold text-sm uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            <Zap className="w-4 h-4 text-indigo-500" /> Answer Source Breakdown
          </h3>
          {sourcePie.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sourcePie} dataKey="value" nameKey="name" outerRadius={70}
                  label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}>
                  {sourcePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>No data yet.</p>}
        </ThemedCard>

        <ThemedCard solid className="p-4 space-y-2">
          <h3 className={`font-semibold text-sm uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            <TrendingUp className="w-4 h-4 text-indigo-500" /> Daily Activity (30 days)
          </h3>
          {dailyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyChart}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={tipStyle} />
                <Line type="monotone" dataKey="queries" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>No recent activity.</p>}
        </ThemedCard>
      </div>

      {/* ── Dead Queries ─────────────────────────────────────────────── */}
      {deadQueries.length > 0 && (
        <ThemedCard solid className="p-4 space-y-3">
          <h3 className={`font-semibold text-sm uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            <MessageSquareX className="w-4 h-4 text-red-500" /> Dead Queries — Add These to FAQs
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {deadQueries.map((q, i) => (
              <div key={i} className={`flex justify-between items-center px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-red-900/20 border-red-900/30' : 'bg-red-50 border-red-100'}`}>
                <span className={`truncate flex-1 mr-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{q.question}</span>
                <span className="text-red-500 font-semibold text-xs whitespace-nowrap">×{q.count}</span>
              </div>
            ))}
          </div>
        </ThemedCard>
      )}

      {/* ── Top FAQs + Low Confidence ──────────────────────────────── */}
      <div id="analyticsExport">
        <ThemedCard solid className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
              <BarChart2 className="w-5 h-5 text-indigo-500" /> FAQ Analytics
            </h2>
          </div>

        <div className="grid grid-cols-3 gap-3">
          <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-indigo-900/20 border-indigo-900/30' : 'bg-gradient-to-br from-indigo-50 to-white'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Queries</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{faqSummary.total}</p>
          </div>
          <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-green-900/20 border-green-900/30' : 'bg-gradient-to-br from-green-50 to-white'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Matched</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{faqSummary.matched}</p>
          </div>
          <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-purple-900/20 border-purple-900/30' : 'bg-gradient-to-br from-purple-50 to-white'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Match Rate</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{matchRate}%</p>
          </div>
        </div>

        <div>
          <h3 className={`font-semibold text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Top Asked Questions</h3>
          <div className="space-y-1.5">
            {faqStats.map((q: any, i) => (
              <div key={i} className={`flex justify-between items-center px-3 py-2.5 rounded-lg border transition text-sm shadow-sm ${isDark ? 'bg-gray-800/50 hover:bg-gray-800 border-gray-700' : 'bg-white hover:bg-gray-50'}`}>
                <span className={`truncate max-w-[80%] ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{q.question}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>{q.count}</span>
              </div>
            ))}
            {faqStats.length === 0 && <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No data yet.</p>}
          </div>
        </div>

        {lowConfidence.length > 0 && (
          <div>
            <h3 className={`font-semibold text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Low Confidence Queries</h3>
            <div className="space-y-1.5">
              {lowConfidence.map((q: any, i) => (
                <div key={i} className={`flex justify-between items-center p-2.5 border rounded-lg text-sm ${isDark ? 'bg-amber-900/10 border-amber-900/30' : 'bg-amber-50'}`}>
                  <span className={`truncate flex-1 mr-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{q.question}</span>
                  <span className={`text-xs font-medium whitespace-nowrap ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    score: {(q.similarity_score || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </ThemedCard>
      </div>

      {/* ── Scrape My Site ──────────────────────────────────────────── */}
      <ThemedCard solid className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-500" />
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white/90' : 'text-gray-900'}`}>Smart Scraper — Index My Website</h2>
        </div>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          The chatbot uses scraped content to answer questions not covered by FAQs.
        </p>

        {scrapedInfo && (
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isDark ? 'bg-green-900/10 border-green-900/30' : 'bg-green-50 border-green-200'}`}>
            <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-green-400' : 'text-green-700'}`}>
              <CheckCircle2 className="w-4 h-4" />
              <span><strong>{scrapedInfo.count}</strong> chunks indexed · last scraped {new Date(scrapedInfo.lastAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <button onClick={handleClearScrape} className={`flex items-center gap-1 text-xs transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}>
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <input type="url" value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)}
            placeholder="https://yourwebsite.com"
            className={`flex-1 px-4 py-2 border-2 rounded-xl focus:outline-none focus:border-indigo-400 text-sm transition ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'border-gray-200'}`} />
          <select value={crawlDepth} onChange={e => setCrawlDepth(Number(e.target.value))}
            className={`px-3 py-2 border-2 rounded-xl text-sm focus:outline-none focus:border-indigo-400 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-200'}`}>
            <option value={0}>Home only</option>
            <option value={1}>+1 level</option>
            <option value={2}>+2 levels</option>
          </select>
        </div>

        <button onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium">
          <RefreshCw className={`w-4 h-4 ${scraping ? 'animate-spin' : ''}`} />
          {scraping ? 'Scraping…' : 'Scrape Now'}
        </button>

        {scrapeResult && (
          <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border ${isDark ? 'text-green-400 bg-green-900/10 border-green-900/30' : 'text-green-700 bg-green-50 border-green-200'}`}>
            <CheckCircle2 className="w-4 h-4" />
            Done! Crawled <strong>{scrapeResult.pages}</strong> pages → stored <strong>{scrapeResult.chunks}</strong> chunks.
          </div>
        )}
        {scrapeError && (
          <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border ${isDark ? 'text-red-400 bg-red-900/10 border-red-900/30' : 'text-red-600 bg-red-50 border-red-200'}`}>
            <AlertCircle className="w-4 h-4" /> {scrapeError}
          </div>
        )}
      </ThemedCard>


      {/* ── Embed Code ──────────────────────────────────────────────── */}
      <ThemedCard solid className="p-5 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white/90' : 'text-gray-900'}`}>Embed Code Snippet</h2>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(generateSnippet()); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {copied ? <><Check className="w-4 h-4 text-green-500" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Code</>}
          </button>
        </div>
        <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Paste into the <code>&lt;head&gt;</code> of your client website. The GIF icon, FAQ, and UAT tracking all load from <strong className={isDark ? 'text-gray-200' : ''}>HAVY's origin</strong> automatically.
        </p>
        <div className="bg-gray-900 rounded-lg p-4">
          <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap">
            <code>{generateSnippet()}</code>
          </pre>
        </div>
      </ThemedCard>
    </div>
    </div>
  );
};

export default ChatbotConfig;
