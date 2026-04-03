/**
 * STANDALONE REACT CHATBOT COMPONENT
 * 
 * Copy-paste this into your React project!
 * 
 * Installation:
 * npm install axios lucide-react
 * 
 * Usage:
 * import ChatbotWidget from './ChatbotWidget';
 * 
 * <ChatbotWidget
 *   rasaServerUrl="http://localhost:5005"
 *   businessName="My Business"
 *   position="bottom-right"
 *   primaryColor="#6366f1"
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Minimize2, Maximize2, Mic, MicOff, Bot } from 'lucide-react';

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
  onStatusChange?: (status: 'open' | 'closed' | 'minimized') => void;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  rasaServerUrl,
  businessName = 'Assistant',
  position = 'bottom-right',
  primaryColor = '#6366f1',
  chatbotKey = 'default',
  onStatusChange,
}) => {
  // === STATE ===
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      timestamp: new Date(),
      text: `Hello! 👋 I'm ${businessName}'s assistant. How can I help?`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // === REFS ===
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // === EFFECTS ===
  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Notify parent of status changes
  useEffect(() => {
    if (!onStatusChange) return;
    if (isOpen) {
      onStatusChange(isMinimized ? 'minimized' : 'open');
    } else {
      onStatusChange('closed');
    }
  }, [isOpen, isMinimized, onStatusChange]);

  // === MESSAGE HANDLERS ===
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
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
      // Call Rasa webhook
      const response = await fetch(`${rasaServerUrl}/webhooks/rest/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const botText =
        data[0]?.text || "Sorry, I didn't understand that. Can you rephrase?";

      // Add bot message
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);

      // Log to backend (optional)
      logMessage(text.trim(), botText);
    } catch (error) {
      console.error('[ChatBot] Error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Connection error. Please check your internet and try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendClick = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // === VOICE INPUT ===
  const startVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });

        // Send to transcription API (implement based on your backend)
        // For now, just show a placeholder
        console.log('[ChatBot] Audio recorded, size:', audioBlob.size);
        setIsListening(false);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
    } catch (error) {
      console.error('[ChatBot] Microphone error:', error);
      alert('Microphone access denied. Please allow access in your browser.');
    }
  };

  const stopVoiceInput = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  const logMessage = async (question: string, answer: string) => {
    try {
      // Optional: Send to your backend for analytics
      // await fetch('/api/log-chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ chatbot_key: chatbotKey, question, answer }),
      // });
    } catch (error) {
      console.error('[ChatBot] Logging error:', error);
    }
  };

  // === STYLING ===
  const positionStyles: React.CSSProperties =
    position === 'bottom-right'
      ? { right: 20, bottom: 20 }
      : { left: 20, bottom: 20 };

  const gradientBg = `linear-gradient(135deg, ${primaryColor}f2, ${primaryColor}bb)`;

  // === RENDER ===
  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chatbot-launcher"
          aria-label="Open assistant"
          style={{
            position: 'fixed',
            ...positionStyles,
            zIndex: 9999,
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: gradientBg,
            border: 'none',
            color: 'white',
            fontSize: 28,
            cursor: 'pointer',
            boxShadow: `0 8px 28px -4px ${primaryColor}66, 0 2px 8px rgba(0,0,0,0.18)`,
            transition: 'transform 0.22s, box-shadow 0.22s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Bot size={32} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="chatbot-window"
          style={{
            position: 'fixed',
            ...positionStyles,
            zIndex: 9999,
            width: 380,
            height: isMinimized ? 62 : 580,
            borderRadius: 18,
            overflow: 'hidden',
            background: 'white',
            boxShadow: '0 24px 80px -12px rgba(0,0,0,0.32), 0 4px 16px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'height 0.28s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: gradientBg,
              color: 'white',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                {businessName}'s Assistant
              </h3>
              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: 11,
                  opacity: 0.9,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    background: '#34d399',
                    borderRadius: '50%',
                    animation: 'pulse 1.3s ease-in-out infinite',
                  }}
                />
                Online · Instant replies
              </p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: '4px 8px',
                  borderRadius: 6,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {isMinimized ? '⬆' : '⬇'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: '4px 8px',
                  borderRadius: 6,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: 'linear-gradient(180deg, #f5f7ff 0%, #fff 60%)',
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      animation: 'fadeIn 0.22s ease-out',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '78%',
                        padding: '9px 13px',
                        borderRadius: 16,
                        fontSize: 13.5,
                        lineHeight: 1.5,
                        wordWrap: 'break-word',
                        background:
                          msg.sender === 'user'
                            ? gradientBg
                            : 'white',
                        color: msg.sender === 'user' ? 'white' : '#1e293b',
                        border:
                          msg.sender === 'bot'
                            ? '1px solid #e8ecf4'
                            : 'none',
                        borderBottomRightRadius:
                          msg.sender === 'user' ? 3 : 16,
                        borderBottomLeftRadius:
                          msg.sender === 'bot' ? 3 : 16,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: primaryColor,
                          animation: `bounce 1.1s infinite`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div
                style={{
                  borderTop: '1px solid #f0f2f8',
                  background: 'white',
                  padding: '9px 12px',
                  flexShrink: 0,
                }}
              >
                <form
                  onSubmit={handleSendClick}
                  style={{
                    display: 'flex',
                    gap: 7,
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ask me anything…"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '9px 13px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 12,
                      fontSize: 13.5,
                      outline: 'none',
                      background: '#f8faff',
                      color: '#1e293b',
                      transition: 'border 0.2s, background 0.2s',
                      cursor: isLoading ? 'not-allowed' : 'text',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = primaryColor;
                      e.currentTarget.style.background = 'white';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8faff';
                    }}
                  />

                  <button
                    type="button"
                    onClick={
                      isListening ? stopVoiceInput : startVoiceInput
                    }
                    style={{
                      padding: '9px 11px',
                      border: 'none',
                      borderRadius: 12,
                      background: isListening ? '#ef4444' : primaryColor,
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {isListening ? (
                      <MicOff size={18} />
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    style={{
                      padding: '9px 11px',
                      border: 'none',
                      borderRadius: 12,
                      background: gradientBg,
                      color: 'white',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isLoading ? 0.45 : 1,
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.transform = 'scale(1.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-6px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </>
  );
};

export default ChatbotWidget;
