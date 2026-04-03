# 🤖 AI Chatbot Builder & Management - Complete Implementation Guide

A **production-ready guide** to add an AI-powered chatbot to ANY website or application. Works as a standalone feature!

---

## 📋 Table of Contents
1. [Quick Overview](#quick-overview)
2. [System Architecture](#system-architecture)
3. [Part 1: Backend Setup (Rasa + Node.js)](#part-1-backend-setup)
4. [Part 2: Database Setup (Optional - for FAQ Mode)](#part-2-database-setup)
5. [Part 3: Frontend Integration (React or Vanilla JS)](#part-3-frontend-integration)
6. [Part 4: Embeddable Widget for External Websites](#part-4-embeddable-widget)
7. [Part 5: Configuration & Customization](#part-5-configuration)
8. [Testing & Deployment](#testing--deployment)

---

## 📌 Quick Overview

**What this builds:**
- ✅ A floating chatbot widget (bottom-right/left corner)
- ✅ AI-powered responses from Rasa
- ✅ Customizable colors, position, business name
- ✅ Voice input (speech-to-text)
- ✅ Responsive & mobile-friendly
- ✅ Embeddable on external websites (copy-paste script)
- ✅ FAQ matching with confidence scores
- ✅ Usage analytics & logging

**Tech Stack:**
- **AI Engine**: Rasa (open-source NLU)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase) - optional
- **Frontend**: React (or Vanilla JS)
- **Styling**: Inline CSS (no dependencies)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Website/App                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Chatbot Widget (React Component or Vanilla JS)     │  │
│  │   ✓ Floating button, customizable position/color     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              │
┌─────────────────────────────────────────────────────────────┐
│              Backend Server (Node.js + Express)              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POST /chat-faq      (Question → Answer)             │  │
│  │  POST /transcribe    (Audio → Text)                  │  │
│  │  GET  /analytics     (Usage stats)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                    │                    │
                    │                    │
                    ▼                    ▼
          ┌──────────────────┐  ┌──────────────────┐
          │   Rasa Server    │  │  Database        │
          │  (Port 5005)     │  │  (PostgreSQL)    │
          │  - NLU Intent    │  │  - FAQ Logs      │
          │  - Responses     │  │  - Analytics     │
          │  - Custom Actions│  │                  │
          └──────────────────┘  └──────────────────┘
```

---

# Part 1: Backend Setup

## Step 1A: Install Rasa (AI Engine)

### On Windows:
```bash
# Create a project folder
mkdir chatbot-project
cd chatbot-project

# Create Python virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate

# Install Rasa
pip install rasa

# Verify installation
rasa --version
```

### On macOS/Linux:
```bash
mkdir chatbot-project
cd chatbot-project
python3 -m venv venv
source venv/bin/activate
pip install rasa
rasa --version
```

---

## Step 1B: Initialize Rasa Project

```bash
rasa init --no-prompt
```

This creates:
```
chatbot-project/
├── actions/
│   ├── __init__.py
│   └── actions.py
├── data/
│   ├── nlu.yml
│   ├── rules.yml
│   └── stories.yml
├── models/
├── tests/
├── config.yml
├── credentials.yml
├── domain.yml
├── endpoints.yml
└── README.md
```

---

## Step 1C: Configure NLU Training Data

Open **`data/nlu.yml`** and add training examples:

```yaml
version: "3.1"

nlu:
- intent: greet
  examples: |
    - Hey
    - Hello
    - Hi
    - Good morning
    - Hey there
    - What's up
    - Hiya

- intent: goodbye
  examples: |
    - Bye
    - Goodbye
    - See you
    - Take care
    - Farewell

- intent: ask_hours
  examples: |
    - What are your hours?
    - When are you open?
    - Are you open right now?
    - What time do you close?
    - Business hours?

- intent: ask_location
  examples: |
    - Where are you located?
    - What's your address?
    - Where can I find you?
    - Location?

- intent: ask_price
  examples: |
    - How much does it cost?
    - What's the price?
    - How much?
    - Pricing?
    - Cost?

- intent: ask_about_product
  examples: |
    - Tell me about your products
    - What products do you offer?
    - Product list?
    - What do you sell?

- intent: order
  examples: |
    - I want to buy something
    - Can I place an order?
    - I'd like to purchase
    - How do I order?

- intent: nlu_fallback
  examples: |
    - This is utterly raddulous
    - Zoigdflgfighw
    - Zzzzzzzzzzz
```

---

## Step 1D: Configure Rasa Domain

Open **`domain.yml`**:

```yaml
version: "3.1"

intents:
  - greet
  - goodbye
  - ask_hours
  - ask_location
  - ask_price
  - ask_about_product
  - order
  - nlu_fallback

entities: []

slots: {}

responses:
  utter_greet:
    - text: "Hey! 👋 How can I help you today?"
    - text: "Hi there! What can I do for you?"
    
  utter_goodbye:
    - text: "Goodbye! Have a great day! 👋"
    - text: "See you soon! Thanks for chatting!"
    
  utter_ask_hours:
    - text: "We're open Monday-Friday 9AM-6PM. Saturday 10AM-4PM."
    
  utter_ask_location:
    - text: "📍 We're located at 123 Business St, Your City, ST 12345"
    
  utter_ask_price:
    - text: "Our prices vary by product. Check our website for details!"
    
  utter_ask_about_product:
    - text: "We offer high-quality products at competitive prices. Visit our website to browse!"
    
  utter_ask_order:
    - text: "You can order through our website or call us!"
    
  utter_nlu_fallback:
    - text: "Sorry, I didn't understand that. Can you rephrase?"

session_config:
  session_expiration_time: 60
  carry_over_slots_to_new_session: true
```

---

## Step 1E: Configure Conversation Stories

Open **`data/stories.yml`**:

```yaml
version: "3.1"

stories:
- story: greet and goodbye
  steps:
    - intent: greet
    - action: utter_greet
    - intent: goodbye
    - action: utter_goodbye

- story: ask about hours
  steps:
    - intent: greet
    - action: utter_greet
    - intent: ask_hours
    - action: utter_ask_hours

- story: ask about location then product
  steps:
    - intent: ask_location
    - action: utter_ask_location
    - intent: ask_about_product
    - action: utter_ask_about_product

- story: ask about pricing
  steps:
    - intent: ask_price
    - action: utter_ask_price
    - intent: order
    - action: utter_ask_order
```

---

## Step 1F: Train Rasa Model

```bash
rasa train
```

This creates a trained model in `models/` folder.

---

## Step 1G: Start Rasa Server

In **Terminal 2** (leave Terminal 1 with venv active):

```bash
rasa run --enable-api --cors "*" --port 5005
```

You should see:
```
2024-03-29 10:15:32 INFO     rasa.core.processor  - Starting Rasa server...
2024-03-29 10:15:45 INFO     rasa.server  - Rasa server is up and running on http://0.0.0.0:5005
```

✅ **Rasa is ready!** Access it at `http://localhost:5005`

---

# Part 2: Database Setup (Optional - for FAQ Mode)

If you want to **store and search FAQs**, use this PostgreSQL schema:

```sql
-- Create FAQ table
CREATE TABLE IF NOT EXISTS faq_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(50),
  confidence FLOAT DEFAULT 0.9,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create FAQ logs (for analytics)
CREATE TABLE IF NOT EXISTS faq_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  matched BOOLEAN DEFAULT false,
  similarity_score FLOAT,
  source VARCHAR(50), -- 'faq', 'scraped', or 'fallback'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create chatbot config table
CREATE TABLE IF NOT EXISTS chatbot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE,
  chatbot_key VARCHAR(255) UNIQUE NOT NULL,
  business_name VARCHAR(255),
  position VARCHAR(20) DEFAULT 'bottom-right',
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  rasa_server_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_faq_business ON faq_documents(business_id);
CREATE INDEX idx_faq_logs_business ON faq_logs(business_id);
CREATE INDEX idx_chatbot_key ON chatbot_configs(chatbot_key);
```

---

# Part 3: Frontend Integration

## Option A: React Component (Recommended)

### Install Dependencies

```bash
npm install axios lucide-react
```

### Copy This Component

Create **`src/components/ChatbotWidget.tsx`**:

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Minimize2, Maximize2, Mic, MicOff, Bot } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotWidgetProps {
  chatbotKey: string;
  businessName?: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
}

const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  chatbotKey,
  businessName = 'Assistant',
  position = 'bottom-right',
  primaryColor = '#6366f1',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    sender: 'bot',
    timestamp: new Date(),
    text: `Hello! 👋 I'm ${businessName}. How can I help?`,
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call Rasa server
      const response = await fetch('http://localhost:5005/webhooks/rest/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const botText = data[0]?.text || "Sorry, I didn't understand that.";

      // Add bot message
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);

      // Log to analytics (optional)
      logChat(text.trim(), botText);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Connection error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Send audio to transcription API
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');

        try {
          const transcribeResponse = await fetch('YOUR_TRANSCRIBE_API_ENDPOINT', {
            method: 'POST',
            body: formData,
          });

          if (!transcribeResponse.ok) throw new Error('Transcription failed');

          const transcribeData = await transcribeResponse.json();
          const transcript = transcribeData.transcript;

          if (transcript) {
            await sendMessage(transcript);
          }
        } catch (error) {
          console.error('Transcription error:', error);
        } finally {
          setListening(false);
        }
      };

      mediaRecorder.start();
      mediaRef.current = mediaRecorder;
      setListening(true);
    } catch (error) {
      console.error('Microphone error:', error);
      alert('Please allow microphone access');
    }
  };

  const stopVoiceInput = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const logChat = async (question: string, answer: string) => {
    try {
      await fetch('/api/log-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatbot_key: chatbotKey, question, answer }),
      });
    } catch (error) {
      console.error('Logging error:', error);
    }
  };

  const position_styles: React.CSSProperties = position === 'bottom-right'
    ? { position: 'fixed', bottom: 20, right: 20 }
    : { position: 'fixed', bottom: 20, left: 20 };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            ...position_styles,
            zIndex: 9999,
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: 'none',
            background: primaryColor,
            color: 'white',
            fontSize: 24,
            cursor: 'pointer',
            boxShadow: `0 8px 20px ${primaryColor}66`,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Bot size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            ...position_styles,
            zIndex: 9999,
            width: 380,
            height: isMinimized ? 60 : 500,
            borderRadius: 16,
            overflow: 'hidden',
            background: 'white',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'height 0.3s',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: primaryColor,
              color: 'white',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                {businessName}'s Assistant
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.9 }}>
                ✓ Online
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 18,
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
                  fontSize: 18,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: msg.sender === 'user' ? primaryColor : '#f0f0f0',
                        color: msg.sender === 'user' ? 'white' : '#333',
                        wordWrap: 'break-word',
                        fontSize: 13,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: primaryColor,
                        animation: 'bounce 1.4s infinite',
                      }}
                    />
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: primaryColor,
                        animation: 'bounce 1.4s infinite',
                        animationDelay: '0.2s',
                      }}
                    />
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: primaryColor,
                        animation: 'bounce 1.4s infinite',
                        animationDelay: '0.4s',
                      }}
                    />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div
                style={{
                  borderTop: '1px solid #eee',
                  padding: '12px',
                  flexShrink: 0,
                }}
              >
                <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ask me anything…"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={listening ? stopVoiceInput : startVoiceInput}
                    style={{
                      background: listening ? '#ef4444' : primaryColor,
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      padding: '10px 12px',
                    }}
                  >
                    {listening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    style={{
                      background: primaryColor,
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      padding: '10px 12px',
                      opacity: isLoading ? 0.5 : 1,
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

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
};

export default ChatbotWidget;
```

### Use in Your App

```typescript
import ChatbotWidget from './components/ChatbotWidget';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      {/* Add chatbot */}
      <ChatbotWidget
        chatbotKey="your-unique-key"
        businessName="My Business"
        position="bottom-right"
        primaryColor="#6366f1"
      />
    </div>
  );
}

