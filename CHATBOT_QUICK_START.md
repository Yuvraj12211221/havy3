# Chatbot Widget Quick Start Guide

This guide will help you quickly set up and use the Rasa-powered chatbot widget in your HAVY application.

## Features

✅ **Chatbot Widget** - Appears automatically after user login  
✅ **Rasa Integration** - Connects to your Rasa server for intelligent responses  
✅ **Embeddable Script** - Copy-paste code snippet for use on external websites  
✅ **Customizable** - Configure colors, position, and server URL  
✅ **Responsive** - Works on desktop and mobile devices  

## Quick Setup

### 1. Configure Rasa Server URL

Create a `.env` file in the project root (or update existing one):

```env
VITE_RASA_SERVER_URL=http://localhost:5005
```

For production, use your deployed Rasa server URL:
```env
VITE_RASA_SERVER_URL=https://your-rasa-server.com
```

### 2. Start Your Application

```bash
npm run dev
```

### 3. Access Chatbot Configuration

1. Log in to your HAVY dashboard
2. Navigate to **Dashboard → Chatbot** in the sidebar
3. Configure your chatbot settings:
   - Rasa Server URL
   - Widget Position (bottom-right or bottom-left)
   - Primary Color

### 4. Test the Chatbot

After logging in, you'll see a chatbot button in the bottom-right corner. Click it to start chatting!

## Using the Embeddable Script

### Get Your Code Snippet

1. Go to **Dashboard → Integrations**
2. Find the **Rasa Chatbot** section
3. Click **Copy Code** to copy the embed snippet

### Embed on External Websites

1. Paste the code snippet before the closing `</body>` tag of your HTML
2. Make sure your Rasa server is running and accessible
3. The chatbot widget will appear automatically on your site

### Example Embed Code

```html
<!-- HAVY Rasa Chatbot Widget -->
<div id="havy-chatbot-root"></div>
<script>
  (function() {
    window.HAVYChatbotConfig = {
      rasaServerUrl: 'http://localhost:5005',
      userId: 'user',
      position: 'bottom-right',
      primaryColor: '#3B82F6'
    };
    var script = document.createElement('script');
    script.src = 'https://your-domain.com/chatbot-widget.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
```

## Setting Up Rasa Server

For detailed instructions on setting up a Rasa server, see [RASA_SETUP_GUIDE.md](./RASA_SETUP_GUIDE.md)

### Quick Rasa Setup

```bash
# Install Rasa
pip install rasa

# Create a new Rasa project
rasa init --no-prompt

# Train the model
rasa train

# Start the server
rasa run --enable-api --cors "*"
```

## Troubleshooting

### Chatbot not appearing after login

- Check that you're logged in
- Verify the ChatbotWidget component is loaded in Dashboard.tsx
- Check browser console for errors

### "Connection refused" error

- Ensure your Rasa server is running
- Verify the Rasa server URL in your configuration
- Check that CORS is enabled: `rasa run --enable-api --cors "*"`

### Widget not working on external site

- Verify the `chatbot-widget.js` file is accessible at the specified URL
- Check browser console for JavaScript errors
- Ensure the Rasa server URL is correct and accessible from the external site

## Configuration Options

### Widget Position
- `bottom-right` (default)
- `bottom-left`

### Primary Color
Any valid CSS color (hex, rgb, named colors)

### Rasa Server URL
Full URL including protocol (http:// or https://)

## Next Steps

1. **Customize your Rasa bot** - Add more intents and responses
2. **Deploy Rasa server** - Make it available 24/7
3. **Monitor conversations** - Track chatbot usage
4. **Add custom actions** - Implement dynamic responses

For more information, see the [Rasa Setup Guide](./RASA_SETUP_GUIDE.md).
