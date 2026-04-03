# 🧪 AI Chatbot - Complete Testing Guide

**Step-by-step instructions to test every part of your chatbot implementation**

---

## 📋 Testing Checklist

- [ ] Rasa server responds
- [ ] Express backend works
- [ ] Widget appears on page
- [ ] Can send text message
- [ ] Bot responds correctly
- [ ] Voice input works
- [ ] Analytics logging works
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] CSS/styling correct

---

## 🚀 Part 1: Test Rasa Server

### Step 1A: Start Rasa

**Terminal 1:**
```bash
cd rasa-server
venv\Scripts\activate
rasa train
rasa run --enable-api --cors "*" --port 5005
```

You should see:
```
2024-03-29 10:15:45 INFO rasa.server - Rasa server is up and running on http://0.0.0.0:5005
```

✅ **Rasa is ready!**

---

### Step 1B: Test Rasa with curl

**Terminal 2 (or new PowerShell):**

```bash
curl -X POST http://localhost:5005/webhooks/rest/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Hello\"}"
```

**Expected response:**
```json
[
  {
    "text": "Hello! How can I help?"
  }
]
```

**Test other messages:**

```bash
# Test greeting
curl -X POST http://localhost:5005/webhooks/rest/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Hi there\"}"

# Test goodbye
curl -X POST http://localhost:5005/webhooks/rest/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"See you later\"}"

# Test help
curl -X POST http://localhost:5005/webhooks/rest/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Can you help me\"}"
```

✅ **If you get responses, Rasa is working!**

---

## 📡 Part 2: Test Express Backend

### Step 2A: Start Express Server

**Terminal 3 (new):**

```bash
cd chatbot-backend
npm install
node server.js
```

You should see:
```
╔════════════════════════════════════════╗
║  Chatbot Backend Server Running        ║
║  Port: 3001                             ║
║  Rasa Server: http://localhost:5005    ║
╚════════════════════════════════════════╝
```

✅ **Express is ready!**

---

### Step 2B: Test Express Endpoints

#### **Test 1: Health Check**

```bash
curl http://localhost:3001/health
```

**Expected:**
```json
{
  "status": "Server is running",
  "timestamp": "2024-03-29T10:15:45.123Z"
}
```

✅ Pass

---

#### **Test 2: Chat Endpoint**

```bash
curl -X POST http://localhost:3001/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Hello\",\"chatbot_key\":\"test-key\"}"
```

**Expected:**
```json
{
  "success": true,
  "message": "Hello! How can I help?",
  "source": "rasa"
}
```

✅ Pass

---

#### **Test 3: Log Chat**

```bash
curl -X POST http://localhost:3001/api/log-chat ^
  -H "Content-Type: application/json" ^
  -d "{\"chatbot_key\":\"test-key\",\"question\":\"What time are you open?\",\"answer\":\"We're open 9AM-6PM\"}"
```

**Expected:**
```json
{
  "success": true,
  "logId": 1711770945123
}
```

✅ Pass

---

#### **Test 4: Analytics**

```bash
curl "http://localhost:3001/api/analytics?chatbot_key=test-key&days=30"
```

**Expected:**
```json
{
  "success": true,
  "stats": {
    "totalInteractions": 1,
    "uniqueUsers": 1,
    "avgMessagesPerUser": 1,
    "bySource": {
      "rasa": 1,
      "groq": 0,
      "faq": 0
    },
    "dailyBreakdown": {...}
  }
}
```

✅ Pass

---

#### **Test 5: Create FAQ**

```bash
curl -X POST http://localhost:3001/api/faq-db/create ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"What are your hours?\",\"answer\":\"We're open 9AM-6PM Monday-Friday\",\"category\":\"business\"}"
```

**Expected:**
```json
{
  "success": true,
  "faq": {
    "id": 1711770945123,
    "question": "What are your hours?",
    "answer": "We're open 9AM-6PM Monday-Friday",
    "category": "business"
  }
}
```

✅ Pass

---

#### **Test 6: Search FAQ**

```bash
curl -X POST http://localhost:3001/api/faq-db/search ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"hours\"}"
```

**Expected:**
```json
{
  "success": true,
  "query": "hours",
  "results": [
    {
      "question": "What are your hours?",
      "answer": "We're open 9AM-6PM Monday-Friday"
    }
  ]
}
```

✅ Pass

---

