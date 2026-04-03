import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ─── Text helpers ──────────────────────────────────────────────────── */

function cleanText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function textToVector(words: string[]) {
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return freq;
}

function cosineSimilarity(a: any, b: any) {
  const words = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, magA = 0, magB = 0;
  for (const w of words) {
    const va = a[w] || 0, vb = b[w] || 0;
    dot += va * vb; magA += va * va; magB += vb * vb;
  }
  magA = Math.sqrt(magA); magB = Math.sqrt(magB);
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

/* ─── Keyword scorer for scraped pages ─────────────────────────────── */

const STOP_WORDS = new Set([
  "what","is","the","a","an","how","do","does","can","i","my","your","me",
  "are","was","were","be","been","being","have","has","had","will","would",
  "could","should","may","might","shall","that","this","these","those",
  "and","or","but","for","in","on","at","to","of","with","by","from","about",
]);

function scoreChunk(chunk: string, keywords: string[]): number {
  const text = chunk.toLowerCase();
  return keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
}

function extractBestSentence(content: string, keywords: string[]): string {
  const sentences = content.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
  let best = "", bestScore = -1;
  for (const s of sentences) {
    const score = scoreChunk(s, keywords);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return best || content.slice(0, 400);
}

/* ─── Main ──────────────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question, chatbot_key } = await req.json();

    if (!chatbot_key || !question) {
      return new Response(
        JSON.stringify({ answer: null, error: "Missing data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SUPABASE_SERVICE_ROLE_KEY is auto-injected. Auth options are required in Deno
    // (no localStorage) — without them Supabase-js v2 silently fails queries.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    console.log("[faq] key present:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), "question:", question, "chatbot_key:", chatbot_key?.slice(0, 8));

    /* ── Step 1: Find business ─────────────────────────────── */
    const { data: business } = await supabase
      .from("businesses")
      .select("id, user_id")
      .eq("chatbot_key", chatbot_key)
      .single();

    console.log("[faq] business:", business?.id || "NOT FOUND");
    if (!business) {
      return new Response(JSON.stringify({ answer: null, error: "business_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ── Step 1.5: Verify and Decrement Chatbot Credits ────── */
    const { data: creditOk, error: creditErr } = await supabase.rpc('decrement_credits', {
      feature_name: 'chatbot',
      amount: 1,
      p_user_id: business.user_id
    });

    if (creditErr || !creditOk) {
      if (creditErr && (creditErr.code === 'PGRST202' || creditErr.message?.includes('Could not find'))) {
         console.warn("[faq] Credit system not yet initialized. Bypassing.");
      } else {
         console.log("[faq] Credit limit reached for business:", business.id);
         return new Response(JSON.stringify({ 
           answer: "I'm sorry, this business has exhausted its AI Chatbot limit for this billing period.", 
           error: "credit_limit_reached" 
         }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      }
    }

    /* ── Step 2: Load FAQs ─────────────────────────────────── */
    const { data: faqs } = await supabase
      .from("business_faq")
      .select("question, answer, keywords")
      .eq("business_id", business.id);

    /* ── Step 3: Cosine similarity on FAQs ─────────────────── */
    const userWords = cleanText(question);
    const userVec = textToVector(userWords);

    let bestMatch: any = null;
    let bestScore = -1;

    for (const faq of (faqs || []).filter((f: any) => f.question)) {
      const faqWords = cleanText(faq.question || "");
      const faqVec = textToVector(faqWords);
      const score = cosineSimilarity(userVec, faqVec);
      if (score > bestScore) { bestScore = score; bestMatch = faq; }
    }

    console.log("[faq] faqs loaded:", faqs?.length || 0, "bestScore:", bestScore);
    const FAQ_THRESHOLD = 0.15;
    const faqMatched = bestScore >= FAQ_THRESHOLD;

    /* ── Log to faq_logs (non-fatal) ───────────────────────── */
    try {
      await supabase.from("faq_logs").insert({
        business_id: business.id,
        question,
        faq_question: bestMatch?.question || null,
        answer: faqMatched ? bestMatch?.answer : null,
        similarity_score: bestScore,
        matched: faqMatched,
      });
    } catch (logErr: any) {
      console.error("[faq] faq_logs insert failed (non-fatal):", logErr.message);
    }

    if (faqMatched) {
      /* ── Log to faq_analytics (non-fatal) ─────────────────── */
      try {
        await supabase.from("faq_analytics").insert({
          chatbot_key,
          question,
          matched_question: bestMatch.question,
          score: bestScore,
          created_at: new Date().toISOString(),
        });
      } catch (aErr: any) {
        console.error("[faq] faq_analytics insert failed (non-fatal):", aErr.message);
      }

      return new Response(
        JSON.stringify({
          answer: bestMatch.answer,
          matched_question: bestMatch.question,
          source: "faq",
          score: bestScore,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* ── Step 4: Scraped-page keyword fallback ─────────────── */
    const keywords = userWords.filter(w => !STOP_WORDS.has(w) && w.length > 2);

    if (keywords.length > 0) {
      const { data: pages } = await supabase
        .from("scraped_pages")
        .select("content, url, title")
        .eq("business_id", business.id);

      if (pages && pages.length > 0) {
        let bestPage: any = null;
        let bestPageScore = 0;

        for (const page of pages) {
          const score = scoreChunk(page.content, keywords);
          if (score > bestPageScore) { bestPageScore = score; bestPage = page; }
        }

        if (bestPage && bestPageScore >= 1) {
          const answer = extractBestSentence(bestPage.content, keywords);
          return new Response(
            JSON.stringify({
              answer: answer + (bestPage.url ? `\n\n📄 Source: ${bestPage.url}` : ""),
              source: "scraped",
              score: bestPageScore,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    /* ── No match anywhere ─────────────────────────────────── */
    return new Response(
      JSON.stringify({ answer: null, matched_question: null, score: bestScore }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ answer: null, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
