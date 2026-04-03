/**
 * BEAUTIFUL STANDALONE RASA CHATBOT WIDGET - IMPROVED VERSION
 * 
 * Usage:
 * <ChatbotWidget
 *   rasaServerUrl="http://localhost:5005"
 *   businessName="My Business"
 *   position="bottom-right"
 *   primaryColor="#6366f1"
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Minimize2, Maximize2, Mic, MicOff, Bot, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotWidgetProps {
  rasaServerUrl: string;
  businessName?: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  chatbotKey?: string;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  rasaServerUrl,
  businessName = 'Assistant',
  position = 'bottom-right',
  primaryColor = '#6366f1',
  chatbotKey = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      timestamp: new Date(),
      text: `👋 Hey there! I'm ${businessName}'s Assistant. Ask me anything about our products, services, pricing, delivery, or anything else!`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${rasaServerUrl}/webhooks/rest/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!response.ok) throw new Error('Connection failed');

      const data = await response.json();
      const botText = data[0]?.text || "Hmm, I didn't quite catch that. Could you rephrase?";

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: '⚠️ Connection issue. Please check your internet or try again in a moment.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const positionStyles: React.CSSProperties =
    position === 'bottom-right'
      ? { right: 24, bottom: 24 }
      : { left: 24, bottom: 24 };

  const gradientBg = `linear-gradient(135deg, ${primaryColor}f5, ${primaryColor}dd)`;
  const hoverGradient = `linear-gradient(135deg, ${primaryColor}ff, ${primaryColor}ee)`;

  return (
    <>
      {/* LAUNCHER BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            ...positionStyles,
            zIndex: 9999,
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: gradientBg,
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            boxShadow: `0 10px 40px ${primaryColor}40, 0 0 0 0 ${primaryColor}20`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            fontSize: 24,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.12) translateY(-4px)';
            e.currentTarget.style.boxShadow = `0 20px 50px ${primaryColor}50, 0 0 20px ${primaryColor}30`;
            e.currentTarget.style.background = hoverGradient;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = `0 10px 40px ${primaryColor}40, 0 0 0 0 ${primaryColor}20`;
            e.currentTarget.style.background = gradientBg;
          }}
        >
          <MessageCircle size={36} />
        </button>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            ...positionStyles,
            zIndex: 9999,
            width: 420,
            height: isMinimized ? 68 : 650,
            borderRadius: 24,
            overflow: 'hidden',
            background: 'white',
            boxShadow: `0 25px 100px -10px rgba(0,0,0,0.3), 0 0 40px -10px rgba(0,0,0,0.1)`,
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* HEADER */}
          <div
            style={{
              background: gradientBg,
              color: 'white',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              borderBottom: `1px solid ${primaryColor}20`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
              >
                🤖
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: '700', letterSpacing: '-0.3px' }}>
                  {businessName}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    opacity: 0.95,
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      background: '#4ade80',
                      borderRadius: '50%',
                      display: 'inline-block',
                    }}
                  />
                  Online · Always here
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  fontSize: 18,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                }}
              >
                {isMinimized ? '⬆' : '⬇'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  fontSize: 18,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* MESSAGES */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  background: 'linear-gradient(180deg, #f8faff 0%, #fff 50%, #fff 100%)',
                  scrollBehavior: 'smooth',
                }}
              >
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      animation: `slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.05}s both`,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        padding: msg.sender === 'user' ? '11px 16px' : '11px 16px',
                        borderRadius: 18,
                        fontSize: 14,
                        lineHeight: 1.5,
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        background:
                          msg.sender === 'user'
                            ? gradientBg
                            : 'white',
                        color: msg.sender === 'user' ? 'white' : '#1e293b',
                        border: msg.sender === 'bot' ? `1px solid ${primaryColor}15` : 'none',
                        boxShadow:
                          msg.sender === 'user'
                            ? `0 4px 16px ${primaryColor}25`
                            : '0 2px 8px rgba(0,0,0,0.06)',
                        fontWeight: msg.sender === 'user' ? '500' : '400',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 8,
                          height: 20,
                          borderRadius: 4,
                          background: primaryColor,
                          animation: `wave 0.8s ease-in-out ${i * 0.1}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* INPUT */}
              <div
                style={{
                  borderTop: `1px solid ${primaryColor}10`,
                  background: 'white',
                  padding: 14,
                  flexShrink: 0,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <form onSubmit={handleSend} style={{ display: 'flex', gap: 10 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type your message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '11px 16px',
                      border: `2px solid ${primaryColor}15`,
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      background: '#f8faff',
                      color: '#1e293b',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit',
                      fontWeight: '500',
                      cursor: isLoading ? 'not-allowed' : 'text',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.boxShadow = `0 0 12px ${primaryColor}20`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = `${primaryColor}15`;
                      e.currentTarget.style.background = '#f8faff';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    style={{
                      padding: '11px 14px',
                      border: 'none',
                      borderRadius: 12,
                      background: gradientBg,
                      color: 'white',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isLoading || !inputValue.trim() ? 0.5 : 1,
                      transition: 'all 0.2s',
                      fontSize: 16,
                      fontWeight: '600',
                      boxShadow: `0 4px 12px ${primaryColor}25`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && inputValue.trim()) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 8px 20px ${primaryColor}35`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${primaryColor}25`;
                    }}
                  >
                    <Send size={18} />
                  </button>
                </form>

                <div
                  style={{
                    fontSize: 10,
                    color: '#cbd5e1',
                    textAlign: 'center',
                    marginTop: 8,
                    letterSpacing: '0.5px',
                    fontWeight: '500',
                  }}
                >
                  💬 Powered by AI
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* STYLES */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wave {
          0%, 100% {
            height: 8px;
            opacity: 0.5;
          }
          50% {
            height: 20px;
            opacity: 1;
          }
        }

        /* Scrollbar styling */
        div::-webkit-scrollbar {
          width: 6px;
        }
        
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        
        div::-webkit-scrollbar-thumb {
          background: ${primaryColor}30;
          border-radius: 3px;
        }
        
        div::-webkit-scrollbar-thumb:hover {
          background: ${primaryColor}50;
        }
      `}</style>
    </>
  );
};

export default ChatbotWidget;
