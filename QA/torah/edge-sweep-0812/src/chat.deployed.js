// חולץ מחבילת ה-ESZIP הפרוסה של chat (פרויקט bieebmnmkffwbqlsfozh, 12/08).
// זהו index.ts המתומלל; ספריות הצד השלישי שצורפו לחבילה נחתכו. ראיה, לא מקור בונה.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { messages, role, formData } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    const formSummary = formData && Object.keys(formData).length > 0 ? `\n\nהנה המידע שהמשתמש כבר מילא בשאלון:\n${JSON.stringify(formData, null, 2)}` : "";
    const systemPrompt = role === "teacher" ? `אתה סוכן חכם של "איגוד השיעורים". מדבר עם מגיד שיעור שנרשם. דבר בעברית, בסגנון חם ומכבד. עזור לו למלא את השאלון על קהל יעד, נושאים, ביקוש וסגנון.${formSummary}` : `אתה סוכן חכם של "איגוד השיעורים". מדבר עם אדם שמחפש מגיד שיעור. דבר בעברית, בסגנון חם, מכבד ומקצועי. שאל שאלות ממוקדות להבן את הצורך. תשובות קצרות וממוקדות.${formSummary}`;
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
          error: "יותר מדי בקשות, נסו שוב בעוד רגע."
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
        error: "שגיאה בשירות ה-AI"
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
    console.error("chat error:", e);
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