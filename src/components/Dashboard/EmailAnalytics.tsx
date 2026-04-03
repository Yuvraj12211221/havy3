import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import DownloadReportButton from "../common/DownloadReportButton";
import { ThemedCard, ThemedStatCard } from "../common/ThemedCard";
import { useTimeTheme } from "../../hooks/useTimeTheme";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"];

type Stat = {
  name: string;
  value: number;
};

type TimeCount = {
  label: string;
  count: number;
};

type EmailRow = {
  received_at: string;
  intent_category: string | null;
  status: string | null;
};

export default function EmailAnalytics() {
  const theme = useTimeTheme();
  const isDark = theme === "dark";

  const [emailsPerDay, setEmailsPerDay] = useState<TimeCount[]>([]);
  const [intentData, setIntentData] = useState<Stat[]>([]);
  const [statusData, setStatusData] = useState<Stat[]>([]);
  const [hourlyData, setHourlyData] = useState<TimeCount[]>([]);
  const [totalEmails, setTotalEmails] = useState(0);
  const [todayEmails, setTodayEmails] = useState(0);
  const [successRate, setSuccessRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);

    const { data, error } = await supabase
      .from("email_logs")
      .select("received_at, intent_category, status")
      .order("received_at", { ascending: true });

    if (error || !data) {
      setLoading(false);
      return;
    }

    const rows = data as EmailRow[];

    /* ---------- Summary ---------- */
    setTotalEmails(rows.length);

    const today = new Date().toISOString().slice(0, 10);
    const todayCount = rows.filter(
      (e) => e.received_at?.slice(0, 10) === today
    ).length;
    setTodayEmails(todayCount);

    const successCount = rows.filter(
      (e) => e.status === "success"
    ).length;

    setSuccessRate(
      rows.length ? Math.round((successCount / rows.length) * 100) : 0
    );

    /* ---------- Emails per day ---------- */
    const dayMap: Record<string, number> = {};

    rows.forEach((e) => {
      if (!e.received_at) return;
      const day = e.received_at.slice(0, 10);
      dayMap[day] = (dayMap[day] || 0) + 1;
    });

    setEmailsPerDay(
      Object.entries(dayMap).map(([label, count]) => ({ label, count }))
    );

    /* ---------- Intent distribution ---------- */
    const intentMap: Record<string, number> = {};

    rows.forEach((e) => {
      const key = e.intent_category || "Unknown";
      intentMap[key] = (intentMap[key] || 0) + 1;
    });

    setIntentData(
      Object.entries(intentMap).map(([name, value]) => ({ name, value }))
    );

    /* ---------- Status distribution ---------- */
    const statusMap: Record<string, number> = {};

    rows.forEach((e) => {
      const key = e.status || "unknown";
      statusMap[key] = (statusMap[key] || 0) + 1;
    });

    setStatusData(
      Object.entries(statusMap).map(([name, value]) => ({ name, value }))
    );

    /* ---------- Hourly distribution ---------- */
    const hourMap: Record<string, number> = {};

    rows.forEach((e) => {
      if (!e.received_at) return;
      const hour = new Date(e.received_at)
        .getHours()
        .toString()
        .padStart(2, "0");
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });

    setHourlyData(
      Object.entries(hourMap).map(([label, count]) => ({
        label: `${label}:00`,
        count,
      }))
    );

    setLoading(false);
  }

  /* ---------- Theme helpers (same pattern as DashboardHome) ---------- */
  const videoSrc = isDark ? "/videos/nightvideo.mp4" : "/videos/dashboardday.mp4";
  const fallbackBg = isDark
    ? "bg-gradient-to-br from-gray-900 via-slate-900 to-black"
    : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50";

  const axisColor = isDark ? "#ffffff55" : "#64748b";
  const tipStyle = isDark
    ? { backgroundColor: "#0f172a", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "8px" }
    : { backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#1e293b", borderRadius: "8px" };

  /* ---------- Loading state ---------- */
  if (loading)
    return (
      <div className={`relative min-h-screen -m-8 overflow-hidden ${fallbackBg} flex items-center justify-center`}>
        <video key={videoSrc} autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none">
          <source src={videoSrc} type="video/mp4" />
        </video>
        <div className={`absolute inset-0 z-10 ${isDark ? "bg-black/65" : "bg-white/70"}`} />
        <div className="relative z-20 flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className={`absolute inset-0 rounded-full border-4 ${isDark ? "border-white/10" : "border-gray-200"}`} />
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
          <p className={`font-medium animate-pulse ${isDark ? "text-white/60" : "text-gray-600"}`}>
            Loading analytics…
          </p>
        </div>
      </div>
    );

  /* ---------- Main content ---------- */
  return (
    <div className={`relative min-h-screen -m-8 overflow-hidden ${fallbackBg}`}>

      {/* Background video */}
      <video key={videoSrc} autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none">
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className={`absolute inset-0 z-10 ${isDark ? "bg-black/65" : "bg-white/70"}`} />

      {/* Content */}
      <div className="relative z-20 p-8 space-y-6" id="analyticsExport">

        {/* Page header */}
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            Email Autoresponder
          </h1>
          <p className={`mt-1 ${isDark ? "text-white/50" : "text-gray-500"}`}>
            Monitor your email response analytics and trends.
          </p>
        </div>

        {/* ---------- Summary Cards ---------- */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 [&>*]:transition-all [&>*]:duration-200 ${isDark ? "[&>*:hover]:shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "[&>*:hover]:shadow-[0_0_10px_rgba(37,99,235,0.15)]"}`}>
          <ThemedStatCard label="Total Emails" value={totalEmails} />
          <ThemedStatCard label="Emails Today" value={todayEmails} accent />
          <ThemedStatCard label="Success Rate" value={`${successRate}%`} />
        </div>

        {/* ---------- Emails per day ---------- */}
        <ThemedCard className="p-5">
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white/80" : "text-gray-700"}`}>
            Emails per Day
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={emailsPerDay}>
              <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ThemedCard>

        {/* ---------- Pie Charts Row ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Intent distribution */}
          <ThemedCard className="p-5">
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white/80" : "text-gray-700"}`}>
              Intent Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={intentData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {intentData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ThemedCard>

          {/* Status distribution */}
          <ThemedCard className="p-5">
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white/80" : "text-gray-700"}`}>
              Response Status Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ThemedCard>

        </div>

        {/* ---------- Hourly distribution ---------- */}
        <ThemedCard className="p-5">
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white/80" : "text-gray-700"}`}>
            Emails by Hour
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ThemedCard>

        <DownloadReportButton targetId="analyticsExport" fileName="analytics-report.pdf" />

      </div>
    </div>
  );
}
