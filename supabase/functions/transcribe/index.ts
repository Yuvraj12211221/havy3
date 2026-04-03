import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || supabaseAnonKey);

    // Get the user from the auth token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }).auth.getUser();

    if (authError || !user) {
      // For public chatbot STT access we check business chatbot key instead of auth
      // Let's grab the chatbot_key from the form data below
    }

    const GROQ_KEY = Deno.env.get("GROK_API_KEY_FOR_STT") || Deno.env.get("GROQ_API_KEY");
    if (!GROQ_KEY) {
      return new Response(
        JSON.stringify({ error: "No Groq API key found. Set GROK_API_KEY_FOR_STT as a Supabase secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Expect multipart/form-data with an "audio" file field
    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || typeof audioFile === "string") {
      return new Response(
        JSON.stringify({ error: "No audio file in request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Identify user for billing (either from Auth Token or Chatbot Key)
    const chatbotKey = formData.get("chatbot_key");
    let targetUserId = user?.id;

    if (!targetUserId && chatbotKey && typeof chatbotKey === "string") {
       const { data: bData } = await supabaseService.from("businesses").select("user_id").eq("chatbot_key", chatbotKey).single();
       if (bData) targetUserId = bData.user_id;
    }

    if (!targetUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid business key or user session" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // Deduct STT Credits
    const { data: creditOk, error: creditErr } = await supabaseService.rpc('decrement_credits', {
      feature_name: 'stt',
      amount: 1,
      p_user_id: targetUserId
    });

    if (creditErr || !creditOk) {
      if (creditErr && (creditErr.code === 'PGRST202' || creditErr.message?.includes('Could not find'))) {
         console.warn("[transcribe] Credit system not initialized. Bypassing.");
      } else {
         return new Response(JSON.stringify({ error: "Credit limit reached for Speech-to-Text" }), {
           status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
         });
      }
    }

    // Build form data to send to Groq
    const groqForm = new FormData();
    groqForm.append("file", audioFile, "audio.webm");
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("response_format", "json");
    groqForm.append("language", "en"); // change to "hi" for Hindi

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEY}` },
        body: groqForm,
      }
    );

    const groqData = await groqRes.json();

    if (!groqRes.ok) {
      return new Response(
        JSON.stringify({ error: groqData.error?.message || "Groq error" }),
        { status: groqRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ transcript: groqData.text || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
