import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ─── HTML → plain text ─────────────────────────────────────────────── */
function htmlToText(html: string): string {
  return html
    // Remove scripts, styles, nav, footer, header entirely
    .replace(/<(script|style|nav|footer|header|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    // Remove all remaining tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/* ─── Chunk text into ~1500 char blocks on sentence boundaries ────────── */
function chunkText(text: string, maxLen = 1500): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

/* ─── Extract page title ────────────────────────────────────────────── */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : "Untitled Page";
}

/* ─── Collect <a href> links from same origin ────────────────────────── */
function extractLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const links: string[] = [];

  const regex = /href=["']([^"'#?]+)["']/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    try {
      const full = new URL(m[1], base).href;
      if (full.startsWith(base.origin) && !seen.has(full)) {
        seen.add(full);
        links.push(full);
      }
    } catch {
      /* ignore malformed */
    }
  }
  return links;
}

/* ─── Main ──────────────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url, business_id, crawl_depth = 1 } = await req.json();

    if (!url || !business_id) {
      return new Response(
        JSON.stringify({ error: "url and business_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Fetch user_id for credit deduction ─────────────────────────────
    const { data: business } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", business_id)
      .single();

    if (!business) {
        return new Response(JSON.stringify({ error: "business_not_found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // ── Verify and Decrement FAQ Gen Credits (Scraper Check) ────────
    const { data: creditOk, error: creditErr } = await supabase.rpc('decrement_credits', {
      feature_name: 'faq_gen',
      amount: 1, // 1 scrape run = 1 FAQ Gen credit
      p_user_id: business.user_id
    });

    if (creditErr || !creditOk) {
      if (creditErr && (creditErr.code === 'PGRST202' || creditErr.message?.includes('Could not find'))) {
         console.warn("[scrape-site] Credit system not initialized. Bypassing.");
      } else {
         return new Response(JSON.stringify({ 
           error: "You have reached your FAQ Generation / Smart Scraper limit for this billing period." 
         }), {
           status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      }
    }

    // ── Clear old scraped data for this business ─────────────────────
    await supabase.from("scraped_pages").delete().eq("business_id", business_id);

    // ── BFS crawl up to crawl_depth levels ──────────────────────────
    const visited = new Set<string>();
    let frontier: string[] = [url];
    let inserted = 0;

    for (let depth = 0; depth <= crawl_depth; depth++) {
      const nextFrontier: string[] = [];

      for (const pageUrl of frontier) {
        if (visited.has(pageUrl) || visited.size >= 30) break; // hard cap 30 pages
        visited.add(pageUrl);

        try {
          const res = await fetch(pageUrl, {
            headers: { "User-Agent": "HavyBot/1.0 (site indexer)" },
            signal: AbortSignal.timeout(8000),
          });

          if (!res.ok) continue;
          const contentType = res.headers.get("content-type") || "";
          if (!contentType.includes("text/html")) continue;

          const html = await res.text();
          const title = extractTitle(html);
          const bodyText = htmlToText(html);
          const chunks = chunkText(bodyText);

          // Insert each chunk as its own row
          const rows = chunks.map((chunk, i) => ({
            business_id,
            url: pageUrl,
            title: i === 0 ? title : `${title} (part ${i + 1})`,
            content: chunk,
            scraped_at: new Date().toISOString(),
          }));

          if (rows.length > 0) {
            await supabase.from("scraped_pages").insert(rows);
            inserted += rows.length;
          }

          // Collect links for next depth level
          if (depth < crawl_depth) {
            const links = extractLinks(html, pageUrl);
            nextFrontier.push(...links);
          }
        } catch (err) {
          console.warn(`Failed to fetch ${pageUrl}:`, err);
        }
      }

      frontier = [...new Set(nextFrontier)].filter((u) => !visited.has(u));
      if (frontier.length === 0) break;
    }

    return new Response(
      JSON.stringify({
        success: true,
        pages_crawled: visited.size,
        chunks_stored: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
