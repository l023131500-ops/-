import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { text, caller_phone } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keywords = text.split(/\s+/).filter((w: string) => w.length > 2);

    // Columns below match the live `lessons` table (public.lessons has no
    // `subject` column -- confirmed live, SELECT ... WHERE subject ilike ...
    // throws 42703). The .or() below silently swallowed that error (only
    // `data` was destructured, never `error`), so `data` stayed undefined and
    // this always fell through to "no results found" regardless of what the
    // caller said. topic_free_text/title are the real equivalents. is_active
    // is required too -- lessons_tenant_read only gates on the tenant being
    // active, not the lesson itself, so without this a deactivated lesson
    // was still being read aloud to phone callers.
    let results: any[] = [];
    for (const keyword of keywords.slice(0, 3)) {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("is_approved", true)
        .eq("is_active", true)
        .or(`topic_free_text.ilike.%${keyword}%,title.ilike.%${keyword}%,city.ilike.%${keyword}%,rabbi_name.ilike.%${keyword}%`)
        .limit(5);
      if (data) results.push(...data);
    }

    const unique = [...new Map(results.map(r => [r.id, r])).values()].slice(0, 5);

    const responseText = unique.length > 0
      ? `מצאנו ${unique.length} שיעורים. ` + unique.map((l, i) =>
          `שיעור ${i + 1}: ${l.topic_free_text || l.title || "שיעור תורה"} עם ${l.rabbi_name} ב${l.city}.`
        ).join(" ")
      : "לא מצאנו שיעורים מתאימים לחיפוש שלכם. נסו לחפש בנושא אחר, או השאירו הודעה ונחזור אליכם.";

    await supabase.from("ivr_submissions").insert({
      caller_phone: caller_phone || "",
      request_type: "agent",
      input_text: text,
      response_text: responseText,
      status: "processed",
    });

    return new Response(JSON.stringify({
      success: true,
      text_for_speech: responseText,
      results: unique,
      count: unique.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
