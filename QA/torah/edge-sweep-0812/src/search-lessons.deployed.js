// חולץ מחבילת ה-ESZIP הפרוסה של search-lessons (פרויקט bieebmnmkffwbqlsfozh, 12/08).
// זהו index.ts המתומלל; ספריות הצד השלישי שצורפו לחבילה נחתכו. ראיה, לא מקור בונה.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { messages } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing env vars");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: lessons } = await supabase.from("lessons").select("id, city, neighborhood, synagogue_name, subject, lesson_style, rabbi_name, rabbi_role, language, target_audience, is_recurring, schedule_days, specific_date, is_recorded, is_live_stream, contact_phone, contact_email, schedule_notes").eq("is_approved", true).order("created_at", {
      ascending: false
    });
    const { data: synagogues } = await supabase.from("synagogue_portals").select("id, synagogue_name, city, neighborhood, contact_phone, contact_email, public_token").order("created_at", {
      ascending: false
    });
    const { data: orgs } = await supabase.from("org_portals").select("id, org_name, contact_phone, contact_email, public_token").order("created_at", {
      ascending: false
    });
    const lessonsJson = JSON.stringify(lessons || [], null, 1);
    const synagoguesJson = JSON.stringify(synagogues || [], null, 1);
    const orgsJson = JSON.stringify(orgs || [], null, 1);
    const systemPrompt = `אתה סוכן של "איגוד השיעורים" - פלטפורמה ארצית לחיפוש שיעורי תורה.\n\nשיעורים:\n${lessonsJson}\n\nבתי כנסת:\n${synagoguesJson}\n\nארגונים:\n${orgsJson}\n\nכללים:\n1. ענה בעברית בלשון תורנית מכבדת.\n2. הצג 1-3 תוצאות רלוונטיות בלבד מתוך המאגר.\n3. לכל תוצאה: שם הרב, נושא, מיקום, זמנים.\n4. תשובות קצרות וממוקדות.\n5. אם המשתמש רוצה להוסיף שיעור או להצטרף כמגיד, אסוף פרטים (שם, טלפון, עיר, נושא) והוסף בסוף:\n   - להוספת שיעור: [ACTION:submit_lesson]{\"rabbi_name\":\"...\",\"subject\":\"...\",\"city\":\"...\",\"phone\":\"...\"}\n   - לבקשת מגיד שיעור: [ACTION:submit_seeker]{\"contact_name\":\"...\",\"phone\":\"...\",\"city\":\"...\",\"subject\":\"...\"}\n   - להצטרפות כמגיד: [ACTION:submit_teacher]{\"full_name\":\"...\",\"phone\":\"...\",\"city\":\"...\",\"subjects\":\"...\"}\n6. אחרי ACTION, כתוב: "הפרטים נשמרו בהצלחה!"`;
    const aiMessages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...messages.map((m)=>({
          role: m.role === "bot" ? "assistant" : "user",
          content: m.content
        }))
    ];
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: aiMessages,
        stream: true
      })
    });
    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({
          error: "יותר מדי בקשות"
        }), {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      const text = await response.text();
      console.error("OpenAI error:", response.status, text);
      return new Response(JSON.stringify({
        error: "שגיאה בשירות"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream"
      }
    });
  } catch (e) {
    console.error("search-lessons error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});