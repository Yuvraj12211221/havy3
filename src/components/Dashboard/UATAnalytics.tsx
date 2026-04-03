import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import DownloadReportButton from "../common/DownloadReportButton";
import { ThemedCard, ThemedStatCard } from "../common/ThemedCard";
import { useTimeTheme } from "../../hooks/useTimeTheme";

// ─── Types ─────────────────────────────────────────────────────
type UATStat = { tag: string; text_content: string | null; page_url: string; click_count: number; hover_count: number; };
type HeatCell = { date: string; hour: number; interactions: number; };
type PageStat = { page_url: string; clicks: number; hovers: number; };
type TagStat = { tag: string; clicks: number; };
type DayStat = { day: string; events: number; };
type Session = { session_id: string; device_type: string | null; duration_seconds: number | null; pages_visited: number | null; bounced: boolean | null; started_at: string; };
type LiveEvent = { id: string; event_type: string; tag: string | null; text_content: string | null; page_url: string | null; occurred_at: string; };

// ─── Palette helpers ────────────────────────────────────────────
const COLORS_LIGHT = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#be185d"];
const COLORS_DARK = ["#60a5fa", "#4ade80", "#fbbf24", "#f87171", "#a78bfa", "#22d3ee", "#f472b6"];

// ─── Event badge color ──────────────────────────────────────────
function eventBadge(type: string, isDark: boolean) {
  const map: Record<string, string> = {
    click: isDark ? "bg-blue-900/60 text-blue-300" : "bg-blue-100 text-blue-700",
    hover: isDark ? "bg-green-900/60 text-green-300" : "bg-green-100 text-green-700",
    rage_click: isDark ? "bg-red-900/60 text-red-300" : "bg-red-100 text-red-700",
    focus: isDark ? "bg-yellow-900/60 text-yellow-300" : "bg-yellow-100 text-yellow-700",
  };
  return map[type] ?? (isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600");
}

// ─── Section wrapper ────────────────────────────────────────────
function Section({ title, children, isDark }: { title: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <ThemedCard solid className="p-5 space-y-3">
      <h3 className={`font-semibold text-sm uppercase tracking-wide ${isDark ? "text-white/70" : "text-gray-500"}`}>
        {title}
      </h3>
      {children}
    </ThemedCard>
  );
}

// ─── Main ───────────────────────────────────────────────────────
export default function UATAnalytics() {
  const theme = useTimeTheme();
  const isDark = theme === "dark";
  const COLORS = isDark ? COLORS_DARK : COLORS_LIGHT;

  // Chart common props
  const axisColor = isDark ? "#ffffff60" : "#64748b";
  const gridColor = isDark ? "#ffffff15" : "#e2e8f0";
  const tipStyle = isDark
    ? { backgroundColor: "#1e293b", border: "1px solid #334155", color: "#e2e8f0" }
    : { backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#1e293b" };

  // ── State ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [bizId, setBizId] = useState<string | null>(null);
  const [data, setData] = useState<UATStat[]>([]);
  const [heatmap, setHeatmap] = useState<HeatCell[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pageStats, setPageStats] = useState<PageStat[]>([]);
  const [tagStats, setTagStats] = useState<TagStat[]>([]);
  const [dayStats, setDayStats] = useState<DayStat[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [insight, setInsight] = useState("");
  const [ctaScore, setCtaScore] = useState<number | null>(null);
  const [rageCount, setRageCount] = useState(0);
  const [focusCount, setFocusCount] = useState(0);
  const [scrollAvail, setScrollAvail] = useState(false);
  const [avgScroll, setAvgScroll] = useState<number | null>(null);

  // ── Fetch helpers ──────────────────────────────────────────────
  const getBiz = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: biz } = await supabase.from("businesses").select("id").eq("user_id", user.id).single();
    return biz?.id ?? null;
  }, []);

  async function fetchAll(id: string) {
    // 1. Element stats
    const { data: stats } = await supabase
      .from("uat_element_stats")
      .select("tag,text_content,page_url,click_count,hover_count")
      .eq("client_id", id).order("click_count", { ascending: false }).limit(20);
    setData(stats || []);

    // 2. Heatmap
    const { data: heat } = await supabase.from("uat_hourly_heatmap").select("*").eq("client_id", id);
    setHeatmap(heat || []);

    // 3. Sessions
    const { data: sess } = await supabase
      .from("uat_sessions")
      .select("session_id,device_type,duration_seconds,pages_visited,bounced,started_at")
      .eq("client_id", id).order("started_at", { ascending: false }).limit(200);
    setSessions(sess || []);

    // 4. Page breakdown from element stats (no extra table)
    const pageMap: Record<string, PageStat> = {};
    (stats || []).forEach((s: UATStat) => {
      if (!pageMap[s.page_url]) pageMap[s.page_url] = { page_url: s.page_url, clicks: 0, hovers: 0 };
      pageMap[s.page_url].clicks += s.click_count;
      pageMap[s.page_url].hovers += s.hover_count;
    });
    setPageStats(Object.values(pageMap).sort((a, b) => b.clicks - a.clicks).slice(0, 8));

    // 5. Tag breakdown
    const tagMap: Record<string, number> = {};
    (stats || []).forEach((s: UATStat) => { tagMap[s.tag] = (tagMap[s.tag] || 0) + s.click_count; });
    setTagStats(Object.entries(tagMap).map(([tag, clicks]) => ({ tag, clicks })).sort((a, b) => b.clicks - a.clicks));

    // 6. Events / day (7d) + signals
    const since7d = new Date(); since7d.setDate(since7d.getDate() - 7);
    const { data: rawEvents } = await supabase
      .from("uat_events").select("occurred_at,event_type,scroll_depth")
      .eq("client_id", id).gte("occurred_at", since7d.toISOString()).order("occurred_at", { ascending: true });

    const dayMap: Record<string, number> = {};
    let totalScroll = 0, scrollN = 0, rageN = 0, focusN = 0;
    (rawEvents || []).forEach((e: any) => {
      const day = e.occurred_at.slice(0, 10);
      dayMap[day] = (dayMap[day] || 0) + 1;
      if (e.event_type === "rage_click") rageN++;
      if (e.event_type === "focus") focusN++;
      if (e.scroll_depth != null) { totalScroll += e.scroll_depth; scrollN++; }
    });
    setDayStats(Object.entries(dayMap).map(([day, events]) => ({ day, events })));
    setRageCount(rageN);
    setFocusCount(focusN);
    if (scrollN > 0) { setScrollAvail(true); setAvgScroll(Math.round(totalScroll / scrollN)); }

    // 7. Live feed
    const { data: live } = await supabase
      .from("uat_events").select("id,event_type,tag,text_content,page_url,occurred_at")
      .eq("client_id", id).order("occurred_at", { ascending: false }).limit(20);
    setLiveEvents(live || []);
  }

  useEffect(() => {
    (async () => {
      const id = await getBiz();
      if (id) { setBizId(id); await fetchAll(id); }
      setLoading(false);
    })();
  }, []);

  // Auto-refresh live feed every 10s
  useEffect(() => {
    if (!bizId) return;
    const t = setInterval(async () => {
      const { data: live } = await supabase
        .from("uat_events").select("id,event_type,tag,text_content,page_url,occurred_at")
        .eq("client_id", bizId).order("occurred_at", { ascending: false }).limit(20);
      setLiveEvents(live || []);
    }, 10000);
    return () => clearInterval(t);
  }, [bizId]);

  // AI insight + CTA score
  useEffect(() => {
    if (!data.length) return;
    const tc = data.reduce((a, b) => a + b.click_count, 0);
    const th = data.reduce((a, b) => a + b.hover_count, 0);
    setCtaScore(Math.round(Math.min(tc === 0 ? 0 : (tc / (tc + th)) * 100, 100)));
    const top = data[0];
    let msg = th > tc * 3 ? "Users explore but rarely click — consider stronger CTAs."
      : tc > th ? "High click intent. Navigation and CTAs are working well."
        : "Balanced engagement. Improve visual emphasis on key actions.";
    msg += ` Top element: "${top.text_content || top.tag}" on ${top.page_url}.`;
    setInsight(msg);
  }, [data]);

  // ── Derived ───────────────────────────────────────────────────
  const totalSessions = sessions.length;
  const bounceRate = totalSessions ? Math.round((sessions.filter(s => s.bounced).length / totalSessions) * 100) : 0;
  const avgDuration = totalSessions ? Math.round(sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / totalSessions) : 0;
  const deviceCounts = sessions.reduce((acc: Record<string, number>, s) => {
    const d = s.device_type || "unknown"; acc[d] = (acc[d] || 0) + 1; return acc;
  }, {});
  const devicePie = Object.entries(deviceCounts).map(([name, value]) => ({ name, value }));

  // ── Empty / loading ───────────────────────────────────────────
  if (loading) return (
    <div className={`flex items-center justify-center min-h-[60vh] ${isDark ? "bg-gray-950" : "bg-gray-50"}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className={`absolute inset-0 rounded-full border-4 ${isDark ? "border-white/10" : "border-gray-200"}`} />
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
        <p className={`font-medium animate-pulse ${isDark ? "text-white/60" : "text-gray-500"}`}>Loading analytics...</p>
      </div>
    </div>
  );

  if (data.length === 0 && sessions.length === 0) return (
    <div className={`min-h-[60vh] rounded-2xl flex items-center justify-center p-8 ${isDark ? "bg-gray-950" : "bg-gray-50"
      }`}>
      <div className="space-y-4 text-center">
        <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>UAT Analytics</h2>
        <p className={isDark ? "text-white/70" : "text-gray-600"}>No interaction data yet. To start tracking:</p>
        <ol className={`text-sm space-y-1 text-left list-decimal list-inside ${isDark ? "text-white/60" : "text-gray-600"}`}>
          <li>Go to <strong>Business Profile</strong> — copy your <strong>Tracking Key</strong>.</li>
          <li>Go to the <strong>Chatbot</strong> tab — copy the embed snippet.</li>
          <li>Paste it into the <code className={`px-1 rounded text-xs ${isDark ? "bg-white/10" : "bg-gray-100"}`}>&lt;head&gt;</code> of your website.</li>
          <li>Interact with your site — data appears here within seconds.</li>
        </ol>
      </div>
    </div>
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dates = [...new Set(heatmap.map(h => h.date))];
  const getHeat = (date: string, hour: number) => {
    const localHour = (hour - 5 + 24) % 24; // adjust from UTC to IST approx
    return heatmap.find(h => h.date === date && h.hour === localHour)?.interactions || 0;
  };
  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen overflow-x-hidden -m-8">

      {/* Full-page background video */}
      <video
        key={isDark ? 'uat-night' : 'uat-day'}
        autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source src={isDark ? '/videos/UATnight.mp4' : '/videos/uat-bg-day.mp4'} type="video/mp4" />
      </video>

      {/* Overlay for readability */}
      <div className={`absolute inset-0 z-10 ${isDark ? 'bg-black/65' : 'bg-white/72'}`} />

      <div className="relative z-20 p-6 space-y-6" id="analyticsExport">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              User Attention Analytics
            </h2>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Real-time interaction data from your tracked website
            </p>
          </div>
          <DownloadReportButton targetId="analyticsExport" fileName="uat-report.pdf" />
        </div>

        {/* ── Stat Cards Row 1 ── */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 [&>*]:transition-all [&>*]:duration-200 ${isDark ? '[&>*:hover]:shadow-[0_0_10px_rgba(129,140,248,0.2)]' : '[&>*:hover]:shadow-[0_0_10px_rgba(37,99,235,0.10)]'}`}>
          <ThemedStatCard label="Tracked Elements" value={data.length} />
          <ThemedStatCard label="Total Clicks" value={data.reduce((a, b) => a + b.click_count, 0)} />
          <ThemedStatCard label="Total Hovers" value={data.reduce((a, b) => a + b.hover_count, 0)} />
          <ThemedStatCard label="CTA Score" value={`${ctaScore ?? 0}%`} accent />
          <ThemedStatCard label="Sessions" value={totalSessions} sub="all time" />
          <ThemedStatCard
            label="Avg Scroll"
            value={scrollAvail ? `${avgScroll}%` : "—"}
            unavailable={!scrollAvail}
            sub={scrollAvail ? "page depth" : undefined}
          />
        </div>

        {/* ── Stat Cards Row 2 ── */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 [&>*]:transition-all [&>*]:duration-200 ${isDark ? '[&>*:hover]:shadow-[0_0_10px_rgba(129,140,248,0.2)]' : '[&>*:hover]:shadow-[0_0_10px_rgba(37,99,235,0.10)]'}`}>
          <ThemedStatCard label="Bounce Rate" value={`${bounceRate}%`} sub="single-page visits" />
          <ThemedStatCard label="Avg Duration" value={avgDuration > 0 ? `${avgDuration}s` : "—"} sub="per session" />
          <ThemedStatCard label="Rage Clicks" value={rageCount} sub="frustration signals" />
          <ThemedStatCard label="Form Engagements" value={focusCount} sub="input focus events" />
        </div>

        {/* ── AI Insight ────────────────────────────────────── */}
        {insight && (
          <ThemedCard accent className="p-4">
            <p className={`text-sm ${isDark ? "text-blue-300" : "text-blue-700"}`}>
              💡 <strong>AI Insight:</strong> {insight}
            </p>
          </ThemedCard>
        )}

        {/* ── Charts Row 1 ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <Section title="Events Over Time (7 days)" isDark={isDark}>
            {dayStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dayStats}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: axisColor }} />
                  <YAxis tick={{ fontSize: 11, fill: axisColor }} />
                  <Tooltip contentStyle={tipStyle} />
                  <Line type="monotone" dataKey="events" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3, fill: COLORS[0] }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className={`text-sm ${isDark ? "text-white/30" : "text-gray-400"}`}>No data in last 7 days.</p>}
          </Section>

          <Section title="Device Mix" isDark={isDark}>
            {devicePie.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={devicePie} dataKey="value" nameKey="name" outerRadius={75}
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={{ stroke: axisColor }}>
                    {devicePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className={`text-sm ${isDark ? "text-white/30" : "text-gray-400"}`}>No session data yet.</p>}
          </Section>

          <Section title="Activity by Page" isDark={isDark}>
            {pageStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pageStats} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} />
                  <YAxis dataKey="page_url" type="category" width={90} tick={{ fontSize: 10, fill: axisColor }} />
                  <Tooltip contentStyle={tipStyle} />
                  <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
                  <Bar dataKey="clicks" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="hovers" fill={COLORS[2]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className={`text-sm ${isDark ? "text-white/30" : "text-gray-400"}`}>No page data.</p>}
          </Section>

          <Section title="Element Types Clicked" isDark={isDark}>
            {tagStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={tagStats} dataKey="clicks" nameKey="tag" outerRadius={75}
                    label={({ tag, percent }) => `${tag} ${Math.round(percent * 100)}%`}
                    labelLine={{ stroke: axisColor }}>
                    {tagStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className={`text-sm ${isDark ? "text-white/30" : "text-gray-400"}`}>No element data.</p>}
          </Section>
        </div>

        {/* ── Top elements bar chart ────────────────────────── */}
        <Section title="Top Interacted Elements" isDark={isDark}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.slice(0, 10)}>
              <XAxis dataKey="text_content" hide />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} />
              <Tooltip
                contentStyle={tipStyle}
                formatter={(v, n) => [v, n === "click_count" ? "Clicks" : "Hovers"]}
                labelFormatter={(_, p) => p?.[0]?.payload?.text_content || p?.[0]?.payload?.tag || ""}
              />
              <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
              <Bar dataKey="click_count" name="Clicks" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="hover_count" name="Hovers" fill={isDark ? "#3b82f660" : "#93c5fd"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* ── Heatmap ───────────────────────────────────────── */}
        <Section title="Interaction Heatmap (by Hour)" isDark={isDark}>
          {dates.length > 0 ? (
            <>
              <div className="overflow-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={`p-1 ${isDark ? "text-white/40" : "text-gray-400"}`}>Date</th>
                      {hours.map(h => (
                        <th key={h} className={`p-1 ${isDark ? "text-white/30" : "text-gray-400"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map(date => (
                      <tr key={date}>
                        <td className={`p-1 whitespace-nowrap ${isDark ? "text-white/50" : "text-gray-600"}`}>
                          {new Date(date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </td>
                        {hours.map(h => {
                          const val = getHeat(date, h);
                          return (
                            <td key={h} title={`${val} interactions`}
                              className={`w-6 h-6 border ${isDark ? "border-white/5" : "border-gray-100"}`}
                              style={{
                                backgroundColor: isDark
                                  ? `rgba(96,165,250,${Math.min(val / 50, 0.9)})`
                                  : `rgba(37,99,235,${Math.min(val / 50, 1)})`
                              }}
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`flex items-center gap-2 text-xs ${isDark ? "text-white/40" : "text-gray-500"}`}>
                <span>Low</span>
                <div className={`w-4 h-4 rounded-sm ${isDark ? "bg-blue-900/40" : "bg-blue-100"}`} />
                <div className="w-4 h-4 rounded-sm bg-blue-400" />
                <div className={`w-4 h-4 rounded-sm ${isDark ? "bg-blue-400" : "bg-blue-700"}`} />
                <span>High</span>
              </div>
            </>
          ) : <p className={`text-sm ${isDark ? "text-white/30" : "text-gray-400"}`}>No heatmap data yet.</p>}
        </Section>

        {/* ── Live events feed ──────────────────────────────── */}
        <Section title="Live Events Feed" isDark={isDark}>
          <p className={`text-xs ${isDark ? "text-white/30" : "text-gray-400"}`}>
            Auto-refreshes every 10 seconds
          </p>
          {liveEvents.length > 0 ? (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {liveEvents.map(ev => (
                <div key={ev.id}
                  className={`flex items-center gap-3 text-sm px-2 py-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                    }`}>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${eventBadge(ev.event_type, isDark)}`}>
                    {ev.event_type.replace("_", " ")}
                  </span>
                  <span className={`font-mono text-xs ${isDark ? "text-white/30" : "text-gray-400"}`}>{ev.tag}</span>
                  <span className={`truncate flex-1 ${isDark ? "text-white/70" : "text-gray-700"}`}>
                    {ev.text_content || "—"}
                  </span>
                  <span className={`text-xs whitespace-nowrap ${isDark ? "text-white/30" : "text-gray-400"}`}>
                    {ev.page_url}
                  </span>
                  <span className={`text-xs whitespace-nowrap ${isDark ? "text-white/20" : "text-gray-300"}`}>
                    {new Date(ev.occurred_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className={`text-sm ${isDark ? "text-white/30" : "text-gray-400"}`}>No events yet.</p>}
        </Section>

      </div>
    </div>
  );
}