## 🎨 Part 3: Test Widget (React Component)

### Step 3A: Setup React Project

**Terminal 4 (new):**

```bash
# If you have existing React project, skip to 3B
# Otherwise create one:
npx create-react-app chatbot-test
cd chatbot-test
npm install lucide-react
```

---

### Step 3B: Add Chatbot Component

Create **`src/components/ChatbotWidget.tsx`** and copy content from `STANDALONE_ChatbotWidget.tsx`

---

### Step 3C: Use Component in App

**`src/App.tsx`:**

```typescript
import ChatbotWidget from './components/ChatbotWidget';

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>🧪 Chatbot Test Page</h1>
      <p>Click the button in the bottom-right corner to test the chatbot!</p>
      
      <ChatbotWidget
        rasaServerUrl="http://localhost:5005"
        businessName="Test Bot"
        position="bottom-right"
        primaryColor="#6366f1"
        chatbotKey="test-123"
      />
    </div>
  );
}

export default App;
```

---

### Step 3D: Start React Dev Server

```bash
npm start
```

Browser opens at `http://localhost:3000`

---

### Step 3E: Manual Test Scenarios

#### **Scenario 1: Open/Close Widget**
- [ ] Click the 💬 button
- [ ] Chat window opens
- [ ] Click ✕ button
- [ ] Chat window closes
- [ ] Button appears again

✅ Pass if all work

---

#### **Scenario 2: Send Text Message**
- [ ] Click 💬 button
- [ ] Type "Hello" in input
- [ ] Click Send button
- [ ] Your message appears right-aligned
- [ ] Loading indicator shows
- [ ] Bot response appears left-aligned
- [ ] Type "Goodbye"
- [ ] Click Send
- [ ] Rasa responds

✅ Pass if you get 2+ responses

---

#### **Scenario 3: Auto-Focus Input**
- [ ] Close the widget
- [ ] Click 💬 button to open
- [ ] Input field is automatically focused (blinking cursor)
- [ ] Can type immediately without clicking input

✅ Pass if input is focused

---

#### **Scenario 4: Auto-Scroll**
- [ ] Send 10 messages
- [ ] Latest message is always at bottom
- [ ] Scrolls automatically

✅ Pass

---

#### **Scenario 5: Minimize**
- [ ] Click ⬇️ button
- [ ] Window shrinks to just header
- [ ] Click ⬆️ button
- [ ] Window expands back

✅ Pass

---

#### **Scenario 6: Styling**
- [ ] Button has gradient background
- [ ] Button scales on hover
- [ ] Window is rounded corners
- [ ] Colors match `primaryColor`
- [ ] Text is readable

✅ Pass if styling looks good

---

#### **Scenario 7: Responsive**
- [ ] Open DevTools (F12)
- [ ] Click Device Toolbar (phone icon)
- [ ] Select "iPhone 12"
- [ ] Chat window resizes to fit screen
- [ ] Can still send messages

✅ Pass

---

## 🌐 Part 4: Test Embeddable Script

### Step 4A: Create Test HTML File

