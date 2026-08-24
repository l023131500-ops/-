import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Requests per hour, per caller IP. Enough for a real search conversation,
// far below what draining the AI credit would take.
const RATE_LIMIT_PER_HOUR = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing env vars");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Rate limit per caller IP — this function spends LOVABLE_API_KEY credits and runs
    // with verify_jwt=false, so without a cap anyone who knows the URL can drain it.
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const windowStart = new Date(
      Math.floor(Date.now() / 3_600_000) * 3_600_000
    ).toISOString();
    const { data: gate, error: gateError } = await supabase.rpc("ai_rate_limit_hit", {
      p_bucket: `search-lessons:${ip}`,
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

    // Fetch all approved lessons
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, city, neighborhood, synagogue_name, subject, lesson_style, rabbi_name, rabbi_role, language, target_audience, audience_type, is_recurring, schedule_days, specific_date, is_recorded, is_live_stream, recording_location, contact_phone, contact_email, contact_name, donation_link, logo_url, schedule_notes, street, street_number")
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    // Fetch synagogue portals
    const { data: synagogues } = await supabase
      .from("synagogue_portals")
      .select("id, synagogue_name, city, neighborhood, street, street_number, contact_phone, contact_email, public_token, about_text")
      .order("created_at", { ascending: false });

    // Fetch org portals
    const { data: orgs } = await supabase
      .from("org_portals")
      .select("id, org_name, contact_phone, contact_email, public_token, about_text")
      .order("created_at", { ascending: false });

    const lessonsJson = JSON.stringify(lessons || [], null, 1);
    const synagoguesJson = JSON.stringify(synagogues || [], null, 1);
    const orgsJson = JSON.stringify(orgs || [], null, 1);

const systemPrompt = `אתה סוכן חכם של "איגוד השיעורים" — פלטפורמה ארצית לחיפוש שיעורי תורה, בתי כנסת וארגונים.
המשתמש מחפש שיעור תורני, בית כנסת או ארגון, או רוצה להוסיף שיעור / להצטרף כמגיד שיעור / לבקש מגיד שיעור.

הנה רשימת כל שיעורי התורה הזמינים במאגר:
${lessonsJson}

הנה רשימת בתי הכנסת:
${synagoguesJson}

הנה רשימת הארגונים:
${orgsJson}

כללים:
1. ענה בעברית, בנוסח מכבד ותורני. השתמש ב"שיעורי תורה" ולא "שיעורים".
2. כשהמשתמש מבקש שיעור תורה - חפש מתוך הרשימה והצג 1-3 תוצאות רלוונטיות בלבד.
3. הצג כל תוצאה בקצרה: שם הרב, נושא, מיקום (עיר, שכונה), זמנים.
4. אם יש שידור חי או הקלטה - ציין בקצרה.
5. אם לא נמצאו תוצאות - הצע למשתמש לשנות פרמטרים.
6. שאל שאלות ממוקדות אם המשתמש לא מספיק ספציפי.
7. אם המשתמש רוצה פרטי קשר - תן לו.
8. תשובות קצרות וממוקדות מאוד. אל תפרוס רשימות ארוכות.
9. אחרי הצגת תוצאות, שאל "האם מעוניין בשיעור תורה נוסף באותו נושא?" - אל תציג שוב את כל הרשימה.
10. אם המשתמש כותב "עוד" / "כן" / "נוסף" / "שיעור אחר" - הבן שזה המשך של אותו חיפוש והצג תוצאות נוספות שטרם הוצגו.
11. רק אם המשתמש מבקש נושא חדש לגמרי - התחל חיפוש מחדש.
12. כשמחפשים בית כנסת - הצג שם, עיר, שכונה ופרטי קשר.
13. כשמחפשים ארגון - הצג שם הארגון ופרטי קשר.
14. דבר בלשון מכובדת ומתאימה לקהל תורני.

=== פעולות מיוחדות ===
אם המשתמש רוצה להוסיף/לעדכן שיעור, לחפש מגיד שיעור, או להצטרף כמגיד שיעור:
- שאל שאלות ממוקדות לאסוף את כל הפרטים הנדרשים (שם, טלפון, עיר, נושא, סגנון).
- בסיום איסוף הפרטים, הוסף בסוף התגובה שורה מיוחדת (לא מוצגת למשתמש):
  להוספת שיעור: [ACTION:submit_lesson]{"rabbi_name":"...","subject":"...","city":"...","phone":"...","lesson_style":"..."}
  לבקשת מגיד שיעור: [ACTION:submit_seeker]{"contact_name":"...","phone":"...","city":"...","subject":"..."}
  להצטרפות כמגיד שיעור: [ACTION:submit_teacher]{"full_name":"...","phone":"...","city":"...","subjects":"..."}
- אחרי ה-ACTION, הוסף הודעה למשתמש: "הפרטים נשמרו בהצלחה! ניצור קשר בהקדם."`;


    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    // Timeout only guards the connect/headers phase (cleared right after fetch
    // resolves) so a hung upstream can't leave the invocation running forever,
    // without cutting off a legitimately long streamed response body.
    const connectController = new AbortController();
    const connectTimeout = setTimeout(() => connectController.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(
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
          signal: connectController.signal,
        }
      );
    } finally {
      clearTimeout(connectTimeout);
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "יותר מדי בקשות, נסו שוב בעוד רגע." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "שגיאה בשירות" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("search-lessons error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
