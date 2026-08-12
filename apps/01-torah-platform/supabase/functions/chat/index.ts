// ============================================================================
// Edge Function: chat
// סוכן שיחה של "איגוד השיעורים" — עוזר למגיד שיעור או למחפש למלא את השאלון.
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
// caller with no key at all reaches the handler — and every request it lets
// through spends OPENAI_API_KEY credit. A real conversation is 10-20 messages,
// so this leaves room for two sessions an hour while bounding the spend.
const RATE_LIMIT_PER_HOUR = 40;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, role, formData } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Cap per caller IP, before the AI call, so a blocked request costs nothing.
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
      const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
      const { data: gate, error: gateError } = await supabase.rpc("ai_rate_limit_hit", {
        p_bucket: `chat:${ip}`,
        p_window_start: windowStart,
        p_limit: RATE_LIMIT_PER_HOUR,
      });
      if (gateError) {
        // Fail open: a counter problem must not take the live chat down.
        console.error("rate limit check failed:", gateError.message);
      } else if (gate?.[0]?.allowed === false) {
        console.warn(`rate limited ${ip}: ${gate[0].hits} hits this hour`);
        return new Response(
          JSON.stringify({ error: "יותר מדי בקשות מהכתובת הזו. נסו שוב בעוד שעה." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      console.error("rate limit skipped: SUPABASE_URL/SERVICE_ROLE_KEY missing");
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const formSummary = formData && Object.keys(formData).length > 0
      ? `\n\nהנה המידע שהמשתמש כבר מילא בשאלון:\n${JSON.stringify(formData, null, 2)}`
      : "";
    const systemPrompt = role === "teacher"
      ? `אתה סוכן חכם של "איגוד השיעורים". מדבר עם מגיד שיעור שנרשם. דבר בעברית, בסגנון חם ומכבד. עזור לו למלא את השאלון על קהל יעד, נושאים, ביקוש וסגנון.${formSummary}`
      : `אתה סוכן חכם של "איגוד השיעורים". מדבר עם אדם שמחפש מגיד שיעור. דבר בעברית, בסגנון חם, מכבד ומקצועי. שאל שאלות ממוקדות להבן את הצורך. תשובות קצרות וממוקדות.${formSummary}`;

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
        return new Response(JSON.stringify({ error: "יותר מדי בקשות, נסו שוב בעוד רגע." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("OpenAI error:", response.status, text);
      return new Response(JSON.stringify({ error: "שגיאה בשירות ה-AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
