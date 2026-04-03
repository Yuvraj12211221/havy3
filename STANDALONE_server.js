/**
 * STANDALONE EXPRESS BACKEND FOR CHATBOT
 * 
 * This is a complete Node.js/Express server to support the chatbot widget
 * 
 * Installation:
 * npm init -y
 * npm install express cors dotenv axios body-parser
 * node server.js
 * 
 * Endpoints:
 * POST /api/chat - Process chat messages
 * POST /api/log-chat - Log conversations for analytics
 * POST /api/transcribe - Convert audio to text
 * GET /api/analytics - Get chatbot analytics
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============ CONFIGURATION ============
const RASA_SERVER = process.env.RASA_SERVER_URL || 'http://localhost:5005';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// ============ MOCK DATABASE ============
// In production, use PostgreSQL, MongoDB, etc.
const chatLogs = [];
const faqDatabase = [];

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// ============ CHAT ENDPOINT ============
/**
 * POST /api/chat
 * Forward user messages to Rasa and return responses
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, chatbot_key, user_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call Rasa webhook
    const rasaResponse = await axios.post(
      `${RASA_SERVER}/webhooks/rest/webhook`,
      { message }
    );

    const botResponse = rasaResponse.data[0]?.text || 'Sorry, I did not understand that.';

    // Log the conversation
    chatLogs.push({
      id: Date.now(),
      timestamp: new Date(),
      chatbot_key: chatbot_key || 'default',
      user_id: user_id || 'anonymous',
      user_message: message,
      bot_response: botResponse,
    });

    return res.json({
      success: true,
      message: botResponse,
      source: 'rasa',
    });
  } catch (error) {
    console.error('[Chat Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to process message',
      details: error.message,
    });
  }
});

// ============ FAQ ENDPOINT (Groq AI) ============
/**
 * POST /api/faq
 * Answer questions using Groq AI with context
 */
app.post('/api/faq', async (req, res) => {
  try {
    const { question, chatbot_key, context } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!GROQ_API_KEY) {
      console.warn('[FAQ] Groq API key not configured, using Rasa fallback');
      // Fallback to Rasa
      const rasaResponse = await axios.post(
        `${RASA_SERVER}/webhooks/rest/webhook`,
        { message: question }
      );
      const answer = rasaResponse.data[0]?.text || 'No answer found';
      return res.json({ success: true, answer, source: 'rasa' });
    }

    // Use Groq AI for FAQ
    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: `You are a helpful customer service assistant. Answer questions briefly and helpfully.${
              context ? ` Here is relevant context: ${context}` : ''
            }`,
          },
          {
            role: 'user',
            content: question,
          },
        ],
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const answer = groqResponse.data.choices[0]?.message?.content || 'No answer found';

    // Log FAQ query
    chatLogs.push({
      id: Date.now(),
      timestamp: new Date(),
      type: 'faq',
      chatbot_key: chatbot_key || 'default',
      question,
      answer,
      source: 'groq',
    });

    return res.json({
      success: true,
      answer,
      source: 'groq',
    });
  } catch (error) {
    console.error('[FAQ Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate FAQ answer',
      details: error.message,
    });
  }
});

// ============ LOG CHAT ENDPOINT ============
/**
 * POST /api/log-chat
 * Log conversations for analytics
 */
app.post('/api/log-chat', (req, res) => {
  try {
    const { chatbot_key, question, answer, user_id, metadata } = req.body;

    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      chatbot_key: chatbot_key || 'default',
      user_id: user_id || 'anonymous',
      question,
      answer,
      metadata: metadata || {},
    };

    chatLogs.push(logEntry);

    console.log('[Log]', logEntry);

    return res.json({ success: true, logId: logEntry.id });
  } catch (error) {
    console.error('[Logging Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to log chat',
    });
  }
});

// ============ TRANSCRIBE ENDPOINT ============
/**
 * POST /api/transcribe
 * Convert audio to text using Groq Whisper API
 */
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audio, chatbot_key } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    if (!GROQ_API_KEY) {
      return res.status(400).json({ error: 'Transcription service not configured' });
    }

    // Note: This is a placeholder - implement actual Groq Whisper transcription
    // For now, return a mock response
    const mockTranscript = 'Mock transcription - implement Groq Whisper API';

    return res.json({
      success: true,
      transcript: mockTranscript,
      confidence: 0.95,
    });
  } catch (error) {
    console.error('[Transcribe Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to transcribe audio',
    });
  }
});

// ============ ANALYTICS ENDPOINT ============
/**
 * GET /api/analytics
 * Get chatbot analytics and statistics
 */