Create **`test-embed.html`**:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chatbot Embed Test</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { color: #333; }
    p { color: #666; line-height: 1.6; }
    .section { margin: 40px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>🤖 Chatbot Embed Test</h1>
  
  <div class="section">
    <h2>Test Page #1</h2>
    <p>This page demonstrates the chatbot widget embedded using a script tag.</p>
    <p>The chat button should appear in the bottom-right corner. Click it to start chatting!</p>
  </div>

  <div class="section">
    <h2>Features to Test</h2>
    <ul>
      <li>Click the chat button to open</li>
      <li>Type a message and click Send</li>
      <li>Try different messages: "Hello", "Help", "Goodbye"</li>
      <li>Click the minimize button</li>
      <li>Click the close button</li>
      <li>Reopen to verify conversation history</li>
    </ul>
  </div>

  <!-- Load Chatbot Widget -->
  <script>
    window.ChatbotConfig = {
      rasaServerUrl: 'http://localhost:5005',
      businessName: 'Test Business',
      position: 'bottom-right',
      primaryColor: '#6366f1',
      chatbotKey: 'embed-test-123'
    };
  </script>
  <script src="path/to/STANDALONE_chatbot-embed.js" async></script>
</body>
</html>
```

---

### Step 4B: Test in Browser

1. Open `test-embed.html` in browser (double-click the file)
2. Chat button appears in corner
3. Follow same tests as Scenario 2-7 above

✅ Pass

---

## 🎯 Part 5: Advanced Testing Scenarios

### Scenario A: Error Handling

#### **Test: Connection Error**

- [ ] Stop Rasa server (Ctrl+C in Terminal 1)
- [ ] Send message in widget
- [ ] Should see: "Connection error. Please try again."
- [ ] Restart Rasa
- [ ] Should work again

✅ Pass

---

#### **Test: Invalid Response**

Modify Rasa `domain.yml` to have empty response:

```yaml
responses:
  utter_greet:
    - text: ""  # Empty response
```

- [ ] Train: `rasa train`
- [ ] Send "Hi"
- [ ] Should handle gracefully (not crash)

✅ Pass

---

### Scenario B: Voice Input (if enabled)

#### **Test: Microphone**

1. Click the 🎤 icon in widget
2. Browser asks for microphone permission
3. Click "Allow"
4. Speak clearly: "Hello"
5. Click 🎙️ to stop recording
6. Message should appear as text

✅ Pass if mic works

---

### Scenario C: Analytics

#### **Test: Verify Logging**

1. Send 5 messages
2. In Terminal 3, check logs:
```bash
curl http://localhost:3001/api/analytics
```

Should show:
```json
"totalInteractions": 5
```

✅ Pass

---

### Scenario D: Multiple Colors

Test with different `primaryColor` values:

```typescript
// Test each color
<ChatbotWidget
  rasaServerUrl="http://localhost:5005"
  businessName="Test"
  primaryColor="#3b82f6"  // Blue
/>

<ChatbotWidget
  primaryColor="#10b981"  // Green
/>

<ChatbotWidget
  primaryColor="#f97316"  // Orange
/>
```

✅ Pass if all colors work

---

### Scenario E: Different Positions

```typescript
// Bottom right
<ChatbotWidget position="bottom-right" />

// Bottom left
<ChatbotWidget position="bottom-left" />
```

✅ Pass if widget moves correctly

---

## 🔍 Part 6: Browser DevTools Testing

### Step 6A: Open DevTools

```
Windows/Linux: F12 or Ctrl+Shift+I
Mac: Cmd+Option+I
```

---

### Step 6B: Check Console

1. Go to **Console** tab
2. Should be NO red errors
3. Look for green messages like:
   ```
   [ChatBot] Initializing with: ...
   [ChatBot] Ready!
   ```

✅ Pass if no red errors

---

### Step 6C: Check Network

1. Go to **Network** tab
2. Send a message
3. Look for requests:
   - `POST localhost:5005/webhooks/rest/webhook` (Rasa)
   - `POST localhost:3001/api/log-chat` (Analytics)
4. Both should return `Status 200`

✅ Pass if requests succeed

---

### Step 6D: Check Performance

1. Go to **Performance** tab
2. Click Record
3. Send 5 messages
4. Stop recording
5. Check:
   - No long red bars (performance issues)
   - Response time < 1 second per message

✅ Pass

---

### Step 6E: Lighthouse Audit

1. Go to **Lighthouse** tab
2. Click "Analyze page load"
3. Look for:
   - Performance: > 80
   - Accessibility: > 80
   - Best Practices: > 80

✅ Pass if scores are green

---

## 📱 Part 7: Mobile Testing

### Step 7A: DevTools Mobile Emulation

1. Press F12
2. Click Device Toolbar (📱 icon)
3. Select "iPhone 12"
4. Test all scenarios:
   - Click button
   - Send message
   - Voice input
   - Minimize/maximize
   - Landscape orientation

✅ Pass if works on mobile

---

### Step 7B: Physical Phone Test

1. Deploy to testing server
2. Open URL on phone
3. Test all features
4. Check keyboard doesn't block input

✅ Pass

---

## 🧩 Part 8: Integration Testing

### Test: React App with Multiple Components

```typescript
import ChatbotWidget from './components/ChatbotWidget';

function App() {
  return (
    <>
      {/* Your app */}
      <header>My App</header>
      <main>Content here</main>
      
      {/* Multiple widgets (not recommended) */}
      <ChatbotWidget
        rasaServerUrl="http://localhost:5005"
        primaryColor="#6366f1"
      />
    </>
  );
}
```

✅ Pass if widget doesn't conflict with app

---

### Test: Different Business Names

```typescript
<ChatbotWidget businessName="Acme Corp" />
<ChatbotWidget businessName="Tech Support" />
<ChatbotWidget businessName="Customer Service" />
```

Verify header shows correct business name each time.

✅ Pass

---

## 📊 Part 9: Load Testing

### Test: Send Many Messages Quickly

```bash
# Using loop in PowerShell
for ($i = 1; $i -le 100; $i++) {
  curl -X POST http://localhost:3001/api/chat `
    -H "Content-Type: application/json" `
    -d "{\"message\":\"Test message $i\"}"
}
```

✅ Pass if server doesn't crash

---

## ✅ Complete Testing Checklist

Print this out and check each:

```
RASA SERVER
- [ ] Server starts without errors
- [ ] Curl test returns response
- [ ] Responds to different intents

EXPRESS BACKEND
- [ ] Server starts
- [ ] Health check works
- [ ] Chat endpoint works
- [ ] Logging works
- [ ] Analytics endpoint works
- [ ] FAQ CRUD works

REACT WIDGET
- [ ] Component imports
- [ ] Widget appears on page
- [ ] Can open/close
- [ ] Can send message
- [ ] Gets Rasa response
- [ ] Styling is correct
- [ ] Responsive
- [ ] No console errors

EMBEDDABLE SCRIPT
- [ ] Script loads
- [ ] Widget appears
- [ ] Functionality works
- [ ] No console errors
- [ ] No CORS errors

ADVANCED
- [ ] Voice input works
- [ ] Analytics logs
- [ ] Error handling works
- [ ] Multiple instances work
- [ ] Mobile responsive
- [ ] Load testing passes
```

---

## 🎓 Testing with Postman (Optional)

### Download Postman

https://www.postman.com/downloads/

### Import Requests

Create new Postman Collection:

1. New → Collection → "Chatbot Tests"

2. Add requests:

```
POST localhost:5005/webhooks/rest/webhook
Body (raw JSON):
{
  "message": "Hello"
}

---

POST localhost:3001/api/chat
Body:
{
  "message": "Hi",
  "chatbot_key": "test"
}

---

GET localhost:3001/api/analytics?chatbot_key=test

---

POST localhost:3001/api/log-chat
Body:
{
  "chatbot_key": "test",
  "question": "What's up?",
  "answer": "Just testing"
}
```

Click "Send" to test each endpoint.

✅ Pass if all return 200 status

---

## 🐛 Troubleshooting During Testing

### Issue: "Cannot connected to Rasa"

**Fix:**
```bash
# Check if Rasa is running
curl http://localhost:5005/

# If not, start it:
rasa run --enable-api --cors "*"
```

---

### Issue: "CORS error"

**Fix:**
Rasa must have `--cors "*"`:
```bash
rasa run --enable-api --cors "*"  # ✅ Correct
rasa run --enable-api             # ❌ Missing --cors
```

---

### Issue: Widget doesn't appear

**Fix:**
1. Check browser console (F12)
2. Look for red error messages
3. Verify `rasaServerUrl` is correct
4. Verify JavaScript is enabled

---

### Issue: "Cannot send message"

**Fix:**
1. Verify Rasa is running: `http://localhost:5005`
2. Verify Express is running: `http://localhost:3001`
3. Check Network tab (F12) for failed requests
4. Check server logs for errors

---

## 📈 Success Metrics

**Your chatbot is working when:**

1. ✅ All 3 servers running (Rasa, Express, React/Frontend)
2. ✅ Widget appears on page
3. ✅ Can send messages
4. ✅ Get responses (not errors)
5. ✅ No red errors in console
6. ✅ Analytics logs messages
7. ✅ Works on mobile

---

## 🎉 Ready to Test!

You have everything you need. Pick a section above and start testing:

1. **Start with Part 1** (Rasa curl test) - fastest way to verify basics
2. **Move to Part 3** (React widget) - full user experience
3. **Test Part 5** (advanced scenarios) - edge cases
4. **Check Part 6** (DevTools) - debugging

Good luck! 🚀

---

## 📞 If Tests Fail

1. Check this guide's troubleshooting section
2. Look at server terminal output
3. Check browser console (F12)
4. Check Network tab (F12) for failed requests
5. Verify all 3 services are running

**Need more help?** Check the main implementation guide for detailed explanations.
