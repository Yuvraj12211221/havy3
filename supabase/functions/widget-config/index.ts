import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { chatbot_key, domain } = await req.json();

    if (!chatbot_key || !domain) {
      return new Response(
        JSON.stringify({ error: "Missing chatbot_key or domain" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: business, error } = await supabase
      .from("businesses")
      .select("id, allowed_domains")
      .eq("chatbot_key", chatbot_key);

    console.log("DB result:", business);
    console.log("DB error:", error);

    if (error || !business || business.length === 0)  {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const record = business[0];

    const allowedDomains = record.allowed_domains || [];
    console.log("Incoming domain:", domain);
    console.log("Allowed domains:", allowedDomains);

    const hasRestrictions = allowedDomains.length > 0;

    if (hasRestrictions) {

      

      const requestDomain = domain.split(":")[0];

      const allowed = allowedDomains.some((d: string) => {
       return (
        requestDomain === d ||
        requestDomain.endsWith("." + d)
       );
      });

      if (!allowed) {
        return new Response(
          JSON.stringify({ error: "Domain not allowed" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        chatbot: true,
        tts: true,
        email: false,
        analytics: true,
        business_id: record.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
      console.error("Widget config error:", err);

      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
});