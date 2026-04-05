/**
 * HAVY Chatbot Widget — Fixed color (#6366f1), fixed position (bottom-right)
 * DB similarity via Supabase FAQ edge function.
 * Mic → routed through Supabase /transcribe edge function → credits tracked in DB.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Mic, Square } from 'lucide-react';

const PRIMARY = '#6366f1';
const GRADIENT = `linear-gradient(135deg, ${PRIMARY}f5, ${PRIMARY}cc)`;
const HOVER_GRADIENT = `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY}dd)`;

// Env vars — read once at module level
const ENV_SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const ENV_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotWidgetProps {
  chatbotKey?: string;
  businessName?: string;
  supabaseUrl?: string;
  anonKey?: string;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  chatbotKey = '',
  businessName = 'Assistant',
  supabaseUrl = ENV_SUPABASE_URL,
  anonKey = ENV_ANON_KEY,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      timestamp: new Date(),
      text: `👋 Hey there! I'm ${businessName}'s Assistant. Ask me anything!`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mic / STT state
  const [isRecording, setIsRecording] = useState(false);
  const [isSttLoading, setIsSttLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen, isMinimized]);

  // ── Groq STT via Supabase edge function (tracks credits) ─────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsSttLoading(true);
        try {
          // Route through Supabase /transcribe edge function.
          // This deducts STT credits from the user's account via decrement_credits().
          const formData = new FormData();
          formData.append('audio', blob, 'audio.webm');
          if (chatbotKey) formData.append('chatbot_key', chatbotKey);

          const transcribeUrl = (supabaseUrl || ENV_SUPABASE_URL) + '/functions/v1/transcribe';
          const apiKey = anonKey || ENV_ANON_KEY;

          const res = await fetch(transcribeUrl, {
            method: 'POST',
            headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            const transcript = (data.transcript || '').trim();
            if (transcript) setInputValue((prev) => (prev ? prev + ' ' + transcript : transcript));
          } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = (errData as any).error || '';
            if (errMsg.includes('Credit limit')) {
              addBotMsg('⚠️ Your monthly Speech-to-Text credits are exhausted. Upgrade your plan to continue.');
            } else {
              console.error('[HAVY STT] Error:', res.status, errData);
            }
          }
        } catch (err) {
          console.error('[HAVY STT] Network error:', err);
        } finally {
          setIsSttLoading(false);
        }
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (err) {
      console.error('[HAVY] Mic access denied:', err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const toggleMic = () => (isRecording ? stopRecording() : startRecording());

  // ── Send message ──────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (!chatbotKey) {
      addBotMsg('⚠️ Chatbot is not configured yet. Please set up your business profile first.');
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: text.trim(), sender: 'user', timestamp: new Date() },
    ]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/faq`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ question: text.trim(), chatbot_key: chatbotKey }),
      });

      const data = await response.json();
      if (data.error === 'credit_limit_reached') {
        addBotMsg('⚠️ Monthly chatbot limit reached. Please contact the business for support.');
      } else if (data.error === 'business_not_found') {
        addBotMsg('⚠️ Chatbot configuration not found.');
      } else if (data.answer) {
        addBotMsg(data.answer);
      } else {
        addBotMsg("🤔 I don't have an answer for that. Please contact us directly for help!");
      }
    } catch {
      addBotMsg('⚠️ Connection issue. Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  const addBotMsg = (text: string) =>
    setMessages((prev) => [
      ...prev,
      { id: (Date.now() + 1).toString(), text, sender: 'bot', timestamp: new Date() },
    ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <>
      {/* LAUNCHER BUTTON — always bottom-right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', right: 20, bottom: 20, zIndex: 9999,
            width: 56, height: 56, borderRadius: '50%',
            background: GRADIENT, border: 'none', color: 'white', cursor: 'pointer',
            boxShadow: `0 8px 32px ${PRIMARY}50`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1) translateY(-3px)';
            e.currentTarget.style.background = HOVER_GRADIENT;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.background = GRADIENT;
          }}
        >
          <MessageCircle size={26} />
        </button>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 9999,
          width: 360, height: isMinimized ? 60 : 520,
          borderRadius: 18, overflow: 'hidden', background: 'white',
          boxShadow: `0 20px 70px -10px rgba(0,0,0,0.25), 0 0 0 1px rgba(99,102,241,0.08)`,
          display: 'flex', flexDirection: 'column',
          transition: 'height 0.3s ease',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          {/* HEADER */}
          <div style={{
            background: GRADIENT, color: 'white',
            padding: '10px 14px', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, border: '1.5px solid rgba(255,255,255,0.3)',
              }}>🤖</div>
              <div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{businessName}</h3>
                <p style={{ margin: 0, fontSize: 10, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }} />
                  Online · FAQ AI
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                style={hdrBtn}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              >{isMinimized ? '⬆' : '⬇'}</button>
              <button
                onClick={() => setIsOpen(false)}
                style={hdrBtn}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
              >✕</button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* MESSAGES */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '14px',
                display: 'flex', flexDirection: 'column', gap: 10,
                background: 'linear-gradient(180deg, #f8faff 0%, #fff 60%)',
              }}>
                {messages.map((msg, idx) => (
                  <div key={msg.id} style={{
                    display: 'flex',
                    justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    animation: `chatSlideIn 0.25s ease ${idx * 0.03}s both`,
                  }}>
                    <div style={{
                      maxWidth: '80%', padding: '9px 13px',
                      borderRadius: msg.sender === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      fontSize: 13, lineHeight: 1.5,
                      wordWrap: 'break-word', whiteSpace: 'pre-wrap',
                      background: msg.sender === 'user' ? GRADIENT : 'white',
                      color: msg.sender === 'user' ? 'white' : '#1e293b',
                      border: msg.sender === 'bot' ? `1px solid ${PRIMARY}12` : 'none',
                      boxShadow: msg.sender === 'user'
                        ? `0 3px 10px ${PRIMARY}30`
                        : '0 2px 6px rgba(0,0,0,0.06)',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {(isLoading || isSttLoading) && (
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
                    {isSttLoading ? (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Transcribing…</span>
                    ) : [0, 1, 2].map((i) => (
                      <div key={i} style={{
                        width: 7, height: 16, borderRadius: 4,
                        background: PRIMARY,
                        animation: `chatWave 0.8s ease-in-out ${i * 0.1}s infinite`,
                      }} />
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT */}
              <div style={{
                borderTop: `1px solid ${PRIMARY}12`, background: 'white',
                padding: '9px 10px', flexShrink: 0,
              }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  {/* Mic — credits tracked via /transcribe edge function */}
                  <button
                    type="button" onClick={toggleMic}
                    disabled={isSttLoading}
                    title={isRecording ? 'Stop recording' : 'Speak your message (uses STT credits)'}
                    style={{
                      flexShrink: 0, width: 36, height: 36, borderRadius: 9,
                      border: `1.5px solid ${isRecording ? '#ef4444' : PRIMARY + '30'}`,
                      background: isRecording ? '#fef2f2' : '#f8faff',
                      color: isRecording ? '#ef4444' : PRIMARY,
                      cursor: isSttLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s', position: 'relative',
                    }}
                  >
                    {isRecording ? (
                      <>
                        <Square size={13} />
                        <span style={{
                          position: 'absolute', top: 3, right: 3,
                          width: 6, height: 6, borderRadius: '50%',
                          background: '#ef4444', animation: 'chatPulse 1s infinite',
                        }} />
                      </>
                    ) : isSttLoading ? (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>…</span>
                    ) : (
                      <Mic size={15} />
                    )}
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={isRecording ? '🔴 Listening…' : 'Type or speak…'}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading || isRecording}
                    style={{
                      flex: 1, padding: '8px 12px',
                      border: `1.5px solid ${PRIMARY}18`,
                      borderRadius: 9, fontSize: 13, outline: 'none',
                      background: isRecording ? '#fef2f2' : '#f8faff',
                      color: '#1e293b', transition: 'all 0.2s', fontFamily: 'inherit',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = PRIMARY;
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.boxShadow = `0 0 8px ${PRIMARY}25`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = `${PRIMARY}18`;
                      e.currentTarget.style.background = '#f8faff';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    style={{
                      flexShrink: 0, width: 36, height: 36, border: 'none', borderRadius: 9,
                      background: GRADIENT, color: 'white',
                      cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: isLoading || !inputValue.trim() ? 0.5 : 1,
                      transition: 'all 0.2s',
                      boxShadow: `0 3px 10px ${PRIMARY}30`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && inputValue.trim())
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                  >
                    <Send size={15} />
                  </button>
                </form>
                <p style={{ fontSize: 9, color: '#cbd5e1', textAlign: 'center', marginTop: 5, letterSpacing: '0.3px' }}>
                  💬 HAVY FAQ AI · 🎙 STT credits tracked
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes chatSlideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes chatWave { 0%,100% { height:5px; opacity:0.5; } 50% { height:16px; opacity:1; } }
        @keyframes chatPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.4); } }
      `}</style>
    </>
  );
};

const hdrBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
  cursor: 'pointer', width: 28, height: 28, borderRadius: 7,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s', fontSize: 13,
};

export default ChatbotWidget;
