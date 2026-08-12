import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Requests per hour, per caller IP. Enough for a real advisory conversation,
// far below what draining the AI credit would take.
const RATE_LIMIT_PER_HOUR = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, role, formData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Rate limit per caller IP — this function spends LOVABLE_API_KEY credits and runs
    // with verify_jwt=false, so without a cap anyone who knows the URL can drain it.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const ip =
        (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
      const windowStart = new Date(
        Math.floor(Date.now() / 3_600_000) * 3_600_000
      ).toISOString();
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
          JSON.stringify({
            error: "יותר מדי בקשות מהכתובת הזו. נסו שוב בעוד שעה.",
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": "3600",
            },
          }
        );
      }
    } else {
      console.error("rate limit skipped: SUPABASE_URL/SERVICE_ROLE_KEY missing");
    }

    // Build context-aware system prompt
    const formSummary = formData && Object.keys(formData).length > 0
      ? `\n\nהנה המידע שהמשתמש כבר מילא בשאלון:\n${JSON.stringify(formData, null, 2)}`
      : "";

    const systemPrompt = role === "teacher"
      ? `אתה סוכן חכם ואישי של "איגוד השיעורים" — פלטפורמה שמחברת בין מגידי שיעור לבין לומדים.
אתה מדבר עם רב או מגיד שיעור שנרשם למערכת. התפקיד שלך:
1. לעזור לו להבין איזה קהל יעד מתאים לשיעורים שלו
2. לייעץ על נושאים שיש בהם ביקוש גבוה
3. לעזור לו למלא את השאלון באופן מדויק
4. לשאול שאלות ממוקדות כדי להבין את הסגנון, הנושאים והיכולות שלו
5. להציע לו טיפים להגדלת החשיפה והגעה לקהל רחב יותר

דבר בעברית, בסגנון חם, מכבד ומקצועי. השתמש באימוג'ים במידה. שמור על תשובות ממוקדות וקצרות.
הנושאים הפופולריים כוללים: גמרא (דף יומי, עיון, בקיאות), הלכה (משנה ברורה, הלכות פסוקות), פרשת שבוע, דרשות, מוסר, חסידות, קבלה, מחשבה והשקפה, יסודות האמונה, חינוך ילדים, שלום בית.
סגנונות קהל: חילונים, מסורתיים, דתיים לאומיים, חרד"לים, חוזרים בתשובה, בעלי בתים, אברכים, נוער, ילדים.${formSummary}`
      : `אתה סוכן חכם ואישי של "איגוד השיעורים" — פלטפורמה שמחברת בין מגידי שיעור לבין לומדים.
אתה מדבר עם אדם שמחפש מגיד שיעור (עבור עצמו, בית כנסת, קבוצה, או בית אבלים). התפקיד שלך:
1. להבין מה בדיוק הוא מחפש — נושא, סגנון, רמה
2. לשאול שאלות ממוקדות כדי לכוון אותו לסוג מגיד השיעור המתאים
3. לעזור לו למלא את השאלון באופן מדויק
4. להסביר את ההבדלים בין סגנונות שיעור שונים
5. להמליץ על סוגי שיעורים שמתאימים לצרכים שלו

אם הפונה הוא עבור בית אבלים — היה רגיש ואמפתי.
אם הפונה הוא עבור בית כנסת — שאל על נוסח, גודל קהילה, סגנון.

דבר בעברית, בסגנון חם, מכבד ומקצועי. השתמש באימוג'ים במידה. שמור על תשובות ממוקדות וקצרות.${formSummary}`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "יותר מדי בקשות, נסו שוב בעוד רגע." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "נגמרו הקרדיטים, אנא הוסיפו קרדיטים." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "שגיאה בשירות ה-AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
