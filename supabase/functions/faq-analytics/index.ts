import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { chatbot_key } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("chatbot_key", chatbot_key)
    .single();

  if (!business)
    return new Response(JSON.stringify({}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const { data: logs } = await supabase
    .from("faq_logs")
    .select("*")
    .eq("business_id", business.id);

  const total = logs.length;
  const matched = logs.filter((l) => l.matched).length;

  const counts: Record<string, number> = {};
  logs.forEach((l) => {
    counts[l.question] = (counts[l.question] || 0) + 1;
  });

  const topQuestions = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return new Response(
    JSON.stringify({
      total,
      successRate: total ? (matched / total) * 100 : 0,
      topQuestions,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
