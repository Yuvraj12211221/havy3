// ─── speech.ts — Browser Web Speech Synthesis, multi-voice ───────────────────
// 100% free, zero API keys, works offline.
// The browser ships Hindi (hi-IN), Tamil (ta-IN), Telugu (te-IN), Marathi (mr-IN),
// Bengali (bn-IN) voices natively in Chrome / Edge on all platforms.
// Bengali (bn-IN) voices natively in Chrome / Edge on all platforms.
import { supabase } from '../supabase';

// Keep export for any lingering imports (empty — no HF models used)
export const HF_MODELS: Record<string, string> = {};

// ─── TTS Status observable ────────────────────────────────────────────────────

export type TtsStatus = "idle" | "loading" | "playing" | "error";
type StatusCallback = (status: TtsStatus, detail?: string) => void;
const _statusListeners: Set<StatusCallback> = new Set();

function _emitStatus(s: TtsStatus, d?: string) {
  _statusListeners.forEach((cb) => cb(s, d));
}

export function onTtsStatusChange(cb: StatusCallback) { _statusListeners.add(cb); }
export function offTtsStatusChange(cb: StatusCallback) { _statusListeners.delete(cb); }

let _status: TtsStatus = "idle";
function setStatus(s: TtsStatus, d?: string) { _status = s; _emitStatus(s, d); }
export function getTtsStatus() { return _status; }

// ─── Voice selection ─────────────────────────────────────────────────────────

// Stored as a URI so it survives voice list refreshes
const VOICE_KEY = "havy-tts-voice-uri";

let _selectedVoiceURI: string | null = (() => {
  try { return localStorage.getItem(VOICE_KEY); } catch { return null; }
})();

export function setSelectedVoiceURI(uri: string | null) {
  _selectedVoiceURI = uri;
  try {
    if (uri) localStorage.setItem(VOICE_KEY, uri);
    else localStorage.removeItem(VOICE_KEY);
  } catch { /* ignore */ }
}

export function getSelectedVoiceURI(): string | null {
  return _selectedVoiceURI;
}

// ─── Voice helpers ────────────────────────────────────────────────────────────

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

/** Returns voices grouped by their BCP-47 lang tag */
export function getVoicesByLanguage(): Record<string, SpeechSynthesisVoice[]> {
  const groups: Record<string, SpeechSynthesisVoice[]> = {};
  getAvailableVoices().forEach((v) => {
    if (!groups[v.lang]) groups[v.lang] = [];
    groups[v.lang].push(v);
  });
  return groups;
}

/** Resolve the best voice for a given language code (e.g. "hi", "ta") */
function resolveVoice(lang?: string): SpeechSynthesisVoice | null {
  const voices = getAvailableVoices();
  if (!voices.length) return null;

  // 1. User's explicit selection
  if (_selectedVoiceURI) {
    const picked = voices.find((v) => v.voiceURI === _selectedVoiceURI);
    if (picked) return picked;
  }

  // 2. Auto-detect by language prefix (hi, ta, te …)
  if (lang && lang !== "en") {
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(lang));
    if (match) return match;
  }

  // 3. English fallback
  return voices.find((v) => v.lang.startsWith("en")) || voices[0];
}

// ─── Script auto-detection ────────────────────────────────────────────────────

export function detectScript(text: string): string {
  const s = text.slice(0, 80);
  let de = 0, ta = 0, te = 0, bn = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x0900 && cp <= 0x097F) de++;
    else if (cp >= 0x0B80 && cp <= 0x0BFF) ta++;
    else if (cp >= 0x0C00 && cp <= 0x0C7F) te++;
    else if (cp >= 0x0980 && cp <= 0x09FF) bn++;
  }
  const max = Math.max(de, ta, te, bn);
  if (max === 0) return "en";
  if (max === de) return "hi";
  if (max === ta) return "ta";
  if (max === te) return "te";
  return "bn";
}

// ─── Core speak ───────────────────────────────────────────────────────────────

function _speak(text: string, voice: SpeechSynthesisVoice | null): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) { resolve(); return; }
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    if (voice) {
      utter.voice = voice;
      utter.lang  = voice.lang;
    }
    utter.rate   = 1.0;
    utter.pitch  = 1.0;
    utter.volume = 1.0;

    utter.onstart = () => setStatus("playing");
    utter.onend   = () => { setStatus("idle"); resolve(); };
    utter.onerror = (e) => {
      setStatus("error", e.error || "Speech error");
      resolve();
    };

    setStatus("loading");
    
    // Deduct TTS Credit before speaking (Client Side tracking since it uses browser web speech API)
    supabase.auth.getUser().then(async ({ data }) => {
       if (data.user) {
          try {
            // Track TTS character usage in the new subscription system
            const characterCount = text.length;
            const response: any = await supabase.rpc('track_usage', { 
              user_id_param: data.user.id, 
              usage_type_param: 'tts_character', 
              amount_param: characterCount
            });
            const ok = response?.data;
            const error = response?.error;

            // If tracking succeeds or function is missing, allow TTS to play
            // The new track_usage function handles usage limits in the database
            if (ok || !response || (error && error.code === 'PGRST202') || (error && error.message?.includes('Could not find'))) {
               window.speechSynthesis.speak(utter);
            } else {
               console.error("TTS Usage Tracking Error:", JSON.stringify(error));
               setStatus("error", "Failed to record TTS usage");
               resolve();
            }
          } catch (err) {
            console.error("TTS Unhandled Exception", err);
            window.speechSynthesis.speak(utter); 
          }
       } else {
          // If no user (e.g public widget), speak anyway or check key. Assuming TTS is dashboard only mostly.
          window.speechSynthesis.speak(utter);
       }
    });

  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Speak text using the selected (or auto-detected) voice.
 * @param text   Text to speak
 * @param lang   BCP-47 language hint (optional — auto-detected from Unicode script)
 */
export function speakText(text: string, lang?: string): void {
  if (!text.trim()) return;

  const resolvedLang = lang && lang !== "en" ? lang : detectScript(text);

  const doSpeak = () => {
    const voice = resolveVoice(resolvedLang);
    _speak(text, voice).catch(() => setStatus("idle"));
  };

  const voices = getAvailableVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    // Wait for browser to load voices then speak
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      doSpeak();
    };
  }
}

// ─── Kept for DictationContext backward-compat (no-ops now) ──────────────────
export type TtsEngine = "browser" | "huggingface";
let _engine: TtsEngine = "browser";
export function setTtsEngine(e: TtsEngine) { _engine = e; }
export function getTtsEngine(): TtsEngine { return _engine; }
