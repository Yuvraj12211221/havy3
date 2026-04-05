import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ThemedCard, ThemedStatCard } from "../common/ThemedCard";
import { useTimeTheme } from "../../hooks/useTimeTheme";
import { useSubscription } from "../../contexts/SubscriptionContext";

// ─── Circular usage stat ────────────────────────────────────────────────────
const CircularStat = ({ percentage, label, used, limit, color, isDark }: any) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const p = isNaN(percentage) ? 0 : percentage;
  const offset = circumference - (Math.min(100, p) / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow ${isDark ? "bg-white/5 border border-white/10" : "bg-white border border-gray-100"}`}>
      <div className="relative flex items-center justify-center w-24 h-24 mb-3">
        <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className={isDark ? "text-gray-700" : "text-gray-100"} />
          <circle cx="48" cy="48" r={radius} stroke={color} strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
        </svg>
        <span className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-700"}`}>{Math.round(p)}%</span>
      </div>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center px-1 leading-tight h-8 flex items-center">{label}</span>
      <span className={`text-xs mt-1 font-medium px-2 py-0.5 rounded-md ${isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"}`}>{used} / {limit}</span>
    </div>
  );
};

// ─── Current Plan Card ───────────────────────────────────────────────────────
const CurrentPlanCard = ({ isDark }: { isDark: boolean }) => {
  const { planId, benefits, loading } = useSubscription();
  const navigate = useNavigate();

  const planMeta: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
    free:         { label: "Free",         color: "#6b7280", bg: isDark ? "rgba(107,114,128,0.15)" : "#f3f4f6", emoji: "🌱" },
    starter:      { label: "Starter",      color: "#3b82f6", bg: isDark ? "rgba(59,130,246,0.15)" : "#eff6ff", emoji: "🚀" },
    professional: { label: "Professional", color: "#7c3aed", bg: isDark ? "rgba(124,58,237,0.15)" : "#f5f3ff", emoji: "⚡" },
    enterprise:   { label: "Enterprise",   color: "#ea580c", bg: isDark ? "rgba(234,88,12,0.15)"  : "#fff7ed", emoji: "🏢" },
  };

  const meta = planMeta[planId] || planMeta.free;

  if (loading) return null;

  return (
    <div
      style={{
        borderRadius: 16,
        padding: "20px 24px",
        background: meta.bg,
        border: `1.5px solid ${meta.color}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
      }}
    >
      {/* Left: plan badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 48, height: 48, borderRadius: 12,
            background: `${meta.color}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
            border: `1.5px solid ${meta.color}30`,
          }}
        >
          {meta.emoji}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: meta.color }}>
            Current Plan
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 800, color: isDark ? "#fff" : "#0f172a", letterSpacing: "-0.02em" }}>
            {meta.label}
          </p>
        </div>
      </div>

      {/* Middle: key quotas */}
      {benefits && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { label: "Chatbot Interactions", value: benefits.maxApiCalls >= 999999 ? "Unlimited" : `${benefits.maxApiCalls.toLocaleString()}/mo` },
            { label: "Speech-to-Text",       value: benefits.maxSttUses >= 999999   ? "Unlimited" : `${benefits.maxSttUses.toLocaleString()}/mo` },
            { label: "FAQ Docs",             value: benefits.maxFaqDocuments >= 9999 ? "Unlimited" : `${benefits.maxFaqDocuments}` },
          ].map((q) => (
            <div key={q.label} style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: meta.color }}>{q.value}</p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: isDark ? "#94a3b8" : "#64748b", fontWeight: 500, letterSpacing: "0.04em" }}>{q.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Right: CTA */}
      {planId !== "enterprise" && (
        <button
          onClick={() => navigate("/pricing-select")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: `0 4px 16px ${meta.color}40`,
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${meta.color}50`; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 4px 16px ${meta.color}40`; }}
        >
          {planId === "free" ? "⬆ Upgrade Plan" : "⬆ Upgrade"}
        </button>
      )}
    </div>
  );
};

