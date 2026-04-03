from typing import Any, Text, Dict, List
import os
import requests
from dotenv import load_dotenv

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import FollowupAction


# Load environment variables
load_dotenv()

SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Supabase FAQ edge function
FAQ_API_URL = "https://knactizuxbxjrwiduedv.supabase.co/functions/v1/faq"

# Business chatbot key
CHATBOT_KEY = "9df6c1f7-3834-4931-a605-fbc4dd2a2283"


class ActionLookupFaq(Action):

    def name(self) -> Text:
        return "action_lookup_faq"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:

        # Get latest user message
        user_message = tracker.latest_message.get("text")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "apikey": SUPABASE_ANON_KEY
        }

        try:
            # Call FAQ similarity API
            response = requests.post(
                FAQ_API_URL,
                json={
                    "chatbot_key": CHATBOT_KEY,
                    "question": user_message,
                },
                headers=headers,
                timeout=5,
            )

            print("FAQ status:", response.status_code)
            print("FAQ response:", response.text)

            # If API error, let Rasa continue normally
            if response.status_code != 200:
                return []

            data = response.json()

            # FAQ response fields
            answer = data.get("answer")
            score = data.get("score", 0)

            print("FAQ score:", score)

            # ✅ FAQ wins if any answer exists
            if answer and score > 0:
                dispatcher.utter_message(text=answer)

                # Stop further Rasa processing
                return [FollowupAction("action_listen")]

            # No FAQ result → allow Rasa intent response
            return []

        except Exception as e:
            print("FAQ action error:", str(e))

            # Let Rasa handle fallback
            return []
