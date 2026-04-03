import { useEffect, useState, useRef } from 'react';
import {
  speakText,
  getAvailableVoices,
  setSelectedVoiceURI,
  getSelectedVoiceURI,
  onTtsStatusChange,
  offTtsStatusChange,
  type TtsStatus,
} from '../../lib/tts/speech';
import { useTimeTheme } from '../../hooks/useTimeTheme';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import DownloadReportButton from '../common/DownloadReportButton';

// ─── Indian language voices we highlight ─────────────────────────────────────
const INDIAN_LANG_PREFIXES = ['hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'pa', 'ur'];
const INDIAN_LANG_LABELS: Record<string, string> = {
  hi: '🇮🇳 Hindi', mr: '🇮🇳 Marathi', ta: '🇮🇳 Tamil',
  te: '🇮🇳 Telugu', bn: '🇮🇳 Bengali', gu: '🇮🇳 Gujarati',
  kn: '🇮🇳 Kannada', ml: '🇮🇳 Malayalam', pa: '🇮🇳 Punjabi', ur: '🇮🇳 Urdu',
};

// Test phrases per language
const TEST_PHRASES: Record<string, string> = {
  hi: 'नमस्ते! यह हिंदी आवाज़ का परीक्षण है।',
  mr: 'नमस्कार! हे मराठी आवाजाचे परीक्षण आहे।',
  ta: 'வணக்கம்! இது தமிழ் குரல் சோதனை.',
  te: 'నమస్కారం! ఇది తెలుగు వాయిస్ పరీక్ష.',
  bn: 'নমস্কার! এটি বাংলা ভয়েস পরীক্ষা।',
  en: 'Hello! This is a voice test. How does this sound?',
};

type TriggerType = 'hover' | 'click';
type HeatmapRow = { date: string; hours: Record<number, number> };

export default function TtsAnalytics() {
  const theme = useTimeTheme();
  const isDark = theme === 'dark';

  const CHART_COLORS = isDark ? ['#60a5fa', '#34d399'] : ['#2563eb', '#16a34a'];
  const cardBg   = isDark ? 'bg-white/5 border-white/10 backdrop-blur-sm' : 'bg-white/80 border-gray-200 backdrop-blur-sm';
  const text     = isDark ? 'text-white' : 'text-gray-900';
  const subText  = isDark ? 'text-white/50' : 'text-gray-500';
  const axisColor = isDark ? '#ffffff55' : '#64748b';
  const tipStyle  = isDark
    ? { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '8px' }
    : { backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '8px' };
  const glowHover = isDark
    ? 'hover:shadow-[0_0_12px_rgba(96,165,250,0.22)] hover:border-blue-400/30'
    : 'hover:shadow-[0_0_12px_rgba(37,99,235,0.12)] hover:border-blue-300/60';

  const videoSrc = isDark ? '/videos/dancingbotnight.mp4' : '/videos/dancingrobotday.mp4';

  // ── Analytics data ──────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<{ totalEvents: number; totalWords: number; avgWords: string | number } | null>(null);
  const [hoverClick, setHoverClick] = useState<{ name: string; value: number }[]>([]);
  const [usageOverTime, setUsageOverTime] = useState<HeatmapRow[]>([]);
  const [topWords, setTopWords] = useState<{ word: string; count: number }[]>([]);
  const [intentScore, setIntentScore] = useState(0);


  // ── Voice Studio state ──────────────────────────────────────────────────────
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedURI, setSelectedURI] = useState<string | null>(getSelectedVoiceURI());
  const [voiceFilter, setVoiceFilter] = useState<'indian' | 'english' | 'all'>('indian');
  const [previewingURI, setPreviewingURI] = useState<string | null>(null);

  // ── TTS status ──────────────────────────────────────────────────────────────
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>('idle');
  const [ttsDetail, setTtsDetail] = useState('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const speakStartRef = useRef<number>(0);

  // ── Load voices ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = () => setVoices(getAvailableVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // ── TTS status subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (s: TtsStatus, d?: string) => {
      setTtsStatus(s);
      setTtsDetail(d || '');
      if (s === 'loading') { speakStartRef.current = Date.now(); setLatencyMs(null); }
      if (s === 'playing' && speakStartRef.current) setLatencyMs(Date.now() - speakStartRef.current);
    };
    onTtsStatusChange(handler);
    return () => offTtsStatusChange(handler);
  }, []);

  // ── Analytics load ──────────────────────────────────────────────────────────
  useEffect(() => { loadAnalytics(); }, [selectedDate]);

  function buildHeatmapData(events: any[]): HeatmapRow[] {
    const map: Record<string, Record<number, number>> = {};
    events.forEach(e => {
      const date = e.created_at.slice(0, 10);
      const hour = Number(new Date(e.created_at).toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
      if (!map[date]) map[date] = {};
      map[date][hour] = (map[date][hour] || 0) + 1;
    });
    return Object.entries(map).map(([date, hours]) => ({ date, hours }));
  }

  async function loadAnalytics() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: events } = await supabase.from('tts_events').select('trigger_type, word_count, created_at').eq('user_id', user.id);
    if (!events) return;
    const totalEvents = events.length;
    const totalWords = events.reduce((s, e) => s + (e.word_count || 0), 0);
    setSummary({ totalEvents, totalWords, avgWords: totalEvents ? (totalWords / totalEvents).toFixed(1) : 0 });
    const hc: Record<TriggerType, number> = { hover: 0, click: 0 };
    events.forEach(e => {
      const type = e.trigger_type as TriggerType;
      if ((type === 'hover' || type === 'click') && e.created_at.startsWith(selectedDate)) hc[type]++;
    });
    setHoverClick([{ name: 'Hover', value: hc.hover }, { name: 'Click', value: hc.click }]);
    setIntentScore(totalEvents ? Math.round((hc.click / totalEvents) * 100) : 0);
    setUsageOverTime(buildHeatmapData(events));
    const { data: words } = await supabase.from('tts_word_stats').select('word, trigger_type, count').eq('user_id', user.id);
    if (!words) return;
    const wordMap: Record<string, { hover: number; click: number }> = {};
    words.forEach(w => {
      const type = w.trigger_type as TriggerType;
      if (!wordMap[w.word]) wordMap[w.word] = { hover: 0, click: 0 };
      if (type === 'hover' || type === 'click') wordMap[w.word][type] += w.count;
    });
    setTopWords(Object.entries(wordMap).map(([word, v]) => ({ word, count: v.hover + v.click })).sort((a, b) => b.count - a.count).slice(0, 10));
  }

  // ── Voice helpers ───────────────────────────────────────────────────────────
  function getLangPrefix(lang: string) { return lang.split('-')[0].toLowerCase(); }

  const filteredVoices = voices.filter(v => {
    const prefix = getLangPrefix(v.lang);
    if (voiceFilter === 'indian') return INDIAN_LANG_PREFIXES.includes(prefix);
    if (voiceFilter === 'english') return prefix === 'en';
    return true;
  });

  // Group filtered voices by language
  const voiceGroups: Record<string, SpeechSynthesisVoice[]> = {};
  filteredVoices.forEach(v => {
    const key = v.lang;
    if (!voiceGroups[key]) voiceGroups[key] = [];
    voiceGroups[key].push(v);
  });

  function handleSelectVoice(uri: string) {
    setSelectedURI(uri);
    setSelectedVoiceURI(uri);
  }

  function handlePreview(voice: SpeechSynthesisVoice) {
    setSelectedVoiceURI(voice.voiceURI); // temp select for preview
    setPreviewingURI(voice.voiceURI);
    const prefix = getLangPrefix(voice.lang);
    const phrase = TEST_PHRASES[prefix] || TEST_PHRASES['en'];
    speakText(phrase, prefix);
    // Restore after preview
    setTimeout(() => {
      setSelectedVoiceURI(selectedURI);
      setPreviewingURI(null);
    }, 8000);
  }

  const indianVoiceCount = voices.filter(v => INDIAN_LANG_PREFIXES.includes(getLangPrefix(v.lang))).length;
  const selectedVoice = voices.find(v => v.voiceURI === selectedURI);

  // ── Status pill ─────────────────────────────────────────────────────────────
  const pillCfg: Record<TtsStatus, { label: string; color: string }> = {
    idle:    { label: 'Idle',     color: isDark ? 'bg-white/10 text-white/40'       : 'bg-gray-100 text-gray-400' },
    loading: { label: 'Loading…', color: isDark ? 'bg-amber-500/20 text-amber-300'  : 'bg-amber-100 text-amber-700' },
    playing: { label: 'Playing',  color: isDark ? 'bg-green-500/20 text-green-300'  : 'bg-green-100 text-green-700' },
    error:   { label: 'Error',    color: isDark ? 'bg-red-500/20 text-red-300'      : 'bg-red-100 text-red-700' },
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (!summary) return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <video key={videoSrc} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0">
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div className={`absolute inset-0 z-10 ${isDark ? 'bg-black/60' : 'bg-white/50'}`} />
      <div className="relative z-20 flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-white/20" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-white/80 text-sm animate-pulse">Loading TTS analytics…</p>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen -m-8 overflow-hidden">
      {/* Background video */}
      <video key={videoSrc} autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none">
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div className={`absolute inset-0 z-10 ${isDark ? 'bg-black/65' : 'bg-white/70'}`} />

      <div className="relative z-20 p-8 space-y-6" id="analyticsExport">

        {/* Page header */}
        <div>
          <h2 className={`text-2xl font-bold ${text}`}>Text-to-Speech Studio</h2>
          <p className={`text-sm mt-0.5 ${subText}`}>
            {voices.length} system voices available · {indianVoiceCount} Indian language voices
          </p>
        </div>

        {/* ── Voice Studio ── */}
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest ${subText}`}>Voice Studio</p>
              {selectedVoice ? (
                <p className={`text-sm font-semibold mt-0.5 ${text}`}>
                  🎙️ {selectedVoice.name}
                  <span className={`ml-2 text-xs font-normal ${subText}`}>{selectedVoice.lang}</span>
                </p>
              ) : (
                <p className={`text-sm mt-0.5 ${subText}`}>No voice selected — click any card below</p>
              )}
            </div>
            {/* Filter tabs */}
            <div className={`flex rounded-lg overflow-hidden border text-xs font-semibold ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              {(['indian', 'english', 'all'] as const).map(f => (
                <button key={f} onClick={() => setVoiceFilter(f)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    voiceFilter === f
                      ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                      : isDark ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}>
                  {f === 'indian' ? '🇮🇳 Indian' : f === 'english' ? '🇺🇸 English' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Voice cards grouped by language */}
          {voices.length === 0 ? (
            <div className={`text-sm text-center py-8 ${subText}`}>
              Loading voices… (browser may take a moment to initialize)
            </div>
          ) : filteredVoices.length === 0 ? (
            <div className={`text-sm text-center py-8 ${subText}`}>
              No {voiceFilter} voices found on this device.
              {voiceFilter === 'indian' && <span> Try switching browser to Chrome or Edge.</span>}
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
              {Object.entries(voiceGroups).map(([lang, langVoices]) => {
                const prefix = getLangPrefix(lang);
                const langLabel = INDIAN_LANG_LABELS[prefix] || lang;
                return (
                  <div key={lang}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${subText}`}>{langLabel}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {langVoices.map(voice => {
                        const isSelected = voice.voiceURI === selectedURI;
                        const isPreviewing = voice.voiceURI === previewingURI;
                        return (
                          <div key={voice.voiceURI}
                            onClick={() => handleSelectVoice(voice.voiceURI)}
                            className={`
                              relative rounded-xl border cursor-pointer p-3 transition-all duration-150
                              ${isSelected
                                ? isDark ? 'border-blue-500 bg-blue-500/10' : 'border-blue-500 bg-blue-50'
                                : isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-100 bg-gray-50 hover:bg-blue-50/50 hover:border-blue-200'
                              }
                            `}
                          >
                            {isSelected && (
                              <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                            )}
                            <p className={`text-xs font-semibold truncate pr-5 ${text}`}>{voice.name}</p>
                            <p className={`text-[10px] mt-0.5 ${subText}`}>{voice.localService ? '📱 Local' : '☁️ Cloud'}</p>

                            {/* Preview button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePreview(voice); }}
                              disabled={ttsStatus === 'playing' || ttsStatus === 'loading'}
                              className={`
                                mt-2 w-full text-[10px] font-semibold py-1 rounded-lg transition-all
                                ${isPreviewing && ttsStatus === 'playing'
                                  ? isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                                  : isDark ? 'bg-white/10 text-white/60 hover:bg-blue-500/20 hover:text-blue-300' : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'
                                }
                                ${(ttsStatus === 'playing' || ttsStatus === 'loading') && !isPreviewing ? 'opacity-40 cursor-not-allowed' : ''}
                              `}
                            >
                              {isPreviewing && ttsStatus === 'playing' ? '🔊 Speaking…' : '▶ Preview'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Test with custom phrase + status */}
          <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-100'} flex flex-wrap items-center gap-3`}>
            <button
              onClick={() => selectedVoice && speakText(
                TEST_PHRASES[getLangPrefix(selectedVoice.lang)] || TEST_PHRASES['en'],
                getLangPrefix(selectedVoice.lang)
              )}
              disabled={!selectedVoice || ttsStatus === 'loading' || ttsStatus === 'playing'}
              className={`px-4 py-2 text-sm rounded-lg font-medium shadow-sm transition-all
                ${!selectedVoice || ttsStatus === 'loading' || ttsStatus === 'playing'
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 active:scale-95'
                }
                bg-blue-600 text-white hover:bg-blue-500`}
            >
              {ttsStatus === 'loading' ? '⏳ Loading…' : ttsStatus === 'playing' ? '🔊 Playing…' : '▶ Test Selected Voice'}
            </button>

            {/* Status pill */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${pillCfg[ttsStatus].color}`}>
              {ttsStatus === 'loading' && <span className="w-2 h-2 rounded-full border border-current border-t-transparent animate-spin" />}
              {ttsStatus === 'playing' && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
              {pillCfg[ttsStatus].label}
              {ttsStatus === 'error' && ttsDetail && <span className="ml-1 font-normal opacity-70">— {ttsDetail}</span>}
            </span>

            {latencyMs !== null && (
              <span className={`text-xs font-mono ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{latencyMs}ms</span>
            )}
          </div>
        </div>

        {/* ── Indian Language Phrases ── */}
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${subText}`}>
            🇮🇳 Indian Language Test Phrases
          </p>
          <div className="space-y-2">
            {Object.entries(TEST_PHRASES).map(([lang, phrase]) => (
              <div
                key={lang}
                onClick={() => speakText(phrase, lang)}
                className={`
                  flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                  cursor-pointer transition-all duration-150 group
                  ${isDark
                    ? 'bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-400/30'
                    : 'bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200'
                  }
                `}
              >
                <div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {INDIAN_LANG_LABELS[lang] || `🌐 ${lang}`}
                  </span>
                  <p className={`text-sm leading-relaxed font-medium mt-0.5 ${text}`}>{phrase}</p>
                </div>
                <span className={`text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-blue-300' : 'text-blue-500'}`}>▶ speak</span>
              </div>
            ))}
          </div>
          <p className={`text-xs mt-3 ${subText}`}>
            Click any phrase to speak it using the currently selected voice.
          </p>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'TTS Events', value: summary.totalEvents },
            { label: 'Words Spoken', value: summary.totalWords },
            { label: 'Avg Words/Use', value: summary.avgWords },
            { label: 'Click Intent', value: `${intentScore}%` },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 transition-all duration-200 ${cardBg} ${glowHover}`}>
              <p className={`text-xs uppercase tracking-wide ${subText}`}>{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${text}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Hover vs Click ── */}
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold text-sm uppercase tracking-wide ${subText}`}>Hover vs Click Usage</h3>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className={`border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-200 text-gray-700'}`}
            />
          </div>
          {hoverClick.every(d => d.value === 0) ? (
            <p className={`text-sm ${subText}`}>No TTS activity on this date</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={hoverClick} dataKey="value" nameKey="name" label>
                  {hoverClick.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Heatmap ── */}
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <h3 className={`font-semibold text-sm uppercase tracking-wide mb-4 ${subText}`}>Usage Heatmap (by Hour · IST)</h3>
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className={`p-2 text-left ${subText}`}>Date</th>
                  {Array.from({ length: 24 }).map((_, h) => <th key={h} className={`p-1 text-center ${subText}`}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {usageOverTime.map(row => (
                  <tr key={row.date}>
                    <td className={`p-2 font-medium whitespace-nowrap ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{row.date}</td>
                    {Array.from({ length: 24 }).map((_, h) => {
                      const val = row.hours[h] || 0;
                      return (
                        <td key={h} title={`${val} events`} className="w-6 h-6" style={{
                          backgroundColor: val
                            ? isDark ? `rgba(96,165,250,${Math.min(val / 8, 0.9)})` : `rgba(37,99,235,${Math.min(val / 8, 1)})`
                            : isDark ? '#ffffff08' : '#f1f5f9',
                        }} />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Top Spoken Words ── */}
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <h3 className={`font-semibold text-sm uppercase tracking-wide mb-4 ${subText}`}>Top Spoken Words</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topWords} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
              <XAxis dataKey="word" interval={0} angle={-40} textAnchor="end" tick={{ fontSize: 11, fill: axisColor }} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <DownloadReportButton targetId="analyticsExport" fileName="tts-report.pdf" />
      </div>
    </div>
  );
}