// ─── Main DashboardHome ───────────────────────────────────────────────────────
export default function DashboardHome() {
  const theme = useTimeTheme();
  const isDark = theme === "dark";

  const [userName, setUserName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");
  const [nameGlow, setNameGlow] = useState(false);

  const [totalInteractions, setTotalInteractions] = useState(0);
  const [emailResponses, setEmailResponses] = useState(0);
  const [ttsConversions, setTtsConversions] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [sliderDays, setSliderDays] = useState(7);
  const [userCredits, setUserCredits] = useState<any>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    setNameGlow(true);
    setTimeout(() => setNameGlow(false), 2000);
    loadDashboard(sliderDays);
  }, []);

  useEffect(() => { loadDashboard(sliderDays); }, [sliderDays]);

  async function loadDashboard(days: number = 7) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    setUserName(profile?.full_name || "User");

    const { data: business } = await supabase.from("businesses").select("id, business_name").eq("user_id", user.id).single();
    if (!business) return;

    setBusinessName(business.business_name || "");
    const cid = business.id;

    const { data: recent } = await supabase.from("uat_events")
      .select("event_type, page_url, occurred_at").eq("client_id", cid)
      .order("occurred_at", { ascending: false }).limit(5);
    setRecentEvents(recent || []);

    const { count: interactionCount } = await supabase.from("uat_events")
      .select("*", { count: "exact", head: true }).eq("client_id", cid);
    setTotalInteractions(interactionCount || 0);

    const { count: emailCount } = await supabase.from("email_logs")
      .select("*", { count: "exact", head: true }).eq("business_id", cid);
    setEmailResponses(emailCount || 0);

    const { count: ttsCount } = await supabase.from("tts_events")
      .select("*", { count: "exact", head: true }).eq("user_id", user.id);
    setTtsConversions(ttsCount || 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { data: activeEvents } = await supabase.from("uat_events")
      .select("session_id").eq("client_id", cid).gte("occurred_at", yesterday.toISOString());
    setActiveUsers(new Set(activeEvents?.map((e: any) => e.session_id)).size);


    // ── Credit usage: count directly from real tables ──────────
    // The `dashboard_user_stats` view may not exist — query live instead.

    // 1. Chatbot interactions = faq_logs for this business this month
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { count: chatbotUsed } = await supabase
      .from('faq_logs')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', cid)
      .gte('created_at', monthStart);

    // 2. STT uses = usage_tracking rows for stt this month
    const { count: sttUsed } = await supabase
      .from('usage_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('feature', 'stt')
      .gte('created_at', monthStart);

    // 3. FAQ generated = faq_analytics rows this month
    const { count: faqUsed } = await supabase
      .from('faq_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('chatbot_key', (await supabase.from('businesses').select('chatbot_key').eq('id', cid).single()).data?.chatbot_key || '')
      .gte('created_at', monthStart);

    // 4. TTS = tts_events this month
    const { count: ttsUsed } = await supabase
      .from('tts_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart);

    // 5. Email responses = email_logs this month
    const { count: emailUsed } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', cid)
      .gte('created_at', monthStart);

    // Limits from user_credits or subscription table (fall back to free limits)
    const { data: credRow } = await supabase
      .from('user_credits')
      .select('api_calls_limit, stt_uses_limit, tts_characters_limit, email_responses_limit, faq_documents_limit')
      .eq('user_id', user.id)
      .single();

    setUserCredits({
      api_calls_used:          chatbotUsed  || 0,
      api_calls_limit:         credRow?.api_calls_limit          || 1000,
      stt_uses_used:           sttUsed      || 0,
      stt_uses_limit:          credRow?.stt_uses_limit           || 500,
      tts_characters_used:     ttsUsed      || 0,
      tts_characters_limit:    credRow?.tts_characters_limit     || 1000,
      email_responses_sent:    emailUsed    || 0,
      email_responses_limit:   credRow?.email_responses_limit    || 500,
      faq_created:             faqUsed      || 0,
      faq_limit:               credRow?.faq_documents_limit      || 50,
    });


    const today = new Date();
    const windowStart = new Date();
    windowStart.setDate(today.getDate() - (days - 1));
    windowStart.setHours(0, 0, 0, 0);

    const { data: weeklyEvents } = await supabase.from("uat_events")
      .select("occurred_at").eq("client_id", cid).gte("occurred_at", windowStart.toISOString());

    const rollingDays: { label: string; dateStr: string }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      rollingDays.push({
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateStr: d.toISOString().slice(0, 10),
      });
    }

    const counts: Record<string, number> = {};
    rollingDays.forEach(({ dateStr }) => (counts[dateStr] = 0));
    weeklyEvents?.forEach((e: any) => {
      const dateStr = new Date(e.occurred_at).toISOString().slice(0, 10);
      if (dateStr in counts) counts[dateStr]++;
    });
    setWeeklyData(rollingDays.map(({ label, dateStr }) => ({ day: label, interactions: counts[dateStr] })));
  }

  const videoSrc = isDark ? "/videos/nightvideo.mp4" : "/videos/dashboardday.mp4";
  const fallbackBg = isDark
    ? "bg-gradient-to-br from-gray-900 via-slate-900 to-black"
    : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50";
  const axisColor = isDark ? "#ffffff55" : "#64748b";
  const tipStyle = isDark
    ? { backgroundColor: "#0f172a", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "8px" }
    : { backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#1e293b", borderRadius: "8px" };

  return (
    <div className={`relative min-h-screen -m-8 overflow-hidden ${fallbackBg}`}>
      <video key={videoSrc} autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none">
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div className={`absolute inset-0 z-10 ${isDark ? 'bg-black/65' : 'bg-white/70'}`} />

      <div className="relative z-20 p-8 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {greeting},{" "}
            <span className={`bg-clip-text text-transparent inline-block ${nameGlow ? "animate-[shimmer_2s_infinite] bg-[linear-gradient(110deg,#2563eb,45%,#e2e8f0,55%,#0d9488)] bg-[length:200%_100%]" : "bg-gradient-to-r from-blue-600 to-teal-600"}`}>
              {userName}{businessName ? ` from ${businessName}` : ""}
            </span>!
          </h1>
          <p className={`mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Here's what's happening with your AI services today.
          </p>
        </div>

        {/* Current Plan Card */}
        <CurrentPlanCard isDark={isDark} />

        {/* Metrics */}
        <div className={`grid md:grid-cols-4 gap-4 [&>*]:transition-all [&>*]:duration-200 ${isDark ? '[&>*:hover]:shadow-[0_0_10px_rgba(59,130,246,0.3)]' : '[&>*:hover]:shadow-[0_0_10px_rgba(37,99,235,0.15)]'}`}>
          <ThemedStatCard label="Total Interactions" value={totalInteractions} />
          <ThemedStatCard label="Email Responses" value={emailResponses} accent />
          <ThemedStatCard label="TTS Conversions" value={ttsConversions} />
          <ThemedStatCard label="Active Users" value={activeUsers} />
        </div>

        {/* Credit Statistics */}
        {userCredits && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <CircularStat isDark={isDark} label="Chatbot API" color="#3b82f6" used={userCredits.api_calls_used} limit={userCredits.api_calls_limit} percentage={(userCredits.api_calls_used / userCredits.api_calls_limit) * 100} />
            <CircularStat isDark={isDark} label="FAQ Gen" color="#8b5cf6" used={userCredits.faq_created} limit={userCredits.faq_limit} percentage={(userCredits.faq_created / userCredits.faq_limit) * 100} />
            <CircularStat isDark={isDark} label="Speech-to-Text" color="#10b981" used={userCredits.stt_uses_used} limit={userCredits.stt_uses_limit} percentage={(userCredits.stt_uses_used / userCredits.stt_uses_limit) * 100} />
            <CircularStat isDark={isDark} label="Text-to-Speech" color="#f59e0b" used={userCredits.tts_characters_used} limit={userCredits.tts_characters_limit} percentage={(userCredits.tts_characters_used / userCredits.tts_characters_limit) * 100} />
            <CircularStat isDark={isDark} label="Email Auto" color="#ef4444" used={userCredits.email_responses_sent} limit={userCredits.email_responses_limit} percentage={(userCredits.email_responses_sent / userCredits.email_responses_limit) * 100} />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Weekly Usage Chart */}
          <ThemedCard className="p-5 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h2 className={`font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                Service Usage —{" "}
                <span className={`font-bold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                  Last {sliderDays} day{sliderDays !== 1 ? 's' : ''}
                </span>
              </h2>
              <div className="flex items-center gap-3 min-w-[180px]">
                <span className={`text-xs shrink-0 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>7d</span>
                <input
                  type="range" min={7} max={30} step={1} value={sliderDays}
                  onChange={(e) => setSliderDays(Number(e.target.value))}
                  className="flex-1 h-1.5 rounded-full accent-blue-500 cursor-pointer"
                  style={{
                    background: isDark
                      ? `linear-gradient(to right, #3b82f6 ${((sliderDays - 7) / 23) * 100}%, #ffffff20 ${((sliderDays - 7) / 23) * 100}%)`
                      : `linear-gradient(to right, #2563eb ${((sliderDays - 7) / 23) * 100}%, #e2e8f0 ${((sliderDays - 7) / 23) * 100}%)`,
                  }}
                />
                <span className={`text-xs shrink-0 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>30d</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff15" : "#e2e8f0"} />
                <XAxis dataKey="day" tick={{ fill: axisColor, fontSize: sliderDays > 14 ? 10 : 12 }} />
                <YAxis tick={{ fill: axisColor, fontSize: 12 }} />
                <Tooltip contentStyle={tipStyle} />
                <Line type="monotone" dataKey="interactions" stroke="#2563eb" strokeWidth={3}
                  dot={{ r: sliderDays > 14 ? 2 : 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </ThemedCard>

          {/* Recent Activity */}
          <ThemedCard className="p-5">
            <h2 className={`font-semibold mb-6 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>Recent Activity</h2>
            <div className="space-y-4">
              {recentEvents.length > 0 ? recentEvents.map((e, i) => (
                <div key={i} className={`flex flex-col gap-1 pb-3 ${i !== recentEvents.length - 1 ? (isDark ? 'border-b border-white/10' : 'border-b border-gray-100') : ''}`}>
                  <div className="flex justify-between items-start">
                    <p className={`font-medium text-sm capitalize ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{e.event_type.replace('_', ' ')}</p>
                    <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      {new Date(e.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{e.page_url}</p>
                </div>
              )) : (
                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>No recent interactions found.</p>
              )}
            </div>
          </ThemedCard>
        </div>
      </div>
    </div>
  );
}
