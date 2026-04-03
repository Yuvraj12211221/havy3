# ⚡ Quick Testing Commands (Copy-Paste)

**Use these commands immediately to test your chatbot**

---

## 🚀 Setup: Start All 3 Services

**Terminal 1 - Rasa:**
```bash
cd rasa-server
venv\Scripts\activate
rasa train
rasa run --enable-api --cors "*" --port 5005
```

**Terminal 2 - Express Backend:**
```bash
cd chatbot-backend
npm install
node server.js
```

**Terminal 3 - React App:**
```bash
npm start
```

✅ You'll have 3 windows running different services.

---

## 🧪 Quick Tests

### Test 1: Rasa Server Alive?

```bash
curl http://localhost:5005/
```

Should see: HTML response with Rasa info

✅ **Rasa is running**

---

### Test 2: Chat with Rasa

```bash
curl -X POST http://localhost:5005/webhooks/rest/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Hello\"}"
```

**Expected:**
```json
[{"text": "Hello! How can I help?"}]
```

✅ **Rasa responds!**

---

### Test 3: Express Server Alive?

```bash
curl http://localhost:3001/health
```

**Expected:**
```json
{"status":"Server is running",...}
```

✅ **Express is running**

---

### Test 4: Chat via Express

```bash
curl -X POST http://localhost:3001/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Hi there\",\"chatbot_key\":\"test\"}"
```

**Expected:**
```json
{"success":true,"message":"Hi! How can I help?","source":"rasa"}
```

✅ **Express works!**

---

### Test 5: Add FAQ

```bash
curl -X POST http://localhost:3001/api/faq-db/create ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"What time?\",\"answer\":\"9AM-6PM\",\"category\":\"hours\"}"
```

✅ **FAQ stored**

---

### Test 6: Search FAQ

```bash
curl -X POST http://localhost:3001/api/faq-db/search ^
  -H "Content-Type: application/json" ^
  -d "{\"query\":\"time\"}"
```

✅ **FAQ found**

---

### Test 7: Get Analytics

```bash
curl http://localhost:3001/api/analytics
```

✅ **Analytics working**

---

## 🎨 Browser Tests

### Test 1: Open Widget
1. Open `http://localhost:3000`
2. Look for 💬 button (bottom-right)
3. Click it
4. Chat window opens

✅ **Widget visible**

---

### Test 2: Send Message
1. Type "Hello" in input
2. Click Send (or press Enter)
3. Message appears on right (user)
4. Bot response appears on left
5. See "Hello! How can I help?"

✅ **Messages working**

---

### Test 3: Test Different Intents
Send these one by one:

| Message | Expected |
|---------|----------|
| "Hi" | "Hello! How can I help?" |
| "Help me" | "I'm here to help..." |
| "Goodbye" | "Goodbye!" |
| "Random gibberish" | "Sorry, I didn't understand" |

✅ **All intents working**

---

### Test 4: Minimize
1. Click ⬇️ button
2. Window shrinks
3. Click ⬆️ button
4. Window expands

✅ **Minimize works**

---

### Test 5: Close
1. Click ✕ button
2. Window closes
3. Button reappears

✅ **Close works**

---

### Test 6: Check Styling
1. Button has gradient (indigo)
2. Rounded corners on window
3. Text is readable
4. Colors match configurationXX

✅ **Styling correct**

---

## 📱 Mobile Test

1. Press **F12** (Open DevTools)
2. Click **📱** icon (Device Toolbar)
3. Select **iPhone 12**
4. Run all above tests on mobile view

✅ **Mobile responsive**

---

## 🔍 Developer Tools Check

### Console Errors?
Press **F12** → **Console**

Should see:
```
✓ [ChatBot] Initializing...
✓ [ChatBot] Ready!
```

Should NOT see:
```
✗ [Error] Cannot connect to server
✗ CORS error
```

✅ **No errors** = working

---

### Network Request Check?
Press **F12** → **Network** → Send message

Should see requests:
- `webhooks/rest/webhook` → Status **200** ✅
- `api/log-chat` → Status **200** ✅

Should NOT see:
- Red X marks (failed requests) ❌

---

## 🚨 Quick Troubleshooting

**Problem: "Cannot connect to Rasa"**
```
✓ Check: Is Terminal 1 still running?
✓ Check: Does http://localhost:5005 respond?
✓ Action: Restart Rasa with correct command
```

**Problem: "Widget doesn't appear"**
```
✓ Check: Does http://localhost:3000 load?
✓ Check: F12 → Console for red errors
✓ Action: Refresh page (Ctrl+R)
```

**Problem: "Message doesn't send"**
```
✓ Check: All 3 servers running?
✓ Check: Is input field empty?
✓ Check: F12 → Network tab for failed requests
✓ Action: Check server terminal for errors
```

---

## ✅ Final Verification

Run these commands in sequence:

```bash
# 1. Rasa alive?
curl http://localhost:5005/
# → Should return HTML (not error)

# 2. Rasa responds?
curl -X POST http://localhost:5005/webhooks/rest/webhook ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Hello\"}"
# → Should return JSON with response

# 3. Express alive?
curl http://localhost:3001/health
# → Should return success status

# 4. Express works?
curl -X POST http://localhost:3001/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Hi\",\"chatbot_key\":\"test\"}"
# → Should return chat response

# 5. Widget works?
# Open http://localhost:3000 in browser
# Click chat button
# Send message
# Should see response
```

✅ **If all 5 pass → You're good!**

---

## 🎯 Expected Results Summary

| Test | Expected | Status |
|------|----------|--------|
| Rasa responds | "Hello! How can I help?" | ✅ |
| Express responds | {"success":true} | ✅ |
| Widget appears | 💬 button visible | ✅ |
| Message sends | Shows on right | ✅ |
| Bot responds | Shows on left | ✅ |
| Console clean | No red errors | ✅ |
| Network ok | All status 200 | ✅ |
| Mobile works | Responsive layout | ✅ |

---

## 💡 Pro Tips

1. **Keep terminals open** - Don't close them, just minimize
2. **Watch server output** - Always check terminal logs first
3. **Use F12 DevTools** - Console tab is your friend
4. **Test one thing at a time** - Don't change multiple things at once
5. **Restart when stuck** - Sometimes a restart fixes it
6. **Check URLs** - Make sure you're using right ports (5005, 3001, 3000)

---

## 🎓 What to Test in Order

1. **Rasa only** (curl commands above)
2. **Express only** (curl to localhost:3001)
3. **Widget open/close** (browser test)
4. **Send message** (full flow)
5. **Multiple messages** (conversation test)
6. **Error handling** (stop Rasa, try to chat)
7. **Mobile** (F12 responsive)
8. **Analytics** (check logs)

---

## 🆘 Need Help?

1. **Check Console** (F12)
2. **Check Network** (F12 → Network tab)
3. **Check Terminals** (look for red errors)
4. **Read Error Message** (usually tells you what's wrong)
5. **Google the error** (most issues are common)

---

## 🎉 When You See This = Success!

```
✅ Rasa running
✅ Express running  
✅ Widget appears
✅ Message sends
✅ Bot responds
✅ No console errors
```

**Your chatbot is working! Deploy it! 🚀**

---

## 📋 Testing Done? Next Steps

1. ✅ All tests pass? 
2. → **Deploy to production**
3. → **Share with users**
4. → **Collect feedback**
5. → **Improve responses**

Congrats! You're ready! 🎊
