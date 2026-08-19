import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // IMPORTANT: The agent must expose ONLY basic info — target audience and
    // basic eligibility — exactly like the public topic cards on the site.
    // Full details (financial potential, documents, how-to-apply, pitfalls,
    // accompanying benefits, podcast text) are NEVER returned in chat. They
    // are delivered through the lead form, via the user's chosen channel
    // (email / WhatsApp / SMS / voice), same as all topic forms on the site.
    const { data: rights } = await supabase
      .from("rights_reference")
      .select("topic_name, category, target_audience, eligibility_criteria")
      .order("topic_number");

    const rightsContext = (rights || []).map(r =>
      `נושא: ${r.topic_name} | קטגוריה: ${r.category}\nקהל יעד: ${r.target_audience || ""}\nתנאי זכאות בסיסיים: ${r.eligibility_criteria || ""}`
    ).join("\n---\n");

    const topicIndex = (rights || []).map(r => `• ${r.topic_name} (${r.category})`).join("\n");

    const systemPrompt = `אתה נציג שירות של ארגון "בקלות" - מיזם חברתי למיצוי זכויות בישראל.
דבר בעברית טבעית, חמה ותכליתית. אמוג'י במידה.

== מאגר הזכויות (מידע בסיסי בלבד) ==
${rightsContext}

== רשימת כל הנושאים ==
${topicIndex}

== כללי זהב - חובה ==
1. **אל תמציא מידע**. ענה רק על בסיס המאגר.

2. **מותר לחשוף בצ'אט אך ורק:**
   - שם הנושא
   - קהל היעד (למי זה מיועד)
   - תנאי זכאות בסיסיים

   **אסור בהחלט** לחשוף בצ'אט: פוטנציאל כספי, סכומים, רשימת מסמכים, דרכי הגשה, הטבות נלוות, מוקשים, נוסחי פודקאסט, קישורים. כל המידע המפורט נשלח ללקוח דרך הערוץ שיבחר (מייל / וואטסאפ / SMS / הודעה קולית) בדיוק כמו בטפסי הנושאים באתר.

3. כשמשתמש שואל על נושא:
   - תן רק את שם הנושא, קהל יעד ותנאי זכאות בסיסיים (1-3 שורות לכל אחד, בקצרה).
   - סיים תמיד: "📩 לקבלת המידע המלא והמעודכן (סכומים, מסמכים, דרכי הגשה) — השאר/י פרטים ונשלח לך לפי הערוץ שתבחר/י:
[LEAD_FORM:שם הנושא]"

4. כשהמשתמש מתאר מצב כללי, הצע עד 3 נושאים רלוונטיים בפורמט רשימה ממוספרת — רק שמות. שאל איזה לפרט.

5. אם הנושא לא נמצא במאגר:
   "לא מצאתי במאגר את *[הנושא]*. הצוות שלנו ישמח לעזור 💚
   📞 02-3131500 | 📧 L023131500@gmail.com
   או השאר/י פרטים כאן:
   [LEAD_FORM:הנושא שביקשת]"

6. **לעולם אל תפרט מידע מעבר לשני השדות המותרים.** גם אם המשתמש מבקש במפורש — הפנה אותו להשארת פרטים דרך תגית LEAD_FORM.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "יותר מדי בקשות, נסו שוב בעוד רגע." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש חידוש קרדיטים." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאה בשירות AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("rights-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