app.get('/api/analytics', (req, res) => {
  try {
    const { chatbot_key, days } = req.query;
    const daysToFilter = parseInt(days) || 30;

    // Filter logs by chatbot key and date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToFilter);

    const filteredLogs = chatLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      const keyMatch = !chatbot_key || log.chatbot_key === chatbot_key;
      const dateMatch = logDate >= cutoffDate;
      return keyMatch && dateMatch;
    });

    // Calculate statistics
    const stats = {
      totalInteractions: filteredLogs.length,
      uniqueUsers: new Set(filteredLogs.map((l) => l.user_id)).size,
      avgMessagesPerUser:
        filteredLogs.length /
        (new Set(filteredLogs.map((l) => l.user_id)).size || 1),
      bySource: {
        rasa: filteredLogs.filter((l) => l.source === 'rasa').length,
        groq: filteredLogs.filter((l) => l.source === 'groq').length,
        faq: filteredLogs.filter((l) => l.type === 'faq').length,
      },
      dailyBreakdown: {},
    };

    // Daily breakdown
    filteredLogs.forEach((log) => {
      const day = new Date(log.timestamp).toISOString().split('T')[0];
      stats.dailyBreakdown[day] = (stats.dailyBreakdown[day] || 0) + 1;
    });

    return res.json({
      success: true,
      stats,
      period: { days: daysToFilter, from: cutoffDate, to: new Date() },
    });
  } catch (error) {
    console.error('[Analytics Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});

// ============ FAQ DATABASE ENDPOINTS ============
/**
 * POST /api/faq-db/create
 * Add FAQ to database
 */
app.post('/api/faq-db/create', (req, res) => {
  try {
    const { question, answer, category, chatbot_key } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const faqEntry = {
      id: Date.now(),
      question,
      answer,
      category: category || 'general',
      chatbot_key: chatbot_key || 'default',
      createdAt: new Date().toISOString(),
    };

    faqDatabase.push(faqEntry);

    return res.json({ success: true, faq: faqEntry });
  } catch (error) {
    console.error('[FAQ Create Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to create FAQ',
    });
  }
});

/**
 * GET /api/faq-db/list
 * List all FAQs for a chatbot
 */
app.get('/api/faq-db/list', (req, res) => {
  try {
    const { chatbot_key, category } = req.query;

    let filtered = faqDatabase;

    if (chatbot_key) {
      filtered = filtered.filter((f) => f.chatbot_key === chatbot_key);
    }

    if (category) {
      filtered = filtered.filter((f) => f.category === category);
    }

    return res.json({
      success: true,
      count: filtered.length,
      faqs: filtered,
    });
  } catch (error) {
    console.error('[FAQ List Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to list FAQs',
    });
  }
});

/**
 * POST /api/faq-db/search
 * Search FAQs by keyword
 */
app.post('/api/faq-db/search', (req, res) => {
  try {
    const { query, chatbot_key } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const queryLower = query.toLowerCase();

    let results = faqDatabase.filter((faq) => {
      const keywordMatch = chatbot_key ? faq.chatbot_key === chatbot_key : true;
      const contentMatch =
        faq.question.toLowerCase().includes(queryLower) ||
        faq.answer.toLowerCase().includes(queryLower);
      return keywordMatch && contentMatch;
    });

    // Sort by relevance (how many keywords matched)
    results = results.sort((a, b) => {
      const aMatches =
        (a.question.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length +
        (a.answer.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
      const bMatches =
        (b.question.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length +
        (b.answer.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
      return bMatches - aMatches;
    });

    return res.json({
      success: true,
      query,
      results: results.slice(0, 10), // Return top 10
    });
  } catch (error) {
    console.error('[FAQ Search Error]:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to search FAQs',
    });
  }
});

// ============ ERROR HANDLING ============
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  Chatbot Backend Server Running        ║
║  Port: ${PORT}                             ║
║  Rasa Server: ${RASA_SERVER}         ║
╚════════════════════════════════════════╝

Available Endpoints:
  ✓ GET  /health                  - Health check
  ✓ POST /api/chat                - Chat with Rasa
  ✓ POST /api/faq                 - Ask FAQ (Groq AI)
  ✓ POST /api/log-chat            - Log conversations
  ✓ POST /api/transcribe          - Audio to text
  ✓ GET  /api/analytics           - Get statistics
  ✓ POST /api/faq-db/create       - Add FAQ
  ✓ GET  /api/faq-db/list         - List FAQs
  ✓ POST /api/faq-db/search       - Search FAQs

Configuration:
  RASA_SERVER_URL=${RASA_SERVER}
  GROQ_API_KEY=${GROQ_API_KEY ? 'Configured' : 'Not set'}
  `);
});

module.exports = app;
