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

    // Fetch all rights data from database for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: rights } = await supabase
      .from("rights_reference")
      .select("topic_name, category, plain_description, eligibility_criteria, financial_potential, required_documents, how_to_apply, accompanying_benefit, bureaucratic_pitfalls, target_audience, service_link, podcast_text")
      .order("topic_number");

    const rightsContext = (rights || []).map(r => 
      `נושא: ${r.topic_name} | קטגוריה: ${r.category}\nתיאור: ${r.plain_description || ""}\nתנאי זכאות: ${r.eligibility_criteria || ""}\nפוטנציאל כספי: ${r.financial_potential || ""}\nקהל יעד: ${r.target_audience || ""}\nמסמכים נדרשים: ${r.required_documents || ""}\nדרכי ביצוע: ${r.how_to_apply || ""}\nהטבות נלוות: ${r.accompanying_benefit || ""}\nמוקשים ביורוקרטיים: ${r.bureaucratic_pitfalls || ""}\nקישור: ${r.service_link || ""}\nפודקאסט: ${r.podcast_text || ""}`
    ).join("\n---\n");

    const systemPrompt = `אתה נציג שירות אנושי ומקצועי של ארגון "בקלות" - מיזם חברתי למיצוי זכויות בישראל.
דבר בעברית טבעית, חמה ומקצועית. אל תדבר כמו בוט - דבר כמו נציג אמיתי שרוצה לעזור.
השתמש באמוג'י במידה. היה ממוקד ותכליתי.

הנה כל מאגר הזכויות שלנו:
${rightsContext}

כללים חשובים:
1. ענה רק על בסיס המידע שיש לך במאגר. אם אין לך מידע - אמור זאת בכנות והפנה ליצירת קשר בטלפון 02-3131500.
2. כשהלקוח מתאר מצב - נתח אותו וחפש זכויות רלוונטיות ממש מהמאגר.
3. תן מידע מדויק: תנאי זכאות, מסמכים, דרכי הגשה.
4. אם יש כמה זכויות רלוונטיות - פרט את כולן.
5. הצע תמיד לבדוק עוד זכויות או ליצור קשר לליווי אישי.
6. אל תמציא מידע שלא קיים במאגר.
7. ליצירת קשר: טלפון 02-3131500, מייל L023131500@gmail.com, עמדות נדרים פלוס.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
