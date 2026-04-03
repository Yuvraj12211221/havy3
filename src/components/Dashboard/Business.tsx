import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useTimeTheme } from "../../hooks/useTimeTheme";
import { ThemedCard } from "../common/ThemedCard";
import FAQDocGenerator from "./FAQDocGenerator";
import { Globe, RefreshCw, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';

const PAGE_SIZE = 5;

// ── Custom confirm modal ───────────────────────────────────────────
function ConfirmModal({ isDark, onConfirm, onCancel }: { isDark: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className={`relative w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${isDark ? "bg-gray-900/95 border-white/10 text-white" : "bg-white border-gray-200 text-gray-800"}`}>
        <div className="text-4xl mb-3 text-center">🗑️</div>
        <h3 className="text-base font-semibold text-center mb-1">Delete this FAQ?</h3>
        <p className={`text-sm text-center mb-5 ${isDark ? "text-white/50" : "text-gray-500"}`}>
          This will remove it from your chatbot's knowledge base immediately.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${isDark ? "border-white/15 text-white/60 hover:bg-white/8" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-600/25"
          >
            Yes, delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const show = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

function Toast({ toast }: { toast: { msg: string; type: string } | null }) {
  if (!toast) return null;
  const colors: Record<string, string> = {
    success: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    error: "bg-red-500/20 border-red-400/40 text-red-300",
    info: "bg-blue-500/20 border-blue-400/40 text-blue-300",
  };
  const icons: Record<string, string> = { success: "✓", error: "✕", info: "ℹ" };
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl text-sm font-medium animate-slide-in ${colors[toast.type]}`}>
      <span className="text-base">{icons[toast.type]}</span>
      {toast.msg}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export default function Business() {
  const { user } = useAuth();
  const theme = useTimeTheme();
  const isDark = theme === "dark";
  const { toast, show } = useToast();

  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [faqsVisible, setFaqsVisible] = useState(PAGE_SIZE);
  const [showAll, setShowAll] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", keywords: "" });
  const [addingFaq, setAddingFaq] = useState(false);

  const [form, setForm] = useState({
    business_name: "", industry: "", description: "",
    support_email: "", support_phone: "", website_url: "", allowed_domains: "",
  });

  // SmartScraper state
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [crawlDepth, setCrawlDepth] = useState(1);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ pages: number; chunks: number } | null>(null);
  const [scrapeError, setScrapeError] = useState('');
  const [scrapedInfo, setScrapedInfo] = useState<{ count: number; lastAt: string } | null>(null);


  useEffect(() => { if (user) fetchBusiness(); }, [user]);

  const fetchBusiness = async () => {
    const { data } = await supabase.from("businesses").select("*").eq("user_id", user.id).single();
    if (data) {
      setBusiness(data);
      setForm({
        business_name: data.business_name || "",
        industry: data.industry || "",
        description: data.description || "",
        support_email: data.support_email || "",
        support_phone: data.support_phone || "",
        website_url: data.website_url || "",
        allowed_domains: (data.allowed_domains || []).join(", "),
      });
      fetchFaqs(data.id);
      loadScrapedInfo(data.id);
    }
  };

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
    if (!scrapeUrl.trim() || !business?.id) return;
    setScraping(true); setScrapeResult(null); setScrapeError('');
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-site`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ url: scrapeUrl.trim(), business_id: business.id, crawl_depth: crawlDepth }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Scrape failed');
      setScrapeResult({ pages: json.pages_crawled, chunks: json.chunks_stored });
      await loadScrapedInfo(business.id);
    } catch (err: any) { setScrapeError(err.message); }
    finally { setScraping(false); }
  };

  const handleClearScrape = async () => {
    if (!business?.id) return;
    await supabase.from('scraped_pages').delete().eq('business_id', business.id);
    setScrapedInfo(null); setScrapeResult(null);
  };


  const fetchFaqs = async (businessId: string) => {
    const { data } = await supabase.from("business_faq").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    setFaqs(data || []);
    setFaqsVisible(PAGE_SIZE);
    setShowAll(false);
  };

  const saveBusiness = async () => {
    if (!user) return;
    setLoading(true);
    const domainArray = form.allowed_domains.split(",")
      .map((d: string) => d.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "")).filter(Boolean);
    const payload = { business_name: form.business_name, industry: form.industry, description: form.description, support_email: form.support_email, support_phone: form.support_phone, website_url: form.website_url, allowed_domains: domainArray };
    if (business) {
      await supabase.from("businesses").update(payload).eq("id", business.id);
    } else {
      const { data } = await supabase.from("businesses").insert({ ...payload, user_id: user.id, chatbot_key: crypto.randomUUID() }).select().single();
      if (data) { setBusiness(data); fetchFaqs(data.id); }
    }
    setLoading(false);
    show("Business profile saved!");
  };

  const addFaq = async () => {
    if (!business || !faqForm.question || !faqForm.answer) return;
    setAddingFaq(true);
    await supabase.from("business_faq").insert({
      business_id: business.id,
      question: faqForm.question,
      answer: faqForm.answer,
      keywords: faqForm.keywords.split(",").map((k) => k.trim()).filter(Boolean),
    });
    setFaqForm({ question: "", answer: "", keywords: "" });
    await fetchFaqs(business.id);
    setAddingFaq(false);
    show("FAQ added to your knowledge base!");
  };

  // ── glass input styles from Login form ────────────────────────────
  const glassInput = isDark
    ? "w-full px-4 py-2 bg-transparent text-white border border-white/30 rounded-lg focus:ring-1 focus:ring-purple-400/50 focus:border-purple-400 outline-none transition-all placeholder-white/25 text-sm"
    : "w-full px-4 py-2 bg-white/60 text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-400 focus:border-blue-400 outline-none transition-all placeholder-gray-400 text-sm";

  const glassTextarea = glassInput + " resize-none";

  const btnLogin = isDark
    ? "flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl text-white font-semibold transition-all duration-300 bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#3B82F6] hover:to-[#8B5CF6] shadow-lg shadow-[#3B82F6]/40 disabled:opacity-50 disabled:cursor-not-allowed"
    : "flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl text-white font-semibold transition-all duration-300 bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#38BDF8] hover:from-[#2563EB] hover:via-[#3B82F6] hover:to-[#60A5FA] shadow-lg shadow-[#3B82F6]/30 disabled:opacity-50 disabled:cursor-not-allowed";

  const subCls = isDark ? "text-white/50" : "text-gray-500";
  const sectionDivider = isDark ? "border-t border-white/8" : "border-t border-gray-100";
  const videoSrc = isDark ? "/videos/nightvideo.mp4" : "/videos/dashboardday.mp4";

  const displayedFaqs = showAll ? faqs : faqs.slice(0, faqsVisible);
  const hasMore = !showAll && faqsVisible < faqs.length;

  return (
    <div className="relative min-h-screen -m-8 overflow-hidden">
      <video key={videoSrc} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none">
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div className={`absolute inset-0 z-10 ${isDark ? "bg-black/70" : "bg-white/82"}`} />

      <div className="relative z-20 p-8 space-y-6">
        <div>
          <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Business Settings</h1>
          <p className={`mt-1 text-sm ${subCls}`}>Manage your profile, FAQs, and chatbot knowledge base.</p>
        </div>

        {/* ── Business Profile (compact inline labels) ── */}
        <ThemedCard solid className="p-8">
          <div className="mb-5">
            <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>Business Profile</h2>
            <p className={`mt-0.5 text-sm ${subCls}`}>Your details power the chatbot identity and embed setup.</p>
          </div>

          {/* ── Row 1: Business Name + Industry dropdown ── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Business Name */}
              <div className="flex items-center gap-3">
                <label className={`w-24 shrink-0 text-sm font-medium text-right ${isDark ? "text-white/60" : "text-gray-500"}`}>Name</label>
                <input name="business_name" value={form.business_name}
                  onChange={e => setForm({ ...form, business_name: e.target.value })}
                  placeholder="Your business name"
                  className={glassInput + " flex-1"} />
              </div>

              {/* Industry — glassy dropdown */}
              <div className="flex items-center gap-3">
                <label className={`w-20 shrink-0 text-sm font-medium text-right ${isDark ? "text-white/60" : "text-gray-500"}`}>Industry</label>
                <div className="flex-1 relative">
                  <select
                    name="industry"
                    value={form.industry}
                    onChange={e => setForm({ ...form, industry: e.target.value })}
                    className={[
                      "w-full px-4 py-2 pr-8 rounded-lg text-sm outline-none transition-all appearance-none cursor-pointer",
                      isDark
                        ? "bg-transparent text-white border border-white/30 focus:ring-2 focus:ring-purple-400/60 focus:border-purple-400"
                        : "bg-white/60 text-gray-900 border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-blue-500",
                    ].join(" ")}
                  >
                    <option value="" disabled className={isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}>Select industry…</option>
                    {["E-Commerce", "Healthcare", "Education", "Finance & Banking", "Real Estate", "Technology", "Hospitality & Travel", "Other"].map(ind => (
                      <option key={ind} value={ind} className={isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}>{ind}</option>
                    ))}
                  </select>
                  {/* Custom caret */}
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>▾</span>
                </div>
              </div>
            </div>

            {/* ── Row 2: Website URL (full width) ── */}
            <div className="flex items-center gap-3">
              <label className={`w-24 shrink-0 text-sm font-medium text-right ${isDark ? "text-white/60" : "text-gray-500"}`}>Website</label>
              <input name="website_url" value={form.website_url}
                onChange={e => setForm({ ...form, website_url: e.target.value })}
                placeholder="https://yoursite.com"
                className={glassInput + " flex-1"} />
            </div>

            {/* ── Row 3: Email + Phone ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <label className={`w-24 shrink-0 text-sm font-medium text-right ${isDark ? "text-white/60" : "text-gray-500"}`}>Email</label>
                <input name="support_email" value={form.support_email}
                  onChange={e => setForm({ ...form, support_email: e.target.value })}
                  placeholder="support@company.com"
                  className={glassInput + " flex-1"} />
              </div>
              <div className="flex items-center gap-3">
                <label className={`w-20 shrink-0 text-sm font-medium text-right ${isDark ? "text-white/60" : "text-gray-500"}`}>Phone</label>
                <input name="support_phone" value={form.support_phone}
                  onChange={e => setForm({ ...form, support_phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className={glassInput + " flex-1"} />
              </div>
            </div>

            {/* ── Description ── */}
            <div className="flex items-start gap-3">
              <label className={`w-24 shrink-0 text-sm font-medium text-right mt-2 ${isDark ? "text-white/60" : "text-gray-500"}`}>About</label>
              <textarea name="description" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3} placeholder="Briefly describe your business…"
                className={glassTextarea + " flex-1"} />
            </div>

            {/* ── Row 4: Allowed Domains + Chatbot Key side-by-side ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <label className={`w-24 shrink-0 text-sm font-medium text-right ${isDark ? "text-white/60" : "text-gray-500"}`}>Domains</label>
                <input name="allowed_domains" value={form.allowed_domains}
                  onChange={e => setForm({ ...form, allowed_domains: e.target.value })}
                  placeholder="example.com, app.io"
                  className={glassInput + " flex-1"} />
              </div>
              {business?.chatbot_key ? (
                <div className="flex items-center gap-2">
                  <label className={`w-20 shrink-0 text-sm font-medium text-right ${isDark ? "text-white/60" : "text-gray-500"}`}>Key</label>
                  <input readOnly value={business.chatbot_key}
                    className={`${glassInput} flex-1 font-mono text-xs opacity-70 cursor-default`} />
                  <button
                    onClick={() => { navigator.clipboard.writeText(business.chatbot_key); setCopied(true); setTimeout(() => setCopied(false), 2000); show("Chatbot key copied!", "info"); }}
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    {copied ? "✓" : "Copy"}
                  </button>
                </div>
              ) : <div />}
            </div>
          </div>

          <div className="mt-6">
            <button onClick={saveBusiness} disabled={loading} className={btnLogin}>
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : business ? "Update Business" : "Create Business"}
            </button>
          </div>
        </ThemedCard>

        {/* ── FAQ Manager ── */}
        <ThemedCard solid className="p-8">
          <div className="mb-6">
            <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>FAQ Knowledge Base</h2>
            <p className={`mt-0.5 text-sm ${subCls}`}>Everything here is used by your chatbot to answer visitor questions.</p>
          </div>

          {!business ? (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${isDark ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
              ⚠️ Save your business profile first to manage FAQs.
            </div>
          ) : (
            <>
              {/* AI Generator first */}
              <div className="mb-8">
                <FAQDocGenerator businessId={business.id} supabase={supabase} onFaqApproved={() => fetchFaqs(business.id)} />
              </div>

              {/* Saved FAQs */}
              <div className={`${sectionDivider} pt-6`}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className={`font-semibold text-sm uppercase tracking-wide ${subCls}`}>
                    Saved FAQs ({faqs.length})
                  </h3>
                  {faqs.length > PAGE_SIZE && (
                    <button
                      onClick={() => { setShowAll(true); setFaqsVisible(faqs.length); }}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${isDark ? "bg-white/8 text-white/60 hover:bg-white/15" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      Show all {faqs.length}
                    </button>
                  )}
                </div>

                {faqs.length === 0 ? (
                  <p className={`text-sm ${subCls}`}>No FAQs saved yet.</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {displayedFaqs.map(faq => (
                        <FaqItem key={faq.id} faq={faq} isDark={isDark} glassInput={glassInput}
                          refreshFaqs={() => fetchFaqs(business.id)}
                          onSuccess={(m: string, t?: any) => show(m, t)} />
                      ))}
                    </div>

                    {hasMore && (
                      <div className="mt-4 flex items-center gap-3">
                        <div className={`flex-1 h-px ${isDark ? "bg-white/8" : "bg-gray-200"}`} />
                        <button
                          onClick={() => setFaqsVisible(v => v + PAGE_SIZE)}
                          className={`text-xs px-4 py-2 rounded-full font-medium transition-all ${isDark ? "text-white/50 hover:text-white/80" : "text-gray-400 hover:text-gray-600"}`}
                        >
                          View {Math.min(PAGE_SIZE, faqs.length - faqsVisible)} more ↓ ({faqs.length - faqsVisible} remaining)
                        </button>
                        <div className={`flex-1 h-px ${isDark ? "bg-white/8" : "bg-gray-200"}`} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Add manually */}
              <div className={`${sectionDivider} pt-6 mt-6 space-y-3`}>
                <h3 className={`font-semibold text-sm uppercase tracking-wide ${subCls}`}>Add Manually</h3>
                <input name="question" placeholder="Question" value={faqForm.question} onChange={e => setFaqForm({ ...faqForm, question: e.target.value })} className={glassInput} />
                <textarea name="answer" placeholder="Answer" rows={3} value={faqForm.answer} onChange={e => setFaqForm({ ...faqForm, answer: e.target.value })} className={glassTextarea} />
                <input name="keywords" placeholder="Keywords (comma-separated)" value={faqForm.keywords} onChange={e => setFaqForm({ ...faqForm, keywords: e.target.value })} className={glassInput} />
                <button onClick={addFaq} disabled={!faqForm.question || !faqForm.answer || !faqForm.keywords || addingFaq} className={btnLogin + " w-auto"}>
                  {addingFaq ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding…</> : "+ Add FAQ"}
                </button>
              </div>
            </>
          )}
        </ThemedCard>

        {/* ── Smart Scraper ── */}
        {business && (
          <ThemedCard solid className="p-8">
            <div className="mb-5">
              <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <Globe className="w-5 h-5 text-indigo-500" /> Smart Scraper
              </h2>
              <p className={`mt-0.5 text-sm ${subCls}`}>Index your website so the chatbot can answer questions beyond your FAQs.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <input type="url" value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)}
                  placeholder={form.website_url || 'https://yourwebsite.com'}
                  className={glassInput + ' flex-[4]'} />
                <select value={crawlDepth} onChange={e => setCrawlDepth(Number(e.target.value))}
                  className={glassInput + ' flex-1 min-w-[120px] max-w-[160px] !flex-none'}>
                  <option value={0}>Home only</option>
                  <option value={1}>+1 level</option>
                  <option value={2}>+2 levels</option>
                  <option value={3}>+3 levels</option>
                  <option value={4}>+4 levels</option>
                  <option value={5}>+5 levels</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <button onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()} className={btnLogin + " w-auto px-6 text-sm"}>
                  {scraping
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scraping&hellip;</>
                    : <><RefreshCw className="w-4 h-4" /> Start Indexing</>}
                </button>
                {scrapedInfo && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className={isDark ? "text-green-400 font-medium flex items-center gap-1.5" : "text-green-600 font-medium flex items-center gap-1.5"}>
                      <CheckCircle2 className="w-4 h-4" /> Active Index ({scrapedInfo.count} chunks)
                    </span>
                    <button onClick={handleClearScrape} className={`text-xs hover:underline flex items-center gap-1 ${isDark ? "text-red-400 hover:text-red-300" : "text-red-500 hover:text-red-600"}`}>
                      <Trash2 className="w-3 h-3" /> Clear Index
                    </button>
                  </div>
                )}
              </div>
            </div>


            {scrapeResult && (
              <div className={`mt-3 flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border ${isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <CheckCircle2 className="w-4 h-4" />
                Done! Crawled <strong>{scrapeResult.pages}</strong> pages &rarr; stored <strong>{scrapeResult.chunks}</strong> chunks.
              </div>
            )}
            {scrapeError && (
              <div className={`mt-3 flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
                <AlertCircle className="w-4 h-4" /> {scrapeError}
              </div>
            )}
          </ThemedCard>
        )}
      </div>

      <Toast toast={toast} />

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .animate-slide-in { animation: slide-in 0.35s cubic-bezier(.22,1,.36,1); }
        @keyframes fade-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.25s ease-out; }

        /* Pen writes — tip traces a small arc */
        @keyframes pen-write {
          0%   { transform: translate(0, 0) rotate(0deg); }
          25%  { transform: translate(2px, 1px) rotate(3deg); }
          50%  { transform: translate(-1px, 2px) rotate(-2deg); }
          75%  { transform: translate(2px, 3px) rotate(2deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }

        /* Dustbin shakes nervously */
        @keyframes bin-shake {
          0%,100% { transform: rotate(0deg); }
          15%     { transform: rotate(-8deg); }
          30%     { transform: rotate(8deg); }
          45%     { transform: rotate(-6deg); }
          60%     { transform: rotate(6deg); }
          75%     { transform: rotate(-3deg); }
        }
      `}</style>
    </div>
  );
}

// ── FaqItem — thin left-revealed strip, card nudges slightly ──────
function FaqItem({ faq, isDark, glassInput, refreshFaqs, onSuccess }: any) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    question: faq.question,
    answer: faq.answer,
    keywords: faq.keywords?.join(", ") || "",
  });

  const saveUpdate = async () => {
    setSaving(true);
    await supabase.from("business_faq").update({
      question: form.question,
      answer: form.answer,
      keywords: form.keywords.split(",").map((k: string) => k.trim()).filter(Boolean),
    }).eq("id", faq.id);
    setSaving(false);
    setEditing(false);
    refreshFaqs();
    onSuccess("FAQ updated successfully!");
  };

  const doDelete = async () => {
    setConfirmDelete(false);
    await supabase.from("business_faq").delete().eq("id", faq.id);
    refreshFaqs();
    onSuccess("FAQ deleted.", "error");
  };

  const cardBase = isDark ? "bg-gray-900/80 border border-white/10" : "bg-white border border-gray-200";
  const revealStrip = isDark ? "bg-gray-800/90" : "bg-gray-100";

  if (editing) {
    return (
      <div className={`rounded-2xl p-4 space-y-3 ${cardBase} shadow-lg animate-fade-in`}>
        <div>
          <label className={`text-xs font-medium block mb-1 ${isDark ? "text-white/50" : "text-gray-400"}`}>Question</label>
          <input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} className={glassInput} />
        </div>
        <div>
          <label className={`text-xs font-medium block mb-1 ${isDark ? "text-white/50" : "text-gray-400"}`}>Answer</label>
          <textarea rows={3} value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} className={glassInput + " resize-none w-full"} />
        </div>
        <div>
          <label className={`text-xs font-medium block mb-1 ${isDark ? "text-white/50" : "text-gray-400"}`}>Keywords</label>
          <input value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} className={glassInput} />
        </div>
        <div className="flex gap-2">
          <button onClick={saveUpdate} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium shadow hover:opacity-90 transition-all disabled:opacity-60">
            {saving ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : "Save"}
          </button>
          <button onClick={() => setEditing(false)}
            className={`px-4 py-1.5 rounded-lg text-sm border transition-all ${isDark ? "border-white/15 text-white/50 hover:bg-white/5" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {confirmDelete && <ConfirmModal isDark={isDark} onConfirm={doDelete} onCancel={() => setConfirmDelete(false)} />}

      {/* Outer container clips; no overflow so card doesn't wrap around */}
      <div className="relative group overflow-hidden rounded-2xl">

        {/* Action strip */}
        <div className={`absolute inset-y-0 left-0 flex flex-col transition-all duration-300 z-0 ${revealStrip} group-hover:w-24 w-0 overflow-hidden`}>

          {/* Edit — pen-click: whole pen nudges down on hover */}
          <button
            onClick={() => setEditing(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 text-xs font-medium transition-all duration-200 group/edit ${isDark ? "text-indigo-300 hover:bg-indigo-500/20" : "text-indigo-600 hover:bg-indigo-50"}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              {/* Pen body stays; tip group animates down then back */}
              <g className="pen-body">
                <path d="M12 20h9" />
              </g>
              <g className="pen-nib group-hover/edit:[animation:pen-write_0.6s_ease_infinite]">
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </g>
            </svg>
            <span className="tracking-wide">Edit</span>
          </button>

          <div className={`h-px ${isDark ? "bg-white/10" : "bg-gray-200"}`} />

          {/* Delete — trash lid opens on hover */}
          <button
            onClick={() => setConfirmDelete(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 text-xs font-medium transition-all duration-200 group/del ${isDark ? "text-red-300 hover:bg-red-500/20" : "text-red-600 hover:bg-red-50"}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="group-hover/del:[animation:bin-shake_0.5s_ease_infinite]">
              {/* Trash body — static */}
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              {/* Lid handle (top bar) — rotates open from left hinge */}
              <g className="trash-lid"
                style={{ transformOrigin: "4px 6px" }}>
                <path d="M3 6h18" />
                <path d="M9 6V4h6v2" />
              </g>
            </svg>
            <span className="tracking-wide">Delete</span>
          </button>
        </div>

        {/* Card */}
        <div className={`relative z-10 p-4 transition-all duration-300 ${cardBase} shadow-sm rounded-2xl group-hover:translate-x-24 group-hover:rounded-l-none group-hover:shadow-md`}>
          <p className={`font-semibold text-sm leading-snug ${isDark ? "text-white" : "text-gray-800"}`}>{faq.question}</p>
          <p className={`text-sm mt-1 leading-relaxed line-clamp-2 ${isDark ? "text-white/55" : "text-gray-500"}`}>{faq.answer}</p>
          {faq.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {faq.keywords.map((kw: string, ki: number) => (
                <span key={ki} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-white/8 text-white/40" : "bg-gray-100 text-gray-400"}`}>{kw}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

