/**
 * STANDALONE RASA CHATBOT WIDGET - EMBEDDABLE SCRIPT
 * 
 * Drop this into ANY website. No framework required!
 * 
 * Usage:
 * In your HTML <head> or before </body>:
 * 
 * <script>
 *   window.ChatbotConfig = {
 *     rasaServerUrl: 'https://your-rasa-server.com',
 *     businessName: 'My Business',
 *     position: 'bottom-right',
 *     primaryColor: '#6366f1'
 *   };
 * </script>
 * <script src="path/to/chatbot-embed.js" async></script>
 */

(function() {
  "use strict";

  // Validate configuration
  if (!window.ChatbotConfig) {
    console.error('[ChatBot] ChatbotConfig not found. Set window.ChatbotConfig before loading this script.');
    return;
  }

  const config = window.ChatbotConfig;
  const RASA_SERVER = config.rasaServerUrl || 'http://localhost:5005';
  const BUSINESS_NAME = config.businessName || 'Assistant';
  const POSITION = config.position || 'bottom-right';
  const PRIMARY_COLOR = config.primaryColor || '#6366f1';
  const CHATBOT_KEY = config.chatbotKey || 'default';
  const ENABLE_VOICE = config.enableVoice !== false;

  console.log('[ChatBot] Initializing with:', { BUSINESS_NAME, RASA_SERVER });

  // ============ INJECT STYLES ============
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    #chatbot-root * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .cb-launcher {
      position: fixed;
      bottom: 20px;
      ${POSITION === 'bottom-left' ? 'left' : 'right'}: 20px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${PRIMARY_COLOR}ee, ${PRIMARY_COLOR}99);
      border: none;
      color: white;
      font-size: 32px;
      cursor: pointer;
      z-index: 99999;
      box-shadow: 0 8px 28px -4px ${PRIMARY_COLOR}66, 0 2px 8px rgba(0,0,0,0.18);
      transition: transform 0.22s, box-shadow 0.22s;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cb-launcher:hover {
      transform: scale(1.08);
      box-shadow: 0 12px 36px -4px ${PRIMARY_COLOR}66, 0 2px 8px rgba(0,0,0,0.2);
    }

    .cb-launcher.hidden {
      display: none !important;
    }

    .cb-container {
      position: fixed;
      bottom: 20px;
      ${POSITION === 'bottom-left' ? 'left' : 'right'}: 20px;
      width: 380px;
      height: 580px;
      background: white;
      border-radius: 18px;
      box-shadow: 0 24px 80px -12px rgba(0,0,0,0.32), 0 4px 16px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      transition: height 0.28s ease;
    }

    .cb-container.hidden {
      display: none !important;
    }

    .cb-container.minimized {
      height: 62px;
    }

    .cb-header {
      background: linear-gradient(135deg, ${PRIMARY_COLOR}f2, ${PRIMARY_COLOR}bb);
      color: white;
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .cb-header-info {
      display: flex;
      flex-direction: column;
    }

    .cb-header-info h3 {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
      line-height: 1.3;
    }

    .cb-header-info p {
      font-size: 11px;
      opacity: 0.9;
      margin: 3px 0 0 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .cb-status-dot {
      width: 6px;
      height: 6px;
      background: #34d399;
      border-radius: 50%;
      animation: cb-ping 1.3s ease-in-out infinite;
    }

    @keyframes cb-ping {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .cb-controls {
      display: flex;
      gap: 4px;
    }

    .cb-controls button {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.2s;
    }

    .cb-controls button:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    .cb-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .cb-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: linear-gradient(180deg, #f5f7ff 0%, #fff 60%);
    }

    .cb-messages::-webkit-scrollbar {
      width: 6px;
    }

    .cb-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .cb-messages::-webkit-scrollbar-thumb {
      background: #ddd;
      border-radius: 3px;
    }

    .cb-msg-row {
      display: flex;
      align-items: flex-end;
      gap: 7px;
      animation: cb-fade-in 0.22s ease-out;
    }

    .cb-msg-row.user {
      flex-direction: row-reverse;
    }

    @keyframes cb-fade-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .cb-msg-bubble {
      max-width: 78%;
      padding: 9px 13px;
      border-radius: 16px;
      font-size: 13.5px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .cb-msg-row.user .cb-msg-bubble {
      background: linear-gradient(135deg, ${PRIMARY_COLOR}f2, ${PRIMARY_COLOR}bb);
      color: white;
      border-bottom-right-radius: 3px;
    }

    .cb-msg-row.bot .cb-msg-bubble {
      background: white;
      color: #1e293b;
      border: 1px solid #e8ecf4;
      border-bottom-left-radius: 3px;
    }

    .cb-typing {
      display: flex;
      gap: 4px;
      padding: 9px 13px;
      width: fit-content;
      background: white;
      border: 1px solid #e8ecf4;
      border-radius: 16px;
      border-bottom-left-radius: 3px;
    }

    .cb-typing-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      animation: cb-bounce 1.1s infinite;
    }

    .cb-typing-dot:nth-child(2) {
      animation-delay: 0.15s;
    }

    .cb-typing-dot:nth-child(3) {
      animation-delay: 0.3s;
    }

    @keyframes cb-bounce {
      0%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-6px);
      }
    }

    .cb-input-area {
      border-top: 1px solid #f0f2f8;
      background: white;
      padding: 9px 12px;
      flex-shrink: 0;
      display: none;
    }

    .cb-container.minimized .cb-input-area {
      display: none !important;
    }

    .cb-container:not(.minimized) .cb-input-area {
      display: block;
    }

    .cb-form {
      display: flex;
      gap: 7px;
    }

    .cb-form input {
      flex: 1;
      padding: 9px 13px;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      font-size: 13.5px;
      outline: none;
      background: #f8faff;
      color: #1e293b;
      transition: border 0.2s, background 0.2s;
      font-family: inherit;
    }

    .cb-form input::placeholder {
      color: #94a3b8;
    }

    .cb-form input:focus {
      border-color: ${PRIMARY_COLOR};
      background: white;
    }

    .cb-form button {
      padding: 9px 11px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, ${PRIMARY_COLOR}f2, ${PRIMARY_COLOR}bb);
      color: white;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s, opacity 0.15s;
    }

    .cb-form button:hover {
      transform: scale(1.08);
    }

    .cb-form button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }

    .cb-footer {
      font-size: 10px;
      color: #cbd5e1;
      text-align: center;
      margin-top: 5px;
      letter-spacing: 0.02em;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .cb-container {
        width: 100%;
        height: 100vh;
        bottom: 0;
        ${POSITION === 'bottom-left' ? 'left' : 'right'}: 0;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // ============ CREATE DOM ELEMENTS ============
  const root = document.createElement('div');
  root.id = 'chatbot-root';
  root.style.cssText = 'position: fixed; z-index: 99998; top: 0; left: 0; width: 0; height: 0; pointer-events: none;';
  document.body.appendChild(root);

  const launcher = document.createElement('button');
  launcher.className = 'cb-launcher';
  launcher.setAttribute('aria-label', 'Open assistant');
  launcher.innerHTML = '💬';
  root.appendChild(launcher);

  const container = document.createElement('div');
  container.className = 'cb-container hidden';
  root.appendChild(container);

  const header = document.createElement('div');
  header.className = 'cb-header';
  header.innerHTML = `
    <div class="cb-header-info">
      <h3>${escapeHtml(BUSINESS_NAME)}'s Assistant</h3>
      <p><span class="cb-status-dot"></span> Online · Instant replies</p>
    </div>
    <div class="cb-controls">
      <button id="cb-minimize-btn" aria-label="Minimize">⬇</button>
      <button id="cb-close-btn" aria-label="Close">✕</button>
    </div>
  `;
  container.appendChild(header);

  const messagesDiv = document.createElement('div');
  messagesDiv.className = 'cb-messages';
  container.appendChild(messagesDiv);

  const inputArea = document.createElement('div');
  inputArea.className = 'cb-input-area';
  inputArea.innerHTML = `
    <form class="cb-form" id="cb-form">
      <input
        type="text"
        id="cb-input"
        placeholder="Ask me anything…"
        autocomplete="off"
        aria-label="Message input"
      />
      <button type="submit" aria-label="Send message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </form>
    <p class="cb-footer">Powered by HAVY · Secure & Private</p>
  `;
  container.appendChild(inputArea);

  // ============ STATE ============
  let isOpen = false;
  let isMinimized = false;
  let isLoading = false;

  // ============ EVENT LISTENERS ============
  launcher.addEventListener('click', () => {
    isOpen = !isOpen;
    container.classList.toggle('hidden');
    launcher.classList.toggle('hidden');
    if (isOpen && !isMinimized) {
      setTimeout(() => document.getElementById('cb-input').focus(), 50);
    }
  });

  document.getElementById('cb-minimize-btn').addEventListener('click', () => {
    isMinimized = !isMinimized;
    container.classList.toggle('minimized');
    document.getElementById('cb-minimize-btn').textContent = isMinimized ? '⬆' : '⬇';
    if (!isMinimized) {
      setTimeout(() => document.getElementById('cb-input').focus(), 50);
    }
  });

  document.getElementById('cb-close-btn').addEventListener('click', () => {
    isOpen = false;
    isMinimized = false;
    container.classList.add('hidden');
    launcher.classList.remove('hidden');
    document.getElementById('cb-minimize-btn').textContent = '⬇';
  });

  document.getElementById('cb-form').addEventListener('submit', handleSendMessage);

  // ============ MESSAGE HANDLERS ============
  async function handleSendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('cb-input');
    const text = input.value.trim();

    if (!text || isLoading) return;

    // Add user message
    addMessage(text, 'user');
    input.value = '';
    isLoading = true;

    // Show typing indicator
    showTyping();

    try {
      const response = await fetch(`${RASA_SERVER}/webhooks/rest/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const botText = data[0]?.text || "Sorry, I didn't understand that. Can you rephrase?";

      // Remove typing indicator and add bot message
      removeTyping();
      addMessage(botText, 'bot');

      // Log to analytics (optional)
      logMessage(text, botText);
    } catch (error) {
      console.error('[ChatBot] Error:', error);
      removeTyping();
      addMessage('Connection error. Please check your internet and try again.', 'bot');
    } finally {
      isLoading = false;
    }
  }

  function addMessage(text, sender) {
    const row = document.createElement('div');
    row.className = `cb-msg-row ${sender}`;

    const bubble = document.createElement('div');
    bubble.className = 'cb-msg-bubble';
    bubble.textContent = text;

    row.appendChild(bubble);
    messagesDiv.appendChild(row);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function showTyping() {
    const row = document.createElement('div');
    row.className = 'cb-msg-row bot';
    row.id = 'cb-typing-row';

    const typing = document.createElement('div');
    typing.className = 'cb-typing';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'cb-typing-dot';
      typing.appendChild(dot);
    }

    row.appendChild(typing);
    messagesDiv.appendChild(row);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function removeTyping() {
    const typing = document.getElementById('cb-typing-row');
    if (typing) typing.remove();
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
    // Optionally send analytics to your backend
    try {
      // await fetch('/api/log-chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ chatbot_key: CHATBOT_KEY, question, answer }),
      // });
    } catch (error) {
      console.error('[ChatBot] Logging error:', error);
    }
  }

  // ============ INITIALIZE ============
  addMessage(`Hello! 👋 I'm ${BUSINESS_NAME}'s assistant. How can I help today?`, 'bot');
  console.log('[ChatBot] Ready!');
})();
