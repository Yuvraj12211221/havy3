import { useState, useRef, useCallback } from "react";
import { useTimeTheme } from "../../hooks/useTimeTheme";

interface FAQ {
  question: string;
  answer: string;
  keywords: string[];
}

interface Props {
  businessId: string;
  supabase: any;
  onFaqApproved?: () => void;
}

export default function FAQDocGenerator({ businessId, supabase, onFaqApproved }: Props) {
  const theme = useTimeTheme();
  const isDark = theme === "dark";

  const [file, setFile] = useState<File | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FAQ>({ question: "", answer: "", keywords: [] });
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [genError, setGenError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── drag handlers ────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null);

  // ── generation ───────────────────────────────────────────────────
  const generateFAQs = async () => {
    if (!file) return;
    setGenError("");
    setLoading(true);
    setFaqs([]);
    setApproved(new Set());
    setDismissed(new Set());
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/generate-faq", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (!data.faqs?.length) throw new Error("No FAQs generated — try a different document.");
      setFaqs(data.faqs);
    } catch (err: any) {
      setGenError(err.message || "FAQ generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── approve ──────────────────────────────────────────────────────
  const approveFAQ = async (faq: FAQ, idx: number) => {
    try {
      setSavingIdx(idx);
      await supabase.from("business_faq").insert({
        business_id: businessId,
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords,
      });
      setApproved(prev => new Set([...prev, idx]));
      onFaqApproved?.();
    } catch {
      setGenError("Failed to save FAQ. Please try again.");
    } finally {
      setSavingIdx(null);
    }
  };

  const dismissFAQ = (idx: number) => setDismissed(prev => new Set([...prev, idx]));

  const startEdit = (faq: FAQ, idx: number) => {
    setEditing(idx);
    setEditForm({ ...faq, keywords: [...faq.keywords] });
  };

  const saveEdit = (idx: number) => {
    setFaqs(prev => { const updated = [...prev]; updated[idx] = { ...editForm }; return updated; });
    setEditing(null);
  };

  // ── styles ───────────────────────────────────────────────────────
  const subText = isDark ? "text-white/50" : "text-gray-500";
  const inputCls = isDark
    ? "bg-white/8 border border-white/12 text-white placeholder-white/25 rounded-xl px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/70 transition-all text-sm"
    : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400 rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm";


  const cardBase = isDark ? "bg-gray-900/70 border border-white/10" : "bg-white border border-gray-200";


  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h3 className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>
          AI FAQ Generator
        </h3>
        <p className={`text-xs mt-0.5 ${subText}`}>
          Upload a document and AI will extract relevant FAQs automatically.
        </p>
      </div>

      {/* ── Drop Zone ── */}
      <div
        className={`relative overflow-hidden rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 group/drop
          ${isDragging ? "scale-[1.01]" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        aria-label="Upload document"
      >
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" onChange={onFileChange} className="hidden" />

        {/* Static dashed border (always visible) */}
        <div className={`absolute inset-0 rounded-2xl border-2 border-dashed pointer-events-none transition-colors duration-300
          ${isDragging ? "border-blue-500" : isDark ? "border-white/20" : "border-gray-300"}`} />

        {/* Animated spinning gradient border — shows on hover, hidden when file is dropped */}
        {!file && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            {/* Outer spinning ring */}
            <div className={`faq-spin-ring absolute inset-[-2px] rounded-2xl
              ${isDark ? "opacity-0 group-hover/drop:opacity-100" : "opacity-0 group-hover/drop:opacity-80"}
              transition-opacity duration-400`}
              style={{
                background: "conic-gradient(from 0deg, transparent 0%, #6366f1 30%, #3b82f6 50%, #a855f7 70%, transparent 100%)",
                animation: "faq-border-spin 2.5s linear infinite",
              }}
            />
            {/* Inner mask to show only the border edge */}
            <div className={`absolute inset-[2px] rounded-[14px] ${isDark ? "bg-gray-900/80" : "bg-white/80"}`} />
          </div>
        )}

        {/* Dragging glow */}
        {isDragging && (
          <div className="absolute inset-0 rounded-2xl bg-blue-500/10 pointer-events-none" />
        )}

        <div className="relative z-10">
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>📄</div>
              <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-800"}`}>{file.name}</p>
              <p className={`text-xs ${subText}`}>{(file.size / 1024).toFixed(1)} KB</p>
              <button
                onClick={e => { e.stopPropagation(); setFile(null); setFaqs([]); setGenError(""); }}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${isDark ? "border-white/15 text-white/40 hover:border-red-400/60 hover:text-red-400" : "border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500"}`}
              >× Remove</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-300
                group-hover/drop:scale-110 group-hover/drop:border-blue-400
                ${isDragging ? "border-blue-500 bg-blue-500/10 scale-110" : isDark ? "border-white/20" : "border-gray-300"}`}>
                <span className={`text-3xl font-light select-none transition-colors duration-200
                  group-hover/drop:text-blue-400
                  ${isDragging ? "text-blue-500" : isDark ? "text-white/40" : "text-gray-400"}`}>+</span>
              </div>
              <div>
                <p className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-700"}`}>
                  {isDragging ? "Drop it here!" : "Drop your document here"}
                </p>
                <p className={`text-xs mt-1 ${subText}`}>or <span className="text-blue-400 underline underline-offset-2">click to browse</span></p>
                <p className={`text-xs mt-1.5 ${subText}`}>PDF, Word, TXT accepted</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes faq-border-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .faq-spin-ring {
          transform-origin: center;
        }
      `}</style>

      {/* ── Generate Button ── */}
      {file && (
        <button
          onClick={generateFAQs}
          disabled={loading}
          className={`w-full py-2.5 rounded-xl font-medium text-white text-sm transition-all duration-200 bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-700 shadow-lg shadow-blue-500/25 ${loading ? "opacity-60 cursor-not-allowed" : "hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating FAQs…
            </span>
          ) : "Generate FAQs from Document"}
        </button>
      )}

      {/* ── Error ── */}
      {genError && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${isDark ? "bg-red-500/15 border border-red-500/30 text-red-300" : "bg-red-50 border border-red-200 text-red-600"}`}>
          <span>✕</span> {genError}
        </div>
      )}

      {/* ── Skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`rounded-2xl p-4 animate-pulse ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
              <div className={`h-4 rounded w-3/4 mb-3 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
              <div className={`h-3 rounded w-full mb-2 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
              <div className={`h-3 rounded w-5/6 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {faqs.length > 0 && !loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold text-sm ${isDark ? "text-white/80" : "text-gray-700"}`}>
              {faqs.length} FAQs generated
            </h4>
            <span className={`text-xs ${subText}`}>Review and approve to save</span>
          </div>

          {faqs.map((faq, i) => {
            if (dismissed.has(i)) return null;
            const isApproved = approved.has(i);
            const isEditing = editing === i;
            const isSaving = savingIdx === i;

            return (
              <div key={i} className={`rounded-2xl p-5 transition-all duration-300 ${cardBase} shadow-sm ${isApproved ? "opacity-60 ring-2 ring-emerald-500/40" : ""}`}>
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${subText}`}>Question</label>
                      <input value={editForm.question} onChange={e => setEditForm({ ...editForm, question: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${subText}`}>Answer</label>
                      <textarea rows={3} value={editForm.answer} onChange={e => setEditForm({ ...editForm, answer: e.target.value })} className={inputCls + " resize-none"} />
                    </div>
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${subText}`}>Keywords</label>
                      <input value={editForm.keywords.join(", ")} onChange={e => setEditForm({ ...editForm, keywords: e.target.value.split(",").map(k => k.trim()) })} className={inputCls} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => saveEdit(i)}
                        className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium shadow hover:opacity-90 transition-all">
                        Save
                      </button>
                      <button onClick={() => setEditing(null)}
                        className={`px-4 py-1.5 rounded-lg text-sm border transition-all ${isDark ? "border-white/15 text-white/60 hover:bg-white/5" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className={`font-semibold text-sm leading-snug flex-1 ${isDark ? "text-white" : "text-gray-800"}`}>
                        Q: {faq.question}
                      </p>
                      {isApproved && (
                        <span className="shrink-0 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Saved</span>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed mb-3 ${isDark ? "text-white/65" : "text-gray-600"}`}>{faq.answer}</p>
                    {faq.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {faq.keywords.map((kw, ki) => (
                          <span key={ki} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-white/8 text-white/40" : "bg-gray-100 text-gray-400"}`}>{kw}</span>
                        ))}
                      </div>
                    )}
                    {!isApproved && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => approveFAQ(faq, i)}
                          disabled={isSaving}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow hover:shadow-emerald-500/20 transition-all duration-200 ${isSaving ? "opacity-70" : "hover:scale-105 active:scale-95"}`}
                        >
                          {isSaving ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : "✓ Approve"}
                        </button>
                        <button
                          onClick={() => startEdit(faq, i)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${isDark ? "bg-white/8 text-white/70 hover:bg-white/15" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => dismissFAQ(i)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${isDark ? "bg-red-500/12 text-red-400 hover:bg-red-500/25" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}