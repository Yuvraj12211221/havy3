# Rasa Chatbot Setup Guide

This guide will walk you through setting up a Rasa chatbot server to work with the HAVY chatbot widget.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Creating Your First Rasa Project](#creating-your-first-rasa-project)
4. [Training Your Model](#training-your-model)
5. [Running the Rasa Server](#running-the-rasa-server)
6. [Testing the Integration](#testing-the-integration)
7. [Advanced Configuration](#advanced-configuration)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8 or higher** - Check with `python --version` or `python3 --version`
- **pip** - Python package manager (usually comes with Python)
- **Git** (optional, for version control)

### Verify Python Installation

```bash
python --version
# or
python3 --version
```

If Python is not installed, download it from [python.org](https://www.python.org/downloads/).

## Installation

### Step 1: Create a Virtual Environment (Recommended)

It's best practice to use a virtual environment to isolate your Rasa installation:

```bash
# Create a new directory for your Rasa project
mkdir rasa-chatbot
cd rasa-chatbot

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### Step 2: Install Rasa

```bash
pip install rasa
```

This will install Rasa and all its dependencies. The installation may take a few minutes.

### Step 3: Verify Installation

```bash
rasa --version
```

You should see the Rasa version number (e.g., `3.6.0`).

## Creating Your First Rasa Project

### Step 1: Initialize a New Rasa Project

```bash
rasa init --no-prompt
```

This command creates a new Rasa project with example files. The `--no-prompt` flag uses default settings.

You'll see a directory structure like this:
```
rasa-chatbot/
├── actions/
│   └── actions.py
├── config.yml
├── credentials.yml
├── data/
│   ├── nlu.yml
│   ├── rules.yml
│   └── stories.yml
├── domain.yml
├── endpoints.yml
└── models/
```

### Step 2: Understand the Project Structure

- **`data/`** - Contains training data (NLU examples, stories, rules)
- **`config.yml`** - Model configuration
- **`domain.yml`** - Defines intents, entities, responses, and actions
- **`endpoints.yml`** - API endpoint configurations
- **`credentials.yml`** - Credentials for external services
- **`actions/`** - Custom action code

## Training Your Model

### Step 1: Review Training Data

Open `data/nlu.yml` to see example intents and entities:

```yaml
version: "3.1"

nlu:
- intent: greet
  examples: |
    - hey
    - hello
    - hi
    - hello there
    - good morning
    - hi there

- intent: goodbye
  examples: |
    - goodbye
    - see you around
    - see you later
    - bye
    - bye bye
    - see ya
```

### Step 2: Customize Your Training Data

Edit `data/nlu.yml` to add your own intents and examples:

```yaml
version: "3.1"

nlu:
- intent: greet
  examples: |
    - hello
    - hi
    - hey
    - good morning
    - good afternoon

- intent: ask_about_services
  examples: |
    - what services do you offer?
    - tell me about your services
    - what can you do?
    - what are your features?

- intent: ask_about_pricing
  examples: |
    - how much does it cost?
    - what is your pricing?
    - tell me about pricing
    - how much?
```

### Step 3: Define Responses in Domain

Edit `domain.yml` to add responses:

```yaml
version: "3.1"

intents:
  - greet
  - goodbye
  - ask_about_services
  - ask_about_pricing

responses:
  utter_greet:
    - text: "Hello! How can I help you today?"
  
  utter_goodbye:
    - text: "Goodbye! Have a great day!"
  
  utter_services:
    - text: "We offer AI-powered chatbot services, email automation, and text-to-speech solutions."
  
  utter_pricing:
    - text: "Our pricing starts at $29/month. Would you like to see our plans?"
```

### Step 4: Create Stories

Edit `data/stories.yml` to define conversation flows:

```yaml
version: "3.1"

stories:
- story: greet and ask about services
  steps:
    - intent: greet
    - action: utter_greet
    - intent: ask_about_services
    - action: utter_services

- story: ask about pricing
  steps:
    - intent: ask_about_pricing
    - action: utter_pricing
```

### Step 5: Train the Model

```bash
rasa train
```

This will:
- Process your training data
- Train the NLU (Natural Language Understanding) model
- Train the dialogue model
- Save the trained model in the `models/` directory

Training typically takes 1-5 minutes depending on your data size.

## Running the Rasa Server

### Step 1: Start the Rasa Server

```bash
rasa run --enable-api --cors "*"
```

The flags:
- `--enable-api` - Enables the REST API
- `--cors "*"` - Allows cross-origin requests (needed for the widget)

You should see output like:
```
2024-01-01 12:00:00 INFO     rasa.server  - Starting Rasa server on http://0.0.0.0:5005
```

### Step 2: Verify Server is Running

Open your browser and visit:
```
http://localhost:5005/
```

You should see a JSON response with server information.

### Step 3: Test the API

You can test the API using curl:

```bash
curl -X POST http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "sender": "user"}'
```

You should receive a JSON response with the bot's reply.

## Testing the Integration

### Step 1: Configure Environment Variable

In your HAVY project, create or update `.env` file:

```env
VITE_RASA_SERVER_URL=http://localhost:5005
```

### Step 2: Start Your HAVY Application

```bash
npm run dev
```

### Step 3: Test the Chatbot

1. Log in to your HAVY dashboard
2. The chatbot widget should appear in the bottom-right corner
3. Click the widget and send a test message
4. You should receive a response from your Rasa bot

## Advanced Configuration

### Running Rasa on a Different Port

```bash
rasa run --enable-api --cors "*" -p 5006
```

Update your `.env`:
```env
VITE_RASA_SERVER_URL=http://localhost:5006
```

### Deploying Rasa to Production

For production, consider:

1. **Using a reverse proxy** (nginx, Apache)
2. **Running as a service** (systemd, supervisor)
3. **Using Docker**:

```dockerfile
FROM rasa/rasa:latest

COPY . /app
RUN rasa train

CMD ["run", "--enable-api", "--cors", "*"]
```

### Adding Custom Actions

Edit `actions/actions.py`:

```python
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher

class ActionGetTime(Action):
    def name(self) -> Text:
        return "action_get_time"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        from datetime import datetime
        current_time = datetime.now().strftime("%H:%M:%S")
        dispatcher.utter_message(text=f"The current time is {current_time}")
        return []
```

Start the action server:

```bash
rasa run actions
```

### Using Rasa X (Optional)

Rasa X provides a web interface for managing conversations:

```bash
pip install rasa-x
rasa x
```

Access the interface at `http://localhost:5002`

## Troubleshooting

### Issue: "Connection refused" error

**Solution:**
- Ensure Rasa server is running
- Check the server URL in your configuration
- Verify the port (default is 5005)
- Check firewall settings

### Issue: CORS errors in browser

**Solution:**
- Make sure you're running Rasa with `--cors "*"` flag
- For production, specify allowed origins: `--cors "https://yourdomain.com"`

### Issue: Model not responding correctly

**Solution:**
- Retrain your model: `rasa train`
- Check your training data for typos
- Add more training examples
- Review your stories and domain configuration

### Issue: Server crashes on startup

**Solution:**
- Check Python version (requires 3.8+)
- Reinstall Rasa: `pip install --upgrade rasa`
- Check for conflicting packages
- Review error logs

### Issue: Slow response times

**Solution:**
- Use a smaller model in `config.yml`
- Reduce training data size
- Optimize your stories
- Consider using Rasa's production server

## Next Steps

1. **Add more intents** - Expand your chatbot's capabilities
2. **Implement custom actions** - Add dynamic responses
3. **Add entities** - Extract specific information from user messages
4. **Deploy to production** - Make your chatbot available 24/7
5. **Monitor conversations** - Use Rasa X to review and improve

## Additional Resources

- [Rasa Documentation](https://rasa.com/docs/)
- [Rasa Forum](https://forum.rasa.com/)
- [Rasa GitHub](https://github.com/RasaHQ/rasa)
- [Rasa Training Data Format](https://rasa.com/docs/rasa/training-data-format/)

## Support

If you encounter issues:
1. Check the Rasa documentation
2. Search the Rasa forum
3. Review error logs
4. Ensure all dependencies are correctly installed

---

**Note:** This guide covers the basics. For production deployments, consider additional security measures, monitoring, and scaling strategies.
