/**
 * BEAUTIFUL CHATBOT WIDGET - VANILLA JS EMBED SCRIPT
 * 
 * Installation:
 * <script src="https://your-domain.com/beautiful-chatbot-embed.js"></script>
 * <script>
 *   window.ChatbotWidget({
 *     rasaServerUrl: 'http://localhost:5005',
 *     businessName: 'My Business',
 *     primaryColor: '#6366f1',
 *     position: 'bottom-right'
 *   });
 * </script>
 */

(function () {
  window.ChatbotWidget = function (config = {}) {
    const {
      rasaServerUrl = 'http://localhost:5005',
      businessName = 'Assistant',
      primaryColor = '#6366f1',
      position = 'bottom-right',
      chatbotKey = 'default',
    } = config;

    const state = {
      isOpen: false,
      isMinimized: false,
      messages: [
        {
          id: '1',
          sender: 'bot',
          text: `👋 Hey there! I'm ${businessName}'s Assistant. Ask me anything about our products, services, pricing, delivery, or anything else!`,
          timestamp: new Date().toISOString(),
        },
      ],
      isLoading: false,
    };

    // Inject styles
    const styles = `
      .chatbot-launcher {
        position: fixed;
        ${position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
        bottom: 24px;
        z-index: 9999;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${primaryColor}f5, ${primaryColor}dd);
        border: none;
        color: white;
        cursor: pointer;
        box-shadow: 0 10px 40px ${primaryColor}40, 0 0 0 0 ${primaryColor}20;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 28px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .chatbot-launcher:hover {
        transform: scale(1.12) translateY(-4px);
        box-shadow: 0 20px 50px ${primaryColor}50, 0 0 20px ${primaryColor}30;
        background: linear-gradient(135deg, ${primaryColor}ff, ${primaryColor}ee);
      }

      .chatbot-launcher.hidden {
        display: none;
      }

      .chatbot-window {
        position: fixed;
        ${position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
        bottom: 24px;
        z-index: 9999;
        width: 420px;
        height: 650px;
        border-radius: 24px;
        overflow: hidden;
        background: white;
        box-shadow: 0 25px 100px -10px rgba(0,0,0,0.3), 0 0 40px -10px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .chatbot-window.minimized {
        height: 68px;
      }

      .chatbot-window.hidden {
        display: none;
      }

      .chatbot-header {
        background: linear-gradient(135deg, ${primaryColor}f5, ${primaryColor}dd);
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
        border-bottom: 1px solid ${primaryColor}20;
      }

      .chatbot-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .chatbot-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        border: 2px solid rgba(255,255,255,0.3);
      }

      .chatbot-header-info h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      .chatbot-header-info p {
        margin: 0;
        font-size: 11px;
        opacity: 0.95;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .chatbot-status-dot {
        width: 6px;
        height: 6px;
        background: #4ade80;
        border-radius: 50%;
        display: inline-block;
      }

      .chatbot-header-buttons {
        display: flex;
        gap: 6px;
      }

      .chatbot-header-btn {
        background: rgba(255,255,255,0.15);
        border: none;
        color: white;
        cursor: pointer;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 18px;
        font-weight: 600;
      }

      .chatbot-header-btn:hover {
        background: rgba(255,255,255,0.25);
      }

      .chatbot-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        background: linear-gradient(180deg, #f8faff 0%, #fff 50%, #fff 100%);
        scroll-behavior: smooth;
      }

      .chatbot-message {
        display: flex;
        animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .chatbot-message.user {
        justify-content: flex-end;
      }

      .chatbot-message.bot {
        justify-content: flex-start;
      }

      .chatbot-bubble {
        max-width: 80%;
        padding: 11px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.5;
        word-wrap: break-word;
        white-space: pre-wrap;
        font-weight: 500;
      }

      .chatbot-bubble.user {
        background: linear-gradient(135deg, ${primaryColor}f5, ${primaryColor}dd);
        color: white;
        box-shadow: 0 4px 16px ${primaryColor}25;
      }

      .chatbot-bubble.bot {
        background: white;
        color: #1e293b;
        border: 1px solid ${primaryColor}15;
        font-weight: 400;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }

      .chatbot-loading {
        display: flex;
        gap: 6px;
        align-items: flex-end;
      }

      .chatbot-loading-dot {
        width: 8px;
        height: 20px;
        border-radius: 4px;
        background: ${primaryColor};
        animation: wave 0.8s ease-in-out infinite;
      }

      .chatbot-loading-dot:nth-child(1) {
        animation-delay: 0s;
      }

      .chatbot-loading-dot:nth-child(2) {
        animation-delay: 0.1s;
      }

      .chatbot-loading-dot:nth-child(3) {
        animation-delay: 0.2s;
      }

      .chatbot-input-container {
        border-top: 1px solid ${primaryColor}10;
        background: white;
        padding: 14px;
        flex-shrink: 0;
        backdrop-filter: blur(10px);
      }

      .chatbot-input-form {
        display: flex;
        gap: 10px;
      }

      .chatbot-input {
        flex: 1;
        padding: 11px 16px;
        border: 2px solid ${primaryColor}15;
        border-radius: 12px;
        font-size: 14px;
        outline: none;
        background: #f8faff;
        color: #1e293b;
        transition: all 0.2s;
        font-family: inherit;
        font-weight: 500;
        box-sizing: border-box;
      }

      .chatbot-input:focus {
        border-color: ${primaryColor};
        background: white;
        box-shadow: 0 0 12px ${primaryColor}20;
      }

      .chatbot-input:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .chatbot-send-btn {
        padding: 11px 14px;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, ${primaryColor}f5, ${primaryColor}dd);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 16px;
        font-weight: 600;
        box-shadow: 0 4px 12px ${primaryColor}25;
      }

      .chatbot-send-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px ${primaryColor}35;
      }

      .chatbot-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .chatbot-footer {
        font-size: 10px;
        color: #cbd5e1;
        text-align: center;
        margin-top: 8px;
        letter-spacing: 0.5px;
        font-weight: 500;
      }

      .chatbot-messages::-webkit-scrollbar {
        width: 6px;
      }

      .chatbot-messages::-webkit-scrollbar-track {
        background: transparent;
      }

      .chatbot-messages::-webkit-scrollbar-thumb {
        background: ${primaryColor}30;
        border-radius: 3px;
      }

      .chatbot-messages::-webkit-scrollbar-thumb:hover {
        background: ${primaryColor}50;
      }

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

      @media (max-width: 480px) {
        .chatbot-window {
          width: calc(100vw - 32px) !important;
          height: calc(100vh - 48px) !important;
          bottom: 16px !important;
          ${position === 'bottom-right' ? 'right: 16px !important;' : 'left: 16px !important;'}
        }
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Create DOM elements
    const launcher = document.createElement('button');
    launcher.className = 'chatbot-launcher';
    launcher.innerHTML = '💬';
    launcher.addEventListener('click', () => {
      state.isOpen = true;
      launcher.classList.add('hidden');
      window_el.classList.remove('hidden');
      setTimeout(() => {
        const input = document.querySelector('.chatbot-input');
        input && input.focus();
      }, 50);
    });

    const window_el = document.createElement('div');
    window_el.className = 'chatbot-window hidden';

    // Header
    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.innerHTML = `
      <div class="chatbot-header-left">
        <div class="chatbot-avatar">🤖</div>
        <div class="chatbot-header-info">
          <h3>${businessName}</h3>
          <p>
            <span class="chatbot-status-dot"></span>
            Online · Always here
          </p>
        </div>
      </div>
      <div class="chatbot-header-buttons">
        <button class="chatbot-header-btn chatbot-minimize-btn">⬇</button>
        <button class="chatbot-header-btn chatbot-close-btn">✕</button>
      </div>
    `;

    // Messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'chatbot-messages';

    const renderMessages = () => {
      messagesContainer.innerHTML = '';
      state.messages.forEach((msg) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chatbot-message ${msg.sender}`;

        const bubble = document.createElement('div');
        bubble.className = `chatbot-bubble ${msg.sender}`;
        bubble.textContent = msg.text;

        msgDiv.appendChild(bubble);
        messagesContainer.appendChild(msgDiv);
      });

      if (state.isLoading) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chatbot-loading';
        for (let i = 0; i < 3; i++) {
          const dot = document.createElement('div');
          dot.className = 'chatbot-loading-dot';
          loadingDiv.appendChild(dot);
        }
        messagesContainer.appendChild(loadingDiv);
      }

      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    };

    renderMessages();

    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'chatbot-input-container';
    inputContainer.innerHTML = `
      <form class="chatbot-input-form">
        <input type="text" class="chatbot-input" placeholder="Type your message..." />
        <button type="submit" class="chatbot-send-btn">📤</button>
      </form>
      <div class="chatbot-footer">💬 Powered by AI</div>
    `;

    // Assemble window
    window_el.appendChild(header);
    window_el.appendChild(messagesContainer);
    window_el.appendChild(inputContainer);

    // Append to DOM
    document.body.appendChild(launcher);
    document.body.appendChild(window_el);

    // Event listeners
    const sendBtn = inputContainer.querySelector('.chatbot-send-btn');
    const input = inputContainer.querySelector('.chatbot-input');
    const minimizeBtn = header.querySelector('.chatbot-minimize-btn');
    const closeBtn = header.querySelector('.chatbot-close-btn');

    const sendMessage = async (text) => {
      if (!text.trim() || state.isLoading) return;

      state.messages.push({
        id: Date.now().toString(),
        sender: 'user',
        text: text.trim(),
        timestamp: new Date().toISOString(),
      });
      input.value = '';
      renderMessages();
      state.isLoading = true;
      renderMessages();

      try {
        const response = await fetch(`${rasaServerUrl}/webhooks/rest/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text.trim() }),
        });

        if (!response.ok) throw new Error('Connection failed');

        const data = await response.json();
        const botText = data[0]?.text || "Hmm, I didn't quite catch that. Could you rephrase?";

        state.messages.push({
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: botText,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Chat error:', error);
        state.messages.push({
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: '⚠️ Connection issue. Please check your internet or try again in a moment.',
          timestamp: new Date().toISOString(),
        });
      } finally {
        state.isLoading = false;
        renderMessages();
      }
    };

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });

    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage(input.value);
    });

    minimizeBtn.addEventListener('click', () => {
      state.isMinimized = !state.isMinimized;
      window_el.classList.toggle('minimized');
      minimizeBtn.textContent = state.isMinimized ? '⬆' : '⬇';
    });

    closeBtn.addEventListener('click', () => {
      state.isOpen = false;
      state.isMinimized = false;
      window_el.classList.add('hidden');
      launcher.classList.remove('hidden');
      window_el.classList.remove('minimized');
      closeBtn.parentElement.parentElement.querySelector('.chatbot-minimize-btn').textContent = '⬇';
    });
  };

  // Auto-initialize if data attribute is present
  if (document.currentScript?.dataset.rasaServerUrl) {
    document.addEventListener('DOMContentLoaded', () => {
      window.ChatbotWidget({
        rasaServerUrl: document.currentScript.dataset.rasaServerUrl,
        businessName: document.currentScript.dataset.businessName || 'Assistant',
        primaryColor: document.currentScript.dataset.primaryColor || '#6366f1',
        position: document.currentScript.dataset.position || 'bottom-right',
      });
    });
  }
})();
