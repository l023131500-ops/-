// ============================================================================
// Edge Function: search-lessons
// סוכן חיפוש שיעורים — מזין את מאגר השיעורים ל-system prompt ועונה בעברית.
//
// המקור שוחזר מהחבילה הפרוסה (v1) ב-12/08 יחד עם תיקון #195. עד אז לא היה לו
// מקור בריפו כלל.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Requests per hour, per caller IP. The function is verify_jwt=false, so a
// caller with no key at all reaches the handler; every request it lets through
// both dumps three tables on the service-role key and spends OPENAI_API_KEY
// credit. A real conversation is 10-20 messages.
const RATE_LIMIT_PER_HOUR = 40;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing env vars");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Cap per caller IP, before the table dumps and before the AI call, so a
    // blocked request costs neither database work nor credit.
    // cf-connecting-ip is set by Cloudflare's edge from the real TCP connection
    // and can't be spoofed by the caller. The first entry of x-forwarded-for
    // CAN be spoofed -- Supabase appends the real IP after whatever the caller
    // sent rather than replacing it -- so a caller could mint a fresh fake IP
    // per request and get a fresh rate-limit bucket every time, defeating this
    // cap entirely and re-opening the table-dump + OPENAI_API_KEY spend it guards.
    const ip = (req.headers.get("cf-connecting-ip") ?? "").trim() ||
      (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop() ||
      "unknown";
    const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
    const { data: gate, error: gateError } = await supabase.rpc("ai_rate_limit_hit", {
      p_bucket: `search-lessons:${ip}`,
      p_window_start: windowStart,
      p_limit: RATE_LIMIT_PER_HOUR,
    });
    if (gateError) {
      // Fail open: a counter problem must not take the live search down.
      console.error("rate limit check failed:", gateError.message);
    } else if (gate?.[0]?.allowed === false) {
      console.warn(`rate limited ${ip}: ${gate[0].hits} hits this hour`);
      return new Response(
        JSON.stringify({ error: "יותר מדי בקשות מהכתובת הזו. נסו שוב בעוד שעה." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("Missing env vars");
    }

    const { data: lessons } = await supabase
      .from("lessons")
      .select(
        "id, city, neighborhood, synagogue_name, subject, lesson_style, rabbi_name, rabbi_role, language, target_audience, is_recurring, schedule_days, specific_date, is_recorded, is_live_stream, contact_phone, contact_email, schedule_notes",
      )
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    // public_token is the capability that opens a portal — it must never enter
    // the prompt, because a steered answer can read the prompt back out.
    const { data: synagogues } = await supabase
      .from("synagogue_portals")
      .select("id, synagogue_name, city, neighborhood, contact_phone, contact_email")
      .order("created_at", { ascending: false });
    const { data: orgs } = await supabase
      .from("org_portals")
      .select("id, org_name, contact_phone, contact_email")
      .order("created_at", { ascending: false });

    const lessonsJson = JSON.stringify(lessons || [], null, 1);
    const synagoguesJson = JSON.stringify(synagogues || [], null, 1);
    const orgsJson = JSON.stringify(orgs || [], null, 1);

    const systemPrompt =
      `אתה סוכן של "איגוד השיעורים" - פלטפורמה ארצית לחיפוש שיעורי תורה.\n\nשיעורים:\n${lessonsJson}\n\nבתי כנסת:\n${synagoguesJson}\n\nארגונים:\n${orgsJson}\n\nכללים:\n1. ענה בעברית בלשון תורנית מכבדת.\n2. הצג 1-3 תוצאות רלוונטיות בלבד מתוך המאגר.\n3. לכל תוצאה: שם הרב, נושא, מיקום, זמנים.\n4. תשובות קצרות וממוקדות.\n5. אם המשתמש רוצה להוסיף שיעור או להצטרף כמגיד, אסוף פרטים (שם, טלפון, עיר, נושא) והוסף בסוף:\n   - להוספת שיעור: [ACTION:submit_lesson]{"rabbi_name":"...","subject":"...","city":"...","phone":"..."}\n   - לבקשת מגיד שיעור: [ACTION:submit_seeker]{"contact_name":"...","phone":"...","city":"...","subject":"..."}\n   - להצטרפות כמגיד: [ACTION:submit_teacher]{"full_name":"...","phone":"...","city":"...","subjects":"..."}\n6. אחרי ACTION, כתוב: "הפרטים נשמרו בהצלחה!"`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: aiMessages, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "יותר מדי בקשות" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("OpenAI error:", response.status, text);
      return new Response(JSON.stringify({ error: "שגיאה בשירות" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("search-lessons error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
