# 🚀 AI Chatbot - Step-by-Step Implementation (Copy-Paste Ready)

**Complete guide to add the chatbot to ANY project in 30 minutes!**

---

## 📦 What You're Getting

✅ **Production-ready AI chatbot widget**  
✅ **Works on any website (embeddable)**  
✅ **Full React component included**  
✅ **Express backend with APIs**  
✅ **Rasa NLU integration**  
✅ **Voice input (audio-to-text)**  
✅ **Analytics & logging**  
✅ **Database-ready (FAQ storage)**  

---

## 🎯 Quick Start (3 Steps)

### **Step 1: Copy Rasa Backend** (5 min)

```bash
# Create rasa project
mkdir my-chatbot && cd my-chatbot
mkdir rasa-server
cd rasa-server

# Setup Python
python -m venv venv
venv\Scripts\activate  # Windows
# OR
source venv/bin/activate  # Mac/Linux

# Install Rasa
pip install rasa
```

Create **`data/nlu.yml`** (copy-paste this):

```yaml
version: "3.1"

nlu:
- intent: greet
  examples: |
    - Hi
    - Hello
    - Hey there

- intent: goodbye
  examples: |
    - Bye
    - See you
    - Goodbye

- intent: help
  examples: |
    - Can you help me?
    - I need help
    - Assistance please
```

Create **`domain.yml`**:

```yaml
version: "3.1"

intents:
  - greet
  - goodbye
  - help

responses:
  utter_greet:
    - text: "Hello! How can I help?"
  utter_goodbye:
    - text: "Goodbye!"
  utter_help:
    - text: "I'm here to help. What do you need?"

session_config:
  session_expiration_time: 60
```

Create **`data/stories.yml`**:

```yaml
version: "3.1"

stories:
- story: greet
  steps:
    - intent: greet
    - action: utter_greet
```

Create **`config.yml`**:

```yaml
recipe: default.v1
language: en
pipeline:
  - name: WhitespaceTokenizer
  - name: RegexFeaturizer
  - name: LexicalSyntacticFeaturizer
  - name: CountVectorsFeaturizer
  - name: CountVectorsFeaturizer
    analyzer: "char_wb"
    min_ngram: 1
    max_ngram: 4
  - name: DIETClassifier
    epochs: 100
  - name: EntitySynonymMapper
  - name: ResponseSelector
    epochs: 100
  - name: FallbackClassifier
    threshold: 0.3

policies:
  - name: MemoizationPolicy
  - name: RulePolicy
  - name: UnexpecTEDIntentPolicy
```

Train & Run:

```bash
rasa train
rasa run --enable-api --cors "*" --port 5005
```

✅ **Rasa is running at `http://localhost:5005`**

---

### **Step 2: Setup Express Backend** (3 min)

In new terminal:

```bash
mkdir chatbot-backend && cd chatbot-backend
npm init -y
npm install express cors dotenv axios body-parser
```

Create **`.env`**:

```
PORT=3001
RASA_SERVER_URL=http://localhost:5005
GROQ_API_KEY=your-groq-api-key-here
```

Create **`server.js`** and copy the full content from **`STANDALONE_server.js`** in the project.

Run:

```bash
node server.js
```

✅ **Backend running at `http://localhost:3001`**

---

### **Step 3: Add to Your App** (2 min)

#### **Option A: React Project**

```bash
npm install lucide-react
```

Copy **`STANDALONE_ChatbotWidget.tsx`** to your `src/components/`

Use in your app:

```typescript
import ChatbotWidget from './components/ChatbotWidget';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      {/* Add chatbot */}
      <ChatbotWidget
        rasaServerUrl="http://localhost:5005"
        businessName="My Company"
        position="bottom-right"
        primaryColor="#6366f1"
        chatbotKey="my-business-123"
      />
    </div>
  );
}

export default App;
```

#### **Option B: Plain HTML Website**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Website</title>
</head>
<body>
  <h1>Welcome to my site</h1>
  <p>Talk to our AI assistant!</p>

  <!-- Add this before </body> -->
  <script>
    window.ChatbotConfig = {
      rasaServerUrl: 'http://localhost:5005',
      businessName: 'My Business',
      position: 'bottom-right',
      primaryColor: '#6366f1',
      chatbotKey: 'my-business-123'
    };
  </script>
  <script src="path/to/STANDALONE_chatbot-embed.js" async></script>
</body>
</html>
```

---

## 📋 File Reference

| File | Purpose | Copy From |
|------|---------|-----------|
| **Rasa Backend** | AI engine | See Rasa setup above |
| **Express Server** | API endpoints | `STANDALONE_server.js` |
| **React Component** | Chat UI (React) | `STANDALONE_ChatbotWidget.tsx` |
| **Embed Script** | Chat UI (Any site) | `STANDALONE_chatbot-embed.js` |

---

## 🔧 Configuration Options

```javascript
window.ChatbotConfig = {
  // Required
  rasaServerUrl: 'http://localhost:5005',
  
  // Optional
  businessName: 'My Business',
  position: 'bottom-right',      // or 'bottom-left'
  primaryColor: '#6366f1',        // Any hex color
  chatbotKey: 'unique-id',        // For analytics
  enableVoice: true,              // Enable microphone
  enableAnalytics: true,          // Log conversations
};
```

---

## 🎨 Color Examples

```javascript
// Indigo (default)
primaryColor: '#6366f1'

