import { supabase } from "./supabase";

/**
 * Shortcut UAT injection for the dashboard owner.
 *
 * Path A (this function):
 *   - Uses the authenticated Supabase session to fetch business data.
 *   - Sets window.HAVY_CLIENT_ID  = business.id  (direct UUID, no anon lookup needed)
 *   - Sets window.HAVY_CHATBOT_KEY = business.chatbot_key (for reference)
 *   - Loads /uat.js which skips the chatbot_key→UUID lookup when CLIENT_ID is already set.
 *
 * Path B (external embed):
 *   - Client sets window.HAVY_CHATBOT_KEY on their site.
 *   - /uat.js does the anon chatbot_key→UUID lookup itself.
 */
export async function injectUAT() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, chatbot_key")
    .eq("user_id", user.id)
    .single();

  if (!business) return;

  // Set CLIENT_ID directly — avoids the anon chatbot_key lookup in uat.js
  (window as any).HAVY_CLIENT_ID = business.id;
  (window as any).HAVY_CHATBOT_KEY = business.chatbot_key;
  (window as any).HAVY_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  (window as any).HAVY_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Prevent double-injection
  if (document.getElementById("havy-uat")) return;

  const script = document.createElement("script");
  script.id = "havy-uat";
  script.src = "/uat.js";
  script.defer = true;
  document.head.appendChild(script);
}