export default App;
```

---

## Option B: Vanilla JavaScript (No React)

If you're **not using React**, copy this HTML file:

Create **`chatbot-widget.html`**:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chatbot Widget</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    .chatbot-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white;
      font-size: 28px;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
      transition: transform 0.2s;
    }
    
    .chatbot-btn:hover { transform: scale(1.1); }
    .chatbot-btn.hidden { display: none; }
    
    .chatbot-window {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      height: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }
    
    .chatbot-window.hidden { display: none; }
    .chatbot-window.minimized { height: 60px; }
    
    .chatbot-header {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    
    .chatbot-header-left { display: flex; flex-direction: column; }
    .chatbot-header-left h3 { font-size: 14px; font-weight: 600; margin: 0; }
    .chatbot-header-left p { font-size: 12px; opacity: 0.9; margin: 4px 0 0 0; }
    
    .chatbot-controls { display: flex; gap: 8px; }
    .chatbot-controls button {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 18px;
    }
    
    .chatbot-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .chatbot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .message { display: flex; }
    .message.user { justify-content: flex-end; }
    
    .message-bubble {
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      word-wrap: break-word;
    }
    
    .message.user .message-bubble {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      color: white;
    }
    
    .message.bot .message-bubble {
      background: #f0f0f0;
      color: #333;
    }
    
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 12px;
    }
    
    .typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6366f1;
      animation: bounce 1.4s infinite;
    }
    
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    
    .chatbot-input-area {
      border-top: 1px solid #eee;
      padding: 12px;
      flex-shrink: 0;
      display: none;
    }
    
    .chatbot-window.minimized .chatbot-input-area { display: none !important; }
    .chatbot-window:not(.minimized) .chatbot-input-area { display: block; }
    
    .input-form {
      display: flex;
      gap: 8px;
    }
    
    .input-form input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
    }
    
    .input-form input:focus {
      border-color: #6366f1;
    }
    
    .input-form button {
      border: none;
      border-radius: 8px;
      background: #6366f1;
      color: white;
      cursor: pointer;
      padding: 10px 12px;
      font-size: 14px;
    }
    
    .input-form button:hover { background: #4f46e5; }
    .input-form button:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>

<!-- Chatbot Widget Container -->
<div class="chatbot-btn" id="chatbotBtn">💬</div>

<div class="chatbot-window hidden" id="chatbotWindow">
  <div class="chatbot-header">
    <div class="chatbot-header-left">
      <h3>Assistant</h3>
      <p>✓ Online</p>
    </div>
    <div class="chatbot-controls">
      <button id="minimizeBtn">⬇</button>
      <button id="closeBtn">✕</button>
    </div>
  </div>
  
  <div class="chatbot-body">
    <div class="chatbot-messages" id="messages"></div>
    <div class="chatbot-input-area">
      <form class="input-form" id="chatForm">
        <input 
          type="text" 
          id="messageInput" 
          placeholder="Ask me anything…"
          autocomplete="off"
        >
        <button type="submit">Send ➜</button>
      </form>
    </div>
  </div>
</div>

<script>
  // Configuration
  const RASA_SERVER = 'http://localhost:5005';
  const CHATBOT_KEY = 'your-unique-key';
  const BUSINESS_NAME = 'My Business';

  // DOM Elements
  const chatbotBtn = document.getElementById('chatbotBtn');
  const chatbotWindow = document.getElementById('chatbotWindow');
  const messagesContainer = document.getElementById('messages');
  const messageInput = document.getElementById('messageInput');
  const chatForm = document.getElementById('chatForm');
  const minimizeBtn = document.getElementById('minimizeBtn');
  const closeBtn = document.getElementById('closeBtn');

  // State
  let isOpen = false;
  let isMinimized = false;
  let isLoading = false;
  let messages = [];

  // Initialize
  function init() {
    addBotMessage(`Hello! 👋 I'm ${BUSINESS_NAME}. How can I help?`);
    setupEventListeners();
  }

  function setupEventListeners() {
    chatbotBtn.addEventListener('click', toggleChat);
    minimizeBtn.addEventListener('click', toggleMinimize);
    closeBtn.addEventListener('click', closeChat);
    chatForm.addEventListener('submit', handleSendMessage);
  }

  function toggleChat() {
    isOpen = !isOpen;
    chatbotWindow.classList.toggle('hidden');
    if (isOpen && !isMinimized) {
      messageInput.focus();
    }
    chatbotBtn.classList.toggle('hidden');
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    chatbotWindow.classList.toggle('minimized');
    minimizeBtn.textContent = isMinimized ? '⬆' : '⬇';
    if (!isMinimized) {
      messageInput.focus();
    }
  }

  function closeChat() {
    isOpen = false;
    isMinimized = false;
    chatbotWindow.classList.add('hidden');
    chatbotBtn.classList.remove('hidden');
    chatbotWindow.classList.remove('minimized');
    minimizeBtn.textContent = '⬇';
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || isLoading) return;

    // Add user message
    addUserMessage(text);
    messageInput.value = '';
    isLoading = true;

    try {
      // Call Rasa webhook
      const response = await fetch(`${RASA_SERVER}/webhooks/rest/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const botText = data[0]?.text || "Sorry, I didn't understand that.";
      addBotMessage(botText);

      // Optional: Log to your backend
      logMessage(text, botText);
    } catch (error) {
      console.error('Chat error:', error);
      addBotMessage('Connection error. Please try again.');
    } finally {
      isLoading = false;
    }
  }

  function addUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user';
    msgDiv.innerHTML = `<div class="message-bubble">${escapeHtml(text)}</div>`;
    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
  }

  function addBotMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot';
    msgDiv.innerHTML = `<div class="message-bubble">${escapeHtml(text)}</div>`;
    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  async function logMessage(question, answer) {
    try {
      await fetch('/api/log-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbot_key: CHATBOT_KEY,
          question,
          answer,
        }),
      });
    } catch (error) {
      console.error('Logging error:', error);
    }
  }

  // Start
  init();
</script>

</body>
</html>
```

---

# Part 4: Embeddable Widget for External Websites

This allows ANY website to add your chatbot with a **single script tag**.

Create **`public/chatbot-embed.js`**:

```javascript
(function() {
  "use strict";

  // Default configuration
  if (!window.ChatbotConfig) {
    console.warn('ChatbotConfig not found. Set window.ChatbotConfig before loading this script.');
    return;
  }

  const config = window.ChatbotConfig;
  const RASA_SERVER = config.rasaServerUrl || 'http://localhost:5005';
  const BUSINESS_NAME = config.businessName || 'Assistant';
  const POSITION = config.position || 'bottom-right';
  const PRIMARY_COLOR = config.primaryColor || '#6366f1';
  const CHATBOT_KEY = config.chatbotKey || '';

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #chatbot-widget * { box-sizing: border-box; margin: 0; padding: 0; }
    
    .chatbot-launcher {
      position: fixed;
      bottom: 20px;
      ${POSITION === 'bottom-left' ? 'left' : 'right'}: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${PRIMARY_COLOR}ee, ${PRIMARY_COLOR}99);
      border: none;
      color: white;
      font-size: 28px;
      cursor: pointer;
      z-index: 99999;
      box-shadow: 0 8px 24px ${PRIMARY_COLOR}66;
      transition: transform 0.2s;
    }
    
    .chatbot-launcher:hover { transform: scale(1.08); }
    .chatbot-launcher.hidden { display: none; }
    
    .chatbot-container {
      position: fixed;
      bottom: 20px;
      ${POSITION === 'bottom-left' ? 'left' : 'right'}: 20px;
      width: 380px;
      height: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
    }
    
    .chatbot-container.hidden { display: none; }
    .chatbot-container.minimized { height: 60px; }
    
    .chatbot-header {
      background: linear-gradient(135deg, ${PRIMARY_COLOR}f2, ${PRIMARY_COLOR}bb);
      color: white;
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    
    .chatbot-header-info h3 {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
    }
    
    .chatbot-header-info p {
      font-size: 11px;
      opacity: 0.9;
      margin: 3px 0 0 0;
    }
    
    .chatbot-controls {
      display: flex;
      gap: 6px;
    }
    
    .chatbot-controls button {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
    }
    
    .chatbot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .message-row { display: flex; margin-bottom: 8px; }
    .message-row.user { justify-content: flex-end; }
    
    .message-bubble {
      max-width: 75%;
      padding: 9px 13px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .message-row.user .message-bubble {
      background: linear-gradient(135deg, ${PRIMARY_COLOR}f2, ${PRIMARY_COLOR}bb);
      color: white;
    }
    
    .message-row.bot .message-bubble {
      background: #f0f0f0;
      color: #333;
      border: 1px solid #e2e8f0;
    }
    
    .typing { padding: 9px 13px; display: flex; gap: 4px; }
    .typing-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      animation: chatbot-bounce 1.1s infinite;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.15s; }
    .typing-dot:nth-child(3) { animation-delay: 0.3s; }
    
    @keyframes chatbot-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }
    
    .chatbot-input-wrapper {
      border-top: 1px solid #f0f0f0;
      padding: 10px;
      flex-shrink: 0;
      display: none;
    }
    
    .chatbot-container.minimized .chatbot-input-wrapper { display: none !important; }
    .chatbot-container:not(.minimized) .chatbot-input-wrapper { display: block; }
    
    .message-form {
      display: flex;
      gap: 7px;
    }
    
    .message-form input {
      flex: 1;
      padding: 9px 12px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 13px;
      outline: none;
      background: #f8faff;
    }
    
    .message-form input:focus {
      border-color: ${PRIMARY_COLOR};
      background: white;
    }
    
    .message-form button {
      border: none;
      border-radius: 10px;
      background: ${PRIMARY_COLOR};
      color: white;
      cursor: pointer;
      padding: 9px 11px;
      font-size: 14px;
      font-weight: 500;
    }
    
    .message-form button:hover { opacity: 0.9; }
    .message-form button:disabled { opacity: 0.5; cursor: not-allowed; }
  `;
  document.head.appendChild(styleEl);

  // Create DOM
  const wrapper = document.createElement('div');
  wrapper.id = 'chatbot-widget';
  document.body.appendChild(wrapper);

  const launcher = document.createElement('button');
  launcher.className = 'chatbot-launcher';
  launcher.innerHTML = '💬';
  launcher.setAttribute('aria-label', 'Open chatbot');
  wrapper.appendChild(launcher);

  const container = document.createElement('div');
  container.className = 'chatbot-container hidden';
  wrapper.appendChild(container);

  const header = document.createElement('div');
  header.className = 'chatbot-header';
  header.innerHTML = `
    <div class="chatbot-header-info">
      <h3>${BUSINESS_NAME}</h3>
      <p>✓ Online</p>
    </div>
    <div class="chatbot-controls">
      <button id="minimize-btn" style="padding: 4px 8px;">_</button>
      <button id="close-btn" style="padding: 4px 8px;">✕</button>
    </div>
  `;
  container.appendChild(header);

  const messagesDiv = document.createElement('div');
  messagesDiv.className = 'chatbot-messages';
  container.appendChild(messagesDiv);

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'chatbot-input-wrapper';
  inputWrapper.innerHTML = `
    <form class="message-form" id="message-form">
      <input type="text" id="message-input" placeholder="Ask me anything…" autocomplete="off" />
      <button type="submit">→</button>
    </form>
  `;
  container.appendChild(inputWrapper);

  // State
  let isOpen = false;
  let isMinimized = false;
  let isLoading = false;

  // Event listeners
  launcher.addEventListener('click', () => {
    isOpen = !isOpen;
    container.classList.toggle('hidden');
    launcher.classList.toggle('hidden');
    if (isOpen && !isMinimized) {
      document.getElementById('message-input').focus();
    }
  });

  document.getElementById('minimize-btn').addEventListener('click', () => {
    isMinimized = !isMinimized;
    container.classList.toggle('minimized');
    document.getElementById('minimize-btn').textContent = isMinimized ? '⬆' : '_';
  });

  document.getElementById('close-btn').addEventListener('click', () => {
    isOpen = false;
    isMinimized = false;
    container.classList.add('hidden');
    launcher.classList.remove('hidden');
  });

  document.getElementById('message-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text || isLoading) return;

    // User message
    const userMsg = document.createElement('div');
    userMsg.className = 'message-row user';
    userMsg.innerHTML = `<div class="message-bubble">${text}</div>`;
    messagesDiv.appendChild(userMsg);
    input.value = '';
    isLoading = true;

    try {
      const response = await fetch(`${RASA_SERVER}/webhooks/rest/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();
      const botText = data[0]?.text || 'Sorry, I did not understand that.';

      // Bot message
      const botMsg = document.createElement('div');
      botMsg.className = 'message-row bot';
      botMsg.innerHTML = `<div class="message-bubble">${botText}</div>`;
      messagesDiv.appendChild(botMsg);
    } catch (error) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'message-row bot';
      errorMsg.innerHTML = `<div class="message-bubble">Connection error. Please try again.</div>`;
      messagesDiv.appendChild(errorMsg);
    } finally {
      isLoading = false;
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  });

  // Add initial message
  const initMsg = document.createElement('div');
  initMsg.className = 'message-row bot';
  initMsg.innerHTML = `<div class="message-bubble">Hello! 👋 I'm here to help. What can I do for you?</div>`;
  messagesDiv.appendChild(initMsg);
})();
```

### How to use on ANY website:

```html
<script>
  window.ChatbotConfig = {
    rasaServerUrl: 'https://your-rasa-server.com',
    businessName: 'My Company',
    position: 'bottom-right',
    primaryColor: '#6366f1',
    chatbotKey: 'unique-key-123'
  };
</script>
<script src="https://your-domain.com/chatbot-embed.js" async></script>
```

**That's it!** Drop this on ANY website and the chatbot appears!

---

# Part 5: Configuration & Customization

## Configuration Options

```javascript
window.ChatbotConfig = {
  // Required
  chatbotKey: 'unique-key-xxxx',
  
  // Optional
  businessName: 'My Business',                // Default: 'Assistant'
  rasaServerUrl: 'http://localhost:5005',    // Default: localhost:5005
  position: 'bottom-right',                  // 'bottom-right' or 'bottom-left'
  primaryColor: '#6366f1',                   // Any hex color
  
  // Advanced
  supabaseUrl: 'https://...',               // For logging
  supabaseKey: 'anon-key',                  // For logging
  enableVoice: true,                        // Enable mic input
  enableAnalytics: true,                    // Log conversations
};
```

## Customizing Colors

```javascript
// Indigo
primaryColor: '#6366f1'

// Blue
primaryColor: '#3b82f6'

// Green
primaryColor: '#10b981'

// Red
primaryColor: '#ef4444'

// Orange
primaryColor: '#f97316'
```

## Customizing Position

```javascript
// Bottom right
position: 'bottom-right'

// Bottom left
position: 'bottom-left'
```

---

# Testing & Deployment

## Local Testing

1. **Terminal 1** - Start Rasa:
```bash
cd chatbot-project
venv\Scripts\activate
rasa run --enable-api --cors "*" --port 5005
```

2. **Terminal 2** - Start your app (React):
```bash
npm run dev
```

3. Open `http://localhost:5173` and test the chatbot

## Testing the Embeddable Widget

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Chatbot</title>
  <style>
    body { font-family: Arial; margin: 0; padding: 20px; }
    h1 { color: #333; }
    p { line-height: 1.6; color: #666; max-width: 600px; }
  </style>
</head>
<body>
  <h1>Welcome to My Website</h1>
  <p>This page demonstrates the embedded chatbot widget. Click the chat button in the corner to talk with our AI assistant!</p>

  <script>
    window.ChatbotConfig = {
      chatbotKey: 'test-key',
      businessName: 'Test Business',
      rasaServerUrl: 'http://localhost:5005',
      position: 'bottom-right',
      primaryColor: '#6366f1'
    };
  </script>
  <script src="http://localhost:5173/chatbot-embed.js" async></script>
</body>
</html>
```

## Production Deployment

### Deploy Rasa

```bash
# Build Docker image
docker build -t my-rasa-chatbot .

# Push to registry (Docker Hub, AWS ECR, etc.)
docker tag my-rasa-chatbot myregistry/my-rasa-chatbot:latest
docker push myregistry/my-rasa-chatbot:latest

# Deploy to cloud (Heroku, AWS, GCP, etc.)
```

### Deploy Frontend

```bash
# Build for production
npm run build

# Deploy to Vercel, Netlify, or your server
vercel deploy
```

### Update Embed Script URL

```javascript
window.ChatbotConfig = {
  rasaServerUrl: 'https://rasa.yourdomain.com',    // Production Rasa server
  // ...
};
```

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| **Chatbot not responding** | Check if Rasa server is running: `http://localhost:5005/` |
| **CORS errors** | Make sure Rasa runs with `--cors "*"` flag |
| **Rasa won't start** | Try: `pip install --upgrade rasa` |
| **Microphone not working** | Site must be HTTPS or localhost |
| **Widget not appearing** | Check browser console for JavaScript errors |

---

## Next Steps

1. ✅ Set up Rasa backend
2. ✅ Add chatbot component to your app
3. ✅ Generate embeddable script
4. ✅ Deploy to production
5. **Enhance NLU** - Add more training data for better responses
6. **Add Database** - Log conversations for analytics
7. **Add Custom Actions** - Connect to your business logic
8. **Monitor** - Track usage and improve responses

---

## Full Example Project Structure

```
my-chatbot-project/
├── rasa-backend/
│   ├── data/
│   │   ├── nlu.yml
│   │   ├── stories.yml
│   │   └── rules.yml
│   ├── actions/
│   │   └── actions.py
│   ├── config.yml
│   ├── credentials.yml
│   ├── domain.yml
│   ├── endpoints.yml
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ChatbotWidget.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── chatbot-embed.js
│   └── package.json
│
├── docs/
│   └── IMPLEMENTATION_GUIDE.md
│
└── README.md
```

---

## Support & Resources

- **Rasa Docs**: https://rasa.com/docs/
- **Rasa Forum**: https://github.com/RasaHQ/rasa/discussions
- **Custom NLU Training**: https://rasa.com/docs/rasa/nlu-guide/

---

**You now have everything needed to add a production-ready AI chatbot to ANY project!** 🎉