// Blue
primaryColor: '#3b82f6'

// Green  
primaryColor: '#10b981'

// Purple
primaryColor: '#a855f7'

// Orange
primaryColor: '#f97316'
```

---

## 📊 API Endpoints

### Chat

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

### Log Chat

```bash
curl -X POST http://localhost:3001/api/log-chat \
  -H "Content-Type: application/json" \
  -d '{
    "chatbot_key":"my-business",
    "question":"What is your price?",
    "answer":"Our prices start at..."
  }'
```

### Get Analytics

```bash
curl http://localhost:3001/api/analytics?chatbot_key=my-business&days=30
```

### Add FAQ

```bash
curl -X POST http://localhost:3001/api/faq-db/create \
  -H "Content-Type: application/json" \
  -d '{
    "question":"What are your hours?",
    "answer":"9AM-6PM Monday-Friday",
    "category":"business"
  }'
```

### Search FAQ

```bash
curl -X POST http://localhost:3001/api/faq-db/search \
  -H "Content-Type: application/json" \
  -d '{"query":"hours"}'
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| **Chatbot not responding** | Make sure Rasa runs on 5005: `http://localhost:5005/webhooks/rest/webhook` |
| **CORS error** | Rasa must run with `--cors "*"` |
| **Widget not appearing** | Check browser console, ensure JavaScript is enabled |
| **Express server won't start** | Check if port 3001 is in use: `lsof -i :3001` |
| **Rasa training fails** | Try `pip install --upgrade rasa` |

---

## 📈 Next Steps

1. **Add more training data** - Expand `data/nlu.yml` with more intents
2. **Connect to database** - Replace mock db in `server.js` with PostgreSQL
3. **Add custom actions** - Create Python functions for dynamic responses
4. **Deploy to production** - Use Docker, Heroku, AWS, etc.
5. **Monitor analytics** - Track conversations and improve responses
6. **Add authentication** - Secure your API endpoints
7. **Enable webhooks** - Connect to your business systems

---

## 📂 Final Project Structure

```
my-chatbot-project/
├── rasa-server/
│   ├── data/
│   │   ├── nlu.yml
│   │   └── stories.yml
│   ├── domain.yml
│   ├── config.yml
│   ├── venv/
│   └── models/
│
├── chatbot-backend/
│   ├── server.js
│   ├── .env
│   ├── package.json
│   └── node_modules/
│
├── my-frontend/         (React app)
│   ├── src/
│   │   ├── components/
│   │   │   └── ChatbotWidget.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
└── docs/
    └── README.md
```

---

## 🚢 Deployment Checklist

### Rasa Server
- [ ] Build Docker image: `docker build -t my-rasa .`
- [ ] Push to registry
- [ ] Deploy to cloud (AWS, GCP, Heroku)
- [ ] Update `rasaServerUrl` to production URL

### Express Backend
- [ ] Add PostgreSQL database
- [ ] Set environment variables on server
- [ ] Deploy to cloud
- [ ] Update API URLs in frontend

### Frontend
- [ ] Build: `npm run build`
- [ ] Deploy to Vercel, Netlify, or server
- [ ] Update chatbot configuration

---

## 💡 Pro Tips

1. **Fast Iteration** - Keep Rasa server running during development
2. **Testing** - Use `curl` or Postman to test APIs first
3. **Analytics** - Always log conversations for improvement
4. **Fallback** - Train Rasa well with example sentences
5. **User Feedback** - Ask users for feedback on responses
6. **Mobile** - Widget is fully responsive, test on phones
7. **Performance** - Minimize Rasa response time (< 500ms)

---

## 🎓 Learning Resources

- **Rasa Docs**: https://rasa.com/docs/
- **Express.js**: https://expressjs.com/
- **React**: https://react.dev/
- **Groq AI**: https://console.groq.com/
- **Postman**: https://www.postman.com/ (API testing)

---

## ✅ Verification Checklist

After setup, test:

- [ ] Rasa responds at `http://localhost:5005/webhooks/rest/webhook`
- [ ] Express server runs at `http://localhost:3001`
- [ ] Widget appears on page
- [ ] Can send message
- [ ] Rasa returns response
- [ ] Analytics endpoint works
- [ ] Voice input works (if enabled)

---

## 🎉 You're Done!

Your AI chatbot is **live and ready to use**!

Next: Deploy to production and watch your conversations grow! 📈

---

## Quick Links

- Rasa project docs: [RASA_SETUP_GUIDE.md](./RASA_SETUP_GUIDE.md)
- Full implementation guide: [CHATBOT_IMPLEMENTATION_GUIDE.md](./CHATBOT_IMPLEMENTATION_GUIDE.md)
- Code files to copy:
  - React Component: `STANDALONE_ChatbotWidget.tsx`
  - Embed Script: `STANDALONE_chatbot-embed.js`
  - Backend Server: `STANDALONE_server.js`

---

## Support

Have questions? Check:
1. Browser console for JavaScript errors
2. Server logs for backend errors
3. Rasa logs for AI errors
4. This guide's troubleshooting section

Happy chatting! 🤖